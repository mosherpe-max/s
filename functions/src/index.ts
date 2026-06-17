import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
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
 * handleStripeWebhook
 * Secure HTTP endpoint for Stripe event ingestion.
 * Verifies signatures and creates order documents in Firestore.
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerPhone = session.customer_details?.phone;
    const metadata = session.metadata || {};

    logger.info(`[handleStripeWebhook] Processing completed session: ${session.id}`);

    try {
      const orderData = {
        customerPhone: customerPhone || null,
        status: "received",
        deviceOS: metadata.deviceOS || "iOS",
        sellerId: metadata.sellerId || null,
        buyerProfileId: metadata.buyerUid || null,
        stripeSessionId: session.id,
        subtotal: (session.amount_subtotal || 0) / 100,
        total: (session.amount_total || 0) / 100,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const orderRef = await db.collection('orders').add(orderData);
      logger.info(`[handleStripeWebhook] Successfully created order ${orderRef.id} for phone ${customerPhone}`);
      
    } catch (err: any) {
      logger.error(`[handleStripeWebhook] Firestore ingestion failed: ${err.message}`);
      res.status(500).send("Internal Server Error during Firestore write");
      return;
    }
  }

  res.status(200).send({ received: true });
});

/**
 * onOrderStatusUpdate
 * Triggers on any creation or update to an order.
 * Manages patron SMS notifications via Twilio.
 */
export const onOrderStatusUpdate = onDocumentWritten({
  document: "orders/{orderId}",
  secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
  region: 'us-central1',
}, async (event) => {
  const orderId = event.params.orderId;
  const before = event.data?.before;
  const after = event.data?.after;

  // 1. Handle Deletions (Ignore)
  if (!after || !after.exists) {
    return;
  }

  const afterData = after.data();
  const customerPhone = afterData?.customerPhone;
  const status = afterData?.status;
  const sellerId = afterData?.sellerId; // Extracted as per schema

  // 2. Validation
  if (!customerPhone) {
    logger.warn(`[onOrderStatusUpdate] Missing customerPhone for order: ${orderId}`);
    return;
  }

  // 3. Initialize Twilio from Secrets
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.error("[onOrderStatusUpdate] Twilio credentials missing from Secret Manager.");
    return;
  }

  const client = twilio(accountSid, authToken);
  let messageBody = "";

  // 4. Logic for New Orders (Creation)
  if (!before || !before.exists) {
    if (status === 'received') {
      messageBody = "Thanks for your order at Koop! Your order has been received and is being prepared.";
    }
  } 
  // 5. Logic for Status Updates
  else {
    const beforeData = before.data();
    const oldStatus = beforeData?.status;

    // Check for transition to delivery
    if (status === 'delivery' && oldStatus !== 'delivery') {
      messageBody = "Your Koop order is out for delivery! See you shortly.";
    }
  }

  // 6. Dispatch SMS
  if (messageBody) {
    try {
      const result = await client.messages.create({
        body: messageBody,
        from: fromNumber,
        to: customerPhone
      });
      logger.info(`[onOrderStatusUpdate] SMS sent to ${customerPhone} (Order: ${orderId}, SID: ${result.sid})`);
    } catch (error: any) {
      logger.error(`[onOrderStatusUpdate] Twilio dispatch failed for ${orderId}:`, error);
    }
  }
});

/**
 * createStripeConnectAccount
 * Securely provisions a Stripe Connect Express account and returns an onboarding link.
 */
export const createStripeConnectAccount = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { venueId } = request.data;
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing required field: venueId.");
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new HttpsError("internal", "STRIPE_SECRET_KEY not found in environment.");
  }

  const stripe = new Stripe(apiKey);

  try {
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      throw new HttpsError("not-found", `Venue registry [${venueId}] not found.`, { venueId });
    }

    const venueData = venueDoc.data();
    if (venueData?.ownerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Unauthorized venue management.");
    }

    let stripeAccountId = venueData?.stripeAccountId || venueData?.stripeConnectId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { venueId, ownerUid: request.auth.uid }
      });
      stripeAccountId = account.id;

      await venueRef.update({
        stripeAccountId,
        stripeConnectId: stripeAccountId,
        stripeOnboardingComplete: false,
        updatedAt: new Date().toISOString()
      });
    }

    let origin = 'http://localhost:9002';
    const headerOrigin = request.rawRequest?.headers?.origin;
    if (headerOrigin) {
      origin = typeof headerOrigin === 'string' ? headerOrigin : headerOrigin[0];
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/onboarding-refresh?venueId=${venueId}`,
      return_url: `${origin}/onboarding-success?venueId=${venueId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };

  } catch (error: any) {
    logger.error("createStripeConnectAccount Error:", error);
    throw new HttpsError("internal", error.message || "Stripe initialization failed", { 
      rawMessage: error.message,
      type: error.type 
    });
  }
});

/**
 * createPaymentIntent
 * Initializes a Stripe PaymentIntent restricted to card payments with a Patron-paid fee.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { amount, sellerId } = request.data;
  if (amount === undefined || !sellerId) {
    throw new HttpsError("invalid-argument", "Base amount and sellerId are required.");
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new HttpsError("internal", "STRIPE_SECRET_KEY missing in environment.");
  }

  const stripe = new Stripe(apiKey);

  try {
    const venueRef = db.collection('venues').doc(sellerId);
    const venueDoc = await venueRef.get();
    
    if (!venueDoc.exists) {
      throw new HttpsError("not-found", `Registry document missing for venue: ${sellerId}.`, { sellerId });
    }

    const venueData = venueDoc.data();
    const stripeConnectId = venueData?.stripeConnectId || venueData?.stripeAccountId;
    
    if (!stripeConnectId) {
      throw new HttpsError("failed-precondition", `Stripe Account ID is missing for venue: ${sellerId}.`, { sellerId });
    }

    const patronConvenienceFee = venueData?.patronConvenienceFee ?? 150; 
    const platformFeeFixed = venueData?.platformFeeFixed ?? 20;

    const baseAmountInCents = Math.round(amount * 100);
    const totalChargeAmount = baseAmountInCents + patronConvenienceFee;
    
    const applicationFeeAmount = Math.max(0, patronConvenienceFee - platformFeeFixed);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeAmount,
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: stripeConnectId,
      },
      metadata: {
        sellerId,
        buyerUid: request.auth.uid,
        patronFeeCents: patronConvenienceFee.toString(),
        koopCoverageCents: platformFeeFixed.toString(),
        baseAmountCents: baseAmountInCents.toString()
      }
    });

    return { clientSecret: paymentIntent.client_secret };

  } catch (error: any) {
    logger.error("createPaymentIntent Error:", error);
    throw new HttpsError("aborted", error.message || "Payment intent creation failed", { 
      stripeError: error.message,
      stripeCode: error.code 
    });
  }
});

/**
 * verifyVenueConnection
 * Diagnostic utility to verify Stripe account status.
 */
export const verifyVenueConnection = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  maxInstances: 5,
}, async (request) => {
  const { venueId } = request.data;
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing required parameter: venueId");
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new HttpsError("internal", "STRIPE_SECRET_KEY not found in environment.");
  }

  const stripe = new Stripe(apiKey);

  try {
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      throw new HttpsError("not-found", `Venue record for [${venueId}] not found in Firestore registry.`);
    }

    const venueData = venueDoc.data();
    const stripeAccountId = venueData?.stripeConnectId || venueData?.stripeAccountId;
    
    if (!stripeAccountId) {
      throw new HttpsError("failed-precondition", `The venue [${venueId}] does not have a stripeConnectId assigned yet.`);
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    return {
      id: account.id,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || 'Unnamed Merchant',
      capabilities: account.capabilities,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      status: (account.charges_enabled && account.payouts_enabled) ? 'Ready' : 'Restricted'
    };

  } catch (error: any) {
    logger.error(`[verifyVenueConnection] Failed for ${venueId}:`, error);
    throw new HttpsError("internal", error.message || "Stripe API retrieval failed", {
      details: error.message,
      code: error.code
    });
  }
});

/**
 * Health Check
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true,
}, (request) => {
  return { status: "healthy", timestamp: new Date().toISOString() };
});
