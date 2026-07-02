
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
      
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      } else {
        const existingCustomers = await stripe.customers.list({ email: patronEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id;
        } else if (saveInfo) {
          const customer = await stripe.customers.create({
            email: patronEmail,
            name: patronName,
            phone: patronPhone,
            metadata: { buyerUid }
          });
          stripeCustomerId = customer.id;
        }
        
        if (stripeCustomerId) {
          await userRef.set({ stripeCustomerId }, { merge: true });
        }
      }
    }

    // 4. Create Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: saveInfo ? 'off_session' : undefined,
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

    // 5. Create Customer Session
    let customerSessionClientSecret: string | undefined;
    if (stripeCustomerId) {
      const customerSession = await stripe.customerSessions.create({
        customer: stripeCustomerId,
        components: {
          payment_element: {
            enabled: true,
            features: {
              payment_method_save: 'disabled', 
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
 */
export const dailyOperationalReset = onSchedule({
  schedule: "0 * * * *",
  timeZone: "America/New_York",
  region: 'us-central1'
}, async (event) => {
  const configRef = db.collection('solution').doc('config');
  const configSnap = await configRef.get();
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const currentHour = nowInEst.getHours();

  if (currentHour !== resetHour) return;

  const sellersRef = db.collection('sellers');
  const snapshot = await sellersRef.where('status', '==', 'Active').get();
  
  if (snapshot.empty) return;

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
});

/**
 * applyStarterMenu
 * Clones template modifiers into a venue's collection.
 */
export const applyStarterMenu = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data;
  
  if (!venueId || !venueType) {
    throw new HttpsError('invalid-argument', 'The venueId and venueType are required.');
  }

  const libraryRef = db.collection('starter_modifier_library');
  const snapshot = await libraryRef.where('venueType', 'array-contains', venueType.toLowerCase()).get();

  if (snapshot.empty) return { totalCreated: 0, byCategory: {} };

  const batch = db.batch();
  const summary: Record<string, number> = {};

  snapshot.docs.forEach(docSnap => {
    const template = docSnap.data();
    const groupId = `${venueId}-${docSnap.id}`;
    const groupRef = db.collection('modifier_groups').doc(groupId);
    
    batch.set(groupRef, {
      id: groupId,
      sellerId: venueId,
      name: template.name,
      minSelection: template.required ? 1 : 0,
      maxSelection: template.selectionType === 'single' ? 1 : 99,
      options: template.options.map((opt: any) => ({
        id: opt.label.toLowerCase().replace(/\s+/g, '-'),
        name: opt.label,
        priceAdjustment: opt.priceModifier || 0,
        isAvailable: true
      })),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    const cat = template.category || 'universal';
    summary[cat] = (summary[cat] || 0) + 1;
  });

  await batch.commit();
  return { totalCreated: snapshot.size, byCategory: summary };
});

/**
 * applyStarterItems
 * Clones template menu items into a venue's collection and auto-links them to relevant modifiers.
 */
export const applyStarterItems = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data;
  
  if (!venueId || !venueType) {
    throw new HttpsError('invalid-argument', 'The venueId and venueType are required.');
  }

  // 1. Fetch Items for this Venue Type
  const itemLibRef = db.collection('starter_menu_item_library');
  const itemSnap = await itemLibRef.where('venueType', 'array-contains', venueType.toLowerCase()).get();

  if (itemSnap.empty) return { totalCreated: 0 };

  // 2. Fetch already-cloned Modifiers for this venue to perform auto-linking
  const venueModRef = db.collection('modifier_groups');
  const modSnap = await venueModRef.where('sellerId', '==', venueId).get();
  
  const venueModMap: Record<string, string> = {};
  modSnap.forEach(m => {
    venueModMap[m.data().name.toLowerCase()] = m.id;
  });

  const batch = db.batch();
  const venueItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');

  itemSnap.docs.forEach((docSnap, index) => {
    const template = docSnap.data();
    const itemId = `${venueId}-${docSnap.id}`;
    const itemRef = venueItemsRef.doc(itemId);

    // Auto-link logic: Find matching groups by keywords
    const linkedGroups: string[] = [];
    if (venueModMap['special instructions']) linkedGroups.push(venueModMap['special instructions']);
    if (venueModMap['allergy flag']) linkedGroups.push(venueModMap['allergy flag']);

    if (template.modifierKeywords) {
      template.modifierKeywords.forEach((kw: string) => {
        if (venueModMap[kw.toLowerCase()]) {
          linkedGroups.push(venueModMap[kw.toLowerCase()]);
        }
      });
    }

    batch.set(itemRef, {
      ...template,
      id: itemId,
      rank: index + 1,
      isAvailable: true,
      modifierGroupIds: Array.from(new Set(linkedGroups)),
      availableOn: venueType === 'golf' ? ['Beverage Cart', 'Clubhouse', 'Take Out'] : ['Lane Delivery', 'Take Out'],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  return { totalCreated: itemSnap.size };
});

/**
 * onGuestOrderStatusUpdate
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

  const configRef = db.collection('solution').doc('config');
  const configSnap = await configRef.get();
  const smsEnabled = configSnap.exists ? (configSnap.data()?.smsNotificationsEnabled ?? true) : true;

  if (!smsEnabled) return;

  const afterData = after.data();
  const customerPhone = afterData?.customerPhone;
  const status = afterData?.status;

  if (!customerPhone) return;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  const client = twilio(accountSid, authToken);
  let messageBody = "";
  const trackingLink = `https://koop.app/orders/${orderId}`;

  if (!before || !before.exists) {
    if (status === 'received' || status === 'Placed') {
      messageBody = `Thanks for your order! We've received it and it's in our queue. Track live: ${trackingLink}`;
    }
  } else {
    const beforeData = before.data();
    const oldStatus = beforeData?.status;
    if (status !== oldStatus && status === 'Out for Delivery') {
      messageBody = `Your order is out for delivery! A runner is on the way. Track live: ${trackingLink}`;
    }
  }

  if (messageBody) {
    try {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const to = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
      await client.messages.create({ body: messageBody, from: fromNumber, to: to });
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
    res.status(400).send("Webhook Error: Missing configuration");
    return;
  }

  const stripe = new Stripe(apiKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err: any) {
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
      res.status(500).send("Internal Server Error during Firestore write");
      return;
    }
  }

  res.status(200).send({ received: true });
});
