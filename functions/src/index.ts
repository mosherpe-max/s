import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from 'stripe';
import twilio from 'twilio';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();

/**
 * createPaymentIntent
 * Securely generates a Stripe Client Secret for the patron checkout.
 * Refactored to support Customer Sessions for card reuse and integrated contact collection.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  const { amount, sellerId, patronName, patronPhone, patronEmail, saveInfo } = request.data;
  const buyerUid = request.auth?.uid;

  // 1. Validation
  if (!amount || amount <= 0) {
    logger.error("[createPaymentIntent] Invalid amount received:", { amount });
    throw new HttpsError('invalid-argument', 'A valid positive amount is required for checkout.');
  }
  if (!sellerId) {
    logger.error("[createPaymentIntent] Missing sellerId in request.");
    throw new HttpsError('invalid-argument', 'Establishment identity is required for routing.');
  }

  // 2. Stripe Initialization
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    logger.error("[createPaymentIntent] STRIPE_SECRET_KEY is missing from environment/secrets.");
    throw new HttpsError('failed-precondition', 'The payment gateway is not configured. Please contact support.');
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-01-27.acacia' as any,
  });

  try {
    let stripeCustomerId: string | undefined;

    // 3. Customer Session Logic (Native Card Reuse)
    if (buyerUid) {
      const userRef = db.collection('users').doc(buyerUid);
      const userDoc = await userRef.get();
      
      // Use email as key to find existing stripe customer or create new
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      } else {
        // Look up by email to avoid duplicates
        const existingCustomers = await stripe.customers.list({ email: patronEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          // Create new customer in Stripe
          const customer = await stripe.customers.create({
            email: patronEmail,
            name: patronName,
            phone: patronPhone,
            metadata: { buyerUid }
          });
          stripeCustomerId = customer.id;
        }
        await userRef.set({ stripeCustomerId }, { merge: true });
      }
    }

    logger.info(`[createPaymentIntent] Creating intent for $${amount} (Venue: ${sellerId}, Customer: ${stripeCustomerId || 'Anonymous'})`);
    
    // 4. Create Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      customer: stripeCustomerId,
      // Flag for reuse if user opted in or if we already have a customer profile
      setup_future_usage: saveInfo || stripeCustomerId ? 'off_session' : undefined,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sellerId,
        buyerUid: buyerUid || 'anonymous',
        customerName: patronName || 'Guest',
        customerPhone: patronPhone || '',
        customerEmail: patronEmail || ''
      }
    });

    // 5. Create Customer Session for returning users to natively show saved cards
    let customerSessionClientSecret: string | undefined;
    if (stripeCustomerId) {
      const customerSession = await stripe.customerSessions.create({
        customer: stripeCustomerId,
        components: {
          payment_element: {
            enabled: true,
            features: {
              payment_method_save: 'always',
              payment_method_redisplay: 'always'
            }
          }
        }
      });
      customerSessionClientSecret = customerSession.client_secret;
    }

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe failed to generate a client secret.");
    }

    return {
      clientSecret: paymentIntent.client_secret,
      customerSessionClientSecret
    };
  } catch (err: any) {
    logger.error(`[createPaymentIntent] Stripe API Error:`, {
      message: err.message,
      code: err.code,
      type: err.type
    });
    throw new HttpsError('internal', err.message || 'Unable to initialize secure payment environment.');
  }
});

/**
 * dailyOperationalReset
 * Scheduled script that runs HOURLY to check if it's the admin-defined reset hour.
 * Shuts down all active service channels at all venues.
 */
export const dailyOperationalReset = onSchedule({
  schedule: "0 * * * *", // Every hour on the hour
  timeZone: "America/New_York",
  region: 'us-central1'
}, async (event) => {
  // 1. Fetch Solution Config to find the reset hour
  const configRef = db.collection('solution').doc('config');
  const configSnap = await configRef.get();
  
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  
  // 2. Determine Current Hour in Solution Timezone (EST/EDT)
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const currentHour = nowInEst.getHours();

  if (currentHour !== resetHour) {
    logger.info(`[dailyOperationalReset] Current hour (${currentHour}) is not the target reset hour (${resetHour}). Skipping.`);
    return;
  }

  logger.info(`[dailyOperationalReset] Targeted reset hour (${resetHour}) reached. Starting operational shutdown sequence...`);
  
  const sellersRef = db.collection('sellers');
  const snapshot = await sellersRef.where('status', '==', 'Active').get();
  
  if (snapshot.empty) {
    logger.info("[dailyOperationalReset] No active venues to reset.");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      bevcartActive: false,
      clubhouseActive: false,
      lanedeliveryActive: false,
      takeoutActive: false,
      lastActive: FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  logger.info(`[dailyOperationalReset] Successfully reset operational status for ${snapshot.size} venues.`);
});

/**
 * onGuestOrderStatusUpdate
 * Triggers on any creation or update to an order document.
 * Manages patron SMS notifications via Twilio.
 */
export const onGuestOrderStatusUpdate = onDocumentWritten({
  document: "orders/{orderId}",
  secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
  region: 'us-central1',
}, async (event) => {
  const orderId = event.params.orderId;
  const before = event.data?.before;
  const after = event.data?.after;

  if (!after || !after.exists) return;

  // 1. Check Global SMS Gate
  const configRef = db.collection('solution').doc('config');
  const configSnap = await configRef.get();
  const smsEnabled = configSnap.exists ? (configSnap.data()?.smsNotificationsEnabled ?? true) : true;

  if (!smsEnabled) {
    logger.info(`[onGuestOrderStatusUpdate] Global SMS updates are disabled. Skipping notification for order ${orderId}.`);
    return;
  }

  const afterData = after.data();
  const customerPhone = afterData?.customerPhone;
  const status = afterData?.status;

  if (!customerPhone) {
    logger.info(`[onGuestOrderStatusUpdate] No phone number for order ${orderId}. Skipping SMS.`);
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.error("[onGuestOrderStatusUpdate] Twilio credentials missing from Secret Manager.");
    return;
  }

  const client = twilio(accountSid, authToken);
  let messageBody = "";
  
  const trackingLink = `https://koop.app/orders/${orderId}`;

  if (!before || !before.exists) {
    // RULE 1: INITIAL CREATION (Order Received)
    if (status === 'received' || status === 'Placed') {
      messageBody = `Thanks for your order! We've received it and it's in our queue. Track live: ${trackingLink}`;
    }
  } else {
    // STATUS UPDATES
    const beforeData = before.data();
    const oldStatus = beforeData?.status;

    if (status !== oldStatus) {
      if (status === 'Out for Delivery') {
        // RULE 2: DISPATCH (Out for Delivery)
        messageBody = `Your order is out for delivery! A runner is on the way. Track live: ${trackingLink}`;
      }
    }
  }

  if (messageBody) {
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const to = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
      
      await client.messages.create({
        body: messageBody,
        from: fromNumber,
        to: to
      });
      logger.info(`[onGuestOrderStatusUpdate] SMS sent to ${to} for order ${orderId}`);
    } catch (error: any) {
      logger.error(`[onGuestOrderStatusUpdate] Twilio dispatch failed for ${orderId}: ${error.message}`);
    }
  }
});

/**
 * handleStripeWebhook
 * Secure HTTP endpoint for Stripe event ingestion.
 */
export const handleStripeWebhook = onRequest({
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  region: 'us-central1',
}, async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!signature || !webhookSecret || !apiKey) {
    logger.error("[handleStripeWebhook] Missing signature or secret configuration.");
    res.status(400).send("Webhook Error: Missing configuration");
    return;
  }

  const stripe = new Stripe(apiKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err: any) {
    logger.error(`[handleStripeWebhook] Signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata || {};

    try {
      const orderData = {
        customerName: metadata.customerName || 'Guest Patron',
        customerPhone: metadata.customerPhone || null,
        customerEmail: metadata.customerEmail || null,
        status: "received",
        sellerId: metadata.sellerId || null,
        buyerProfileId: metadata.buyerUid || null,
        stripePaymentIntentId: paymentIntent.id,
        total: (paymentIntent.amount || 0) / 100,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await db.collection('orders').add(orderData);
    } catch (err: any) {
      logger.error(`[handleStripeWebhook] Firestore ingestion failed: ${err.message}`);
      res.status(500).send("Internal Server Error during Firestore write");
      return;
    }
  }

  res.status(200).send({ received: true });
});
