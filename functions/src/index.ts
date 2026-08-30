
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
 */
async function performOperationalReset() {
  logger.info("[performOperationalReset] STARTING ROBUST SYSTEM SWEEP");

  let totalStaffReset = 0;
  let totalOrdersCancelled = 0;

  try {
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

    await Promise.all(batches);
    logger.info(`[performOperationalReset] Finalized. Staff: ${totalStaffReset}, Orders: ${totalOrdersCancelled}`);
    
    return { status: 'success', totalStaffReset, totalOrdersCancelled };
  } catch (err: any) {
    logger.error("[performOperationalReset] Critical Failure during sweep:", err);
    throw err;
  }
}

/**
 * createPaymentIntent
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  try {
    const { amount, convenienceFee, sellerId, patronName, patronPhone, patronEmail, stripeCustomerId: clientProvidedCustomerId } = request.data || {};
    const buyerUid = request.auth?.uid;

    if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');
    if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');

    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    const sellerDoc = await db.collection('sellers').doc(sellerId).get();
    const venueStripeAccountId = sellerDoc.data()?.stripeAccountId;
    if (!venueStripeAccountId) {
      throw new HttpsError('failed-precondition', 'Venue is not configured for digital payments.');
    }

    const configSnap = await db.collection('solution').doc('config').get();
    const stripeFeePercent = configSnap.exists ? (configSnap.data()?.stripeFeePercent ?? 2.9) : 2.9;
    const stripeFeeFixed = configSnap.exists ? (configSnap.data()?.stripeFeeFixed ?? 30) : 30;

    const baseCents = Math.round(amount * 100);
    const convenienceFeeCents = Math.round((convenienceFee || 0) * 100);
    const totalCents = baseCents + convenienceFeeCents;

    const estimatedStripeFeeCents = Math.round(totalCents * (stripeFeePercent / 100) + stripeFeeFixed);
    const applicationFeeAmount = Math.max(0, convenienceFeeCents - estimatedStripeFeeCents);

    let stripeCustomerId = clientProvidedCustomerId;
    if (!stripeCustomerId && buyerUid) {
      const userDoc = await db.collection('users').doc(buyerUid).get();
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email: patronEmail || undefined, 
        name: patronName || 'Guest Patron', 
        metadata: { buyerUid: buyerUid || 'anonymous' } 
      });
      stripeCustomerId = customer.id;
    }

    const customerSession = await stripe.customerSessions.create({
      customer: stripeCustomerId,
      components: { payment_element: { enabled: true, features: { payment_method_save: 'enabled', payment_method_redisplay: 'enabled' } } }
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      transfer_data: { destination: venueStripeAccountId },
      application_fee_amount: applicationFeeAmount,
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
 * initializeVenueStripeOnboarding
 * Creates (if needed) a Stripe Express connected account for a venue and
 * returns a fresh Account Link URL to complete/continue onboarding.
 */
export const initializeVenueStripeOnboarding = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  try {
    const { venueId } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');

    const uid = request.auth.uid;
    const email = request.auth.token.email?.toLowerCase();

    const isSuperAdmin = uid === 'o9vAQy0aFRPSNPoG0ETvjiGt9If1' || email === 'mosherpe@gmail.com';

    let isAuthorized = isSuperAdmin;
    if (!isAuthorized) {
      const venueDoc = await db.collection('venues').doc(venueId).get();
      if (venueDoc.exists && venueDoc.data()?.ownerUid === uid) isAuthorized = true;
    }
    if (!isAuthorized && email) {
      const roleDoc = await db.collection('roles_seller_admin').doc(email).get();
      if (roleDoc.exists && roleDoc.data()?.sellerId === venueId) isAuthorized = true;
    }
    if (!isAuthorized) throw new HttpsError('permission-denied', 'Not authorized for this venue.');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');
    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    const sellerRef = db.collection('sellers').doc(venueId);
    const sellerDoc = await sellerRef.get();
    let stripeAccountId = sellerDoc.exists ? sellerDoc.data()?.stripeAccountId : undefined;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: sellerDoc.data()?.contactEmail || email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { venueId },
      });
      stripeAccountId = account.id;

      const batch = db.batch();
      batch.set(sellerRef, { stripeAccountId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      batch.set(db.collection('venues').doc(venueId), { stripeAccountId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await batch.commit();
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `https://koop.app/onboarding-refresh?venueId=${venueId}`,
      return_url: `https://koop.app/onboarding-success?venueId=${venueId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (err: any) {
    logger.error("Stripe Onboarding Error", err);
    throw new HttpsError('internal', err.message || 'Internal onboarding error.');
  }
});

/**
 * dailyOperationalReset
 */
export const dailyOperationalReset = onSchedule({ 
  schedule: "0 * * * *", 
  timeZone: "America/New_York", 
  region: 'us-central1' 
}, async () => {
  const configSnap = await db.collection('solution').doc('config').get();
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (nowInEst.getHours() !== resetHour) return;
  await performOperationalReset();
});

/**
 * manualOperationalReset
 */
export const manualOperationalReset = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized access.');
  return await performOperationalReset();
});

/**
 * onGuestOrderStatusUpdate
 * Dispatches SMS updates via Twilio for key fulfillment stages.
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

    if (beforeData) {
      // 1. STATUS CHANGE ALERTS
      if (data.status !== beforeData.status) {
        if (data.status === 'Preparing') {
          body = `Order confirmed! We're getting it ready: ${link}`;
        } else if (data.status === 'Out for Delivery') {
          body = `Order out for delivery! Track live: ${link}`;
        } else if (data.status === 'Delivered') {
          body = `Order delivered! Enjoy your time at the venue: ${link}`;
        }
      }
      
      // 2. MANUAL "PIN" REQUEST
      // Using value-based comparison for the timestamp object to detect any new Pin hit
      const oldReq = beforeData.refreshRequestedAt;
      const newReq = data.refreshRequestedAt;
      
      const isNewPinRequest = newReq && (
        !oldReq || 
        (newReq.seconds !== oldReq.seconds) || 
        (newReq.nanoseconds !== oldReq.nanoseconds)
      );

      if (!body && isNewPinRequest) {
        body = `Hey! Your Koop order is on the way — tap to help us find you: ${link}`;
      }
    }

    if (body) {
      const cleanPhone = String(data.customerPhone).replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const to = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
        await client.messages.create({ body, from: fromNumber, to });
        logger.info(`[onGuestOrderStatusUpdate] SMS sent to ${to}: ${body}`);
      }
    }
  } catch (err) {
    logger.error("Twilio Trigger Failed", err);
  }
});

/**
 * handleStripeWebhook
 */
export const handleStripeWebhook = onRequest({
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CONNECT_WEBHOOK_SECRET"],
  region: 'us-central1'
}, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!sig || !stripeKey || (!webhookSecret && !connectWebhookSecret)) {
    res.status(400).send("Webhook configuration missing.");
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });
  try {
    // Two event destinations (platform-account events and connected-account
    // events) each have their own signing secret, so try both that are configured.
    const candidateSecrets = [webhookSecret, connectWebhookSecret].filter((s): s is string => !!s);
    let event: Stripe.Event | undefined;
    let lastErr: any;
    for (const candidate of candidateSecrets) {
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, candidate);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!event) throw lastErr;
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const existingQuery = await db.collection('orders').where('stripePaymentIntentId', '==', pi.id).limit(1).get();
      
      if (!existingQuery.empty) {
        await existingQuery.docs[0].ref.update({
          paymentStatus: 'Succeeded',
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        const meta = pi.metadata || {};
        await db.collection('orders').add({
          customerName: meta.customerName || 'Guest', 
          customerPhone: (meta.customerPhone || '').replace(/\D/g, ''), 
          customerEmail: meta.customerEmail || '',
          status: "Placed", 
          sellerId: meta.sellerId || '', 
          buyerProfileId: meta.buyerUid || 'anonymous',
          stripePaymentIntentId: pi.id, 
          total: (pi.amount || 0) / 100, 
          paymentStatus: 'Succeeded',
          createdAt: FieldValue.serverTimestamp(), 
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    } else if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      const venueId = account.metadata?.venueId;
      if (venueId) {
        const payoutsEnabled = !!account.payouts_enabled;
        const onboardingComplete = !!account.details_submitted;
        const batch = db.batch();
        batch.set(db.collection('sellers').doc(venueId), {
          stripeOnboardingComplete: onboardingComplete,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        batch.set(db.collection('venues').doc(venueId), {
          payoutsEnabled,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        await batch.commit();
      }
    }
    res.status(200).send({ received: true });
  } catch (err: any) {
    logger.error("Stripe Webhook Error", err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
