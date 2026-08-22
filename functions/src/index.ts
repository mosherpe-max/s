
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
 * performOperationalReset
 * High-performance system-wide sweep using bulk queries and parallel batching.
 * 1. Scrubs all active staff sessions.
 * 2. Cancels stale orders.
 * NOTE: Does NOT affect venue channel settings (bevcartActive, etc) to preserve admin config.
 */
async function performOperationalReset() {
  logger.info("[performOperationalReset] STARTING ROBUST SYSTEM SWEEP");

  let totalStaffReset = 0;
  let totalOrdersCancelled = 0;

  try {
    // 1. FETCH BASE TARGETS
    const [sellersSnapshot, ordersSnapshot] = await Promise.all([
      db.collection('sellers').get(),
      db.collection('orders').where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery']).get()
    ]);

    const batches: Promise<any>[] = [];
    let currentBatch = db.batch();
    let writeCount = 0;

    const commitAndReset = () => {
      batches.push(currentBatch.commit());
      currentBatch = db.batch();
      writeCount = 0;
    };

    // 2. CANCEL ACTIVE ORDERS
    ordersSnapshot.forEach(oDoc => {
      currentBatch.update(oDoc.ref, { 
        status: 'Cancelled', 
        notes: 'Operational Reset: Terminal system sweep.',
        updatedAt: FieldValue.serverTimestamp() 
      });
      totalOrdersCancelled++;
      writeCount++;
      if (writeCount >= 450) commitAndReset();
    });

    // 3. RESET STAFF SESSIONS (Venue-by-venue to avoid index dependency)
    for (const sellerDoc of sellersSnapshot.docs) {
      const staffSnapshot = await sellerDoc.ref.collection('staff').where('activeMode', '!=', null).get();
      staffSnapshot.forEach(sDoc => {
        currentBatch.update(sDoc.ref, { 
          activeMode: null, 
          latitude: null, 
          longitude: null, 
          lastActive: FieldValue.serverTimestamp() 
        });
        totalStaffReset++;
        writeCount++;
        if (writeCount >= 450) commitAndReset();
      });
    }

    if (writeCount > 0) {
      batches.push(currentBatch.commit());
    }

    // 4. EXECUTE ALL WRITES
    await Promise.all(batches);

    logger.info(`[performOperationalReset] Finalized. Staff: ${totalStaffReset}, Orders: ${totalOrdersCancelled}`);
    
    return { 
      status: 'success', 
      totalStaffReset, 
      totalOrdersCancelled 
    };
    
  } catch (err: any) {
    logger.error("[performOperationalReset] Critical Failure during sweep:", err);
    throw err;
  }
}

/**
 * createPaymentIntent
 * Securely generates a Stripe Client Secret and Customer Session for zero-friction checkout.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  try {
    const { amount, sellerId, patronName, patronPhone, patronEmail, saveInfo, stripeCustomerId: clientProvidedCustomerId } = request.data || {};
    const buyerUid = request.auth?.uid;

    if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');
    if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');

    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    // 1. VENUE RESOLUTION
    const sellerDoc = await db.collection('sellers').doc(sellerId).get();
    const venueStripeAccountId = sellerDoc.data()?.stripeAccountId;
    if (!venueStripeAccountId) {
      throw new HttpsError('failed-precondition', 'Venue is not configured for digital payments.');
    }

    let stripeCustomerId: string | undefined = clientProvidedCustomerId;

    // 2. IDENTITY SYNC
    if (!stripeCustomerId && buyerUid) {
      const userDoc = await db.collection('users').doc(buyerUid).get();
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      }
    }

    // 3. CUSTOMER CREATION
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email: patronEmail || undefined, 
        name: patronName || 'Guest Patron', 
        description: 'Koop Guest Patron',
        metadata: { buyerUid: buyerUid || 'anonymous' } 
      });
      stripeCustomerId = customer.id;
    }

    // 4. PERSISTENCE
    if (buyerUid && stripeCustomerId) {
      await db.collection('users').doc(buyerUid).set({ 
        stripeCustomerId, 
        email: patronEmail || '',
        displayName: patronName || '',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 5. CUSTOMER SESSION
    const customerSession = await stripe.customerSessions.create({
      customer: stripeCustomerId,
      components: { 
        payment_element: { 
          enabled: true, 
          features: { 
            payment_method_save: 'enabled', 
            payment_method_redisplay: 'enabled' 
          } 
        } 
      }
    });

    // 6. INTENT
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: saveInfo ? 'off_session' : undefined,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: venueStripeAccountId,
      },
      metadata: { 
        sellerId, 
        buyerUid: buyerUid || 'anonymous', 
        customerName: patronName || 'Guest', 
        customerPhone: patronPhone || '', 
        customerEmail: patronEmail || '' 
      }
    });

    return { 
      clientSecret: paymentIntent.client_secret, 
      customerSessionClientSecret: customerSession.client_secret,
      stripeCustomerId 
    };
  } catch (err: any) {
    logger.error("Stripe PI Error", err);
    throw new HttpsError('internal', err.message || 'Internal payment gateway error.');
  }
});

/**
 * dailyOperationalReset
 * Scheduled sweep to clear all staff sessions and active orders system-wide.
 */
export const dailyOperationalReset = onSchedule({ 
  schedule: "0 * * * *", 
  timeZone: "America/New_York", 
  region: 'us-central1' 
}, async () => {
  const configSnap = await db.collection('solution').doc('config').get();
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (nowInEst.getHours() !== resetHour) {
    logger.info(`[dailyOperationalReset] Current hour ${nowInEst.getHours()} is not reset hour ${resetHour}. Skipping.`);
    return;
  }

  await performOperationalReset();
});

/**
 * manualOperationalReset
 * Callable trigger for the reset logic, enabling testing and manual overrides by admins.
 */
export const manualOperationalReset = onCall({ 
  region: 'us-central1' 
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Unauthorized access.');
  }
  
  try {
    return await performOperationalReset();
  } catch (e: any) {
    throw new HttpsError('internal', e.message);
  }
});

/**
 * onGuestOrderStatusUpdate
 * Triggers on order changes to send SMS updates.
 */
export const onGuestOrderStatusUpdate = onDocumentWritten({ 
  document: "orders/{orderId}", 
  secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], 
  region: 'us-central1' 
}, async (event) => {
  const after = event.data?.after;
  if (!after || !after.exists) return;
  
  try {
    const configSnap = await db.collection('solution').doc('config').get();
    if (configSnap.exists && configSnap.data()?.smsNotificationsEnabled === false) return;

    const data = after.data();
    if (!data?.customerPhone) return;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) return;

    const client = twilio(accountSid, authToken);
    let body = "";
    const link = `https://koop.app/orders/${event.params.orderId}`;

    const beforeData = event.data?.before?.exists ? event.data.before.data() : null;

    if (!beforeData) {
      if (data.status === 'Placed') body = `Order received! Track live: ${link}`;
    } else {
      if (data.status !== beforeData.status && data.status === 'Out for Delivery') {
        body = `Order out for delivery! Track live: ${link}`;
      }
      
      if (data.refreshRequestedAt && (!beforeData.refreshRequestedAt || data.refreshRequestedAt.toMillis() !== beforeData.refreshRequestedAt.toMillis())) {
        body = `We are on our way with your order! Please click this link to refresh your delivery location: ${link}`;
      }
    }

    if (body) {
      const to = String(data.customerPhone).length === 10 ? `+1${data.customerPhone}` : `+${data.customerPhone}`;
      await client.messages.create({ body, from: fromNumber, to });
    }
  } catch (err) {
    logger.error("Twilio Task Failed", err);
  }
});

/**
 * handleStripeWebhook
 * Consumes Stripe events to create orders in Firestore.
 */
export const handleStripeWebhook = onRequest({ 
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], 
  region: 'us-central1' 
}, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!sig || !webhookSecret || !stripeKey) {
    res.status(400).send("Webhook configuration missing.");
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });
  try {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata || {};
      await db.collection('orders').add({
        customerName: meta.customerName || 'Guest', 
        customerPhone: meta.customerPhone || '', 
        customerEmail: meta.customerEmail || '',
        status: "Placed", 
        sellerId: meta.sellerId || '', 
        buyerProfileId: meta.buyerUid || 'anonymous',
        stripePaymentIntentId: pi.id, 
        total: (pi.amount || 0) / 100, 
        createdAt: FieldValue.serverTimestamp(), 
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    res.status(200).send({ received: true });
  } catch (err: any) { 
    logger.error("Stripe Webhook Error", err);
    res.status(400).send(`Webhook Error: ${err.message}`); 
  }
});

/**
 * applyStarterMenu / applyStarterItems
 */
export const applyStarterMenu = onCall({ region: 'us-central1' }, async (request) => {
  const { venueId, venueType } = request.data || {};
  if (!venueId || !venueType) throw new HttpsError('invalid-argument', 'venueId and venueType required.');
  try {
    const snapshot = await db.collection('starter_modifier_library').where('venueType', 'array-contains', venueType.toLowerCase()).get();
    if (snapshot.empty) return { totalCreated: 0, status: 'no_templates_found' };
    const batch = db.batch();
    snapshot.docs.forEach(docSnap => {
      const template = docSnap.data();
      const groupId = `${venueId}-${docSnap.id}`;
      batch.set(db.collection('modifier_groups').doc(groupId), {
        id: groupId, sellerId: venueId, name: template.name,
        minSelection: template.required ? 1 : 0,
        maxSelection: template.selectionType === 'single' ? 1 : 99,
        options: template.options.map((opt: any) => ({
          id: String(opt.label).toLowerCase().replace(/\s+/g, '-'),
          name: opt.label, priceAdjustment: opt.priceModifier, isAvailable: true
        })),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
    return { totalCreated: snapshot.size, status: 'success' };
  } catch (e: any) { throw new HttpsError('internal', e.message); }
});

export const applyStarterItems = onCall({ region: 'us-central1' }, async (request) => {
  const { venueId, venueType } = request.data || {};
  if (!venueId || !venueType) throw new HttpsError('invalid-argument', 'venueId and venueType required.');
  try {
    const itemSnap = await db.collection('starter_menu_item_library').where('venueType', 'array-contains', venueType.toLowerCase()).get();
    if (itemSnap.empty) return { totalCreated: 0, status: 'no_templates_found' };
    const batch = db.batch();
    const venueItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');
    itemSnap.docs.forEach((docSnap, index) => {
      const template = docSnap.data();
      const itemId = `${venueId}-${docSnap.id}`;
      batch.set(venueItemsRef.doc(itemId), {
        ...template, id: itemId, availableOn: [template.serviceMode === 'beverageCart' ? 'Beverage Cart' : template.serviceMode === 'clubhouse' ? 'Clubhouse' : 'Lane Delivery'],
        rank: index + 1, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
    return { totalCreated: itemSnap.size, status: 'success' };
  } catch (e: any) { throw new HttpsError('internal', e.message); }
});
