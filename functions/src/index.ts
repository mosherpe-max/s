
import { onRequest, onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
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
 * assertVenueAuthorized
 * Mirrors firestore.rules' isVenueOwner: super admin, the venue's ownerUid,
 * or a roles_seller_admin mapping for the caller's email.
 */
async function assertVenueAuthorized(request: CallableRequest, venueId: string) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');

  const uid = request.auth.uid;
  const email = request.auth.token.email?.toLowerCase();

  const isSuperAdmin = uid === 'o9vAQy0aFRPSNPoG0ETvjiGt9If1' || email === 'mosherpe@gmail.com';
  if (isSuperAdmin) return;

  const venueDoc = await db.collection('venues').doc(venueId).get();
  if (venueDoc.exists && venueDoc.data()?.ownerUid === uid) return;

  if (email) {
    const roleDoc = await db.collection('roles_seller_admin').doc(email).get();
    if (roleDoc.exists && roleDoc.data()?.sellerId === venueId) return;
  }

  throw new HttpsError('permission-denied', 'Not authorized for this venue.');
}

const slugify = (name: string) => name.toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const SERVICE_MODE_LABELS: Record<string, string> = {
  beverageCart: 'Beverage Cart',
  clubhouse: 'Clubhouse',
  laneService: 'Lane Delivery',
};

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
    await assertVenueAuthorized(request, venueId);

    const email = request.auth?.token.email?.toLowerCase();
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
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Internal onboarding error.');
  }
});

/**
 * applyStarterMenu
 * Clones global starter modifier-group templates (starter_modifier_library,
 * filtered by venueType) into the venue's modifier_groups.
 */
export const applyStarterMenu = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { venueId, venueType } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!venueType) throw new HttpsError('invalid-argument', 'Missing venueType.');
    await assertVenueAuthorized(request, venueId);

    const librarySnap = await db.collection('starter_modifier_library').get();
    const relevant = librarySnap.docs.filter(d => {
      const vt = d.data().venueType;
      return Array.isArray(vt) && vt.includes(venueType);
    });

    const modifierGroupsRef = db.collection('modifier_groups');
    const batch = db.batch();
    relevant.forEach(templateDoc => {
      const template = templateDoc.data();
      const groupId = `${venueId}-${slugify(template.name)}`;
      batch.set(modifierGroupsRef.doc(groupId), {
        id: groupId,
        sellerId: venueId,
        name: template.name,
        minSelection: template.required ? 1 : 0,
        maxSelection: template.selectionType === 'single' ? 1 : 99,
        options: (template.options || []).map((opt: { label: string; priceModifier: number }) => ({
          id: slugify(opt.label),
          name: opt.label,
          priceAdjustment: opt.priceModifier,
          isAvailable: true,
        })),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();

    return { totalCreated: relevant.length };
  } catch (err: any) {
    logger.error("applyStarterMenu Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to clone modifier templates.');
  }
});

/**
 * applyStarterItems
 * Clones global starter menu-item templates (starter_menu_item_library,
 * filtered by venueType) into the venue's sellers/{venueId}/menuItems.
 */
export const applyStarterItems = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { venueId, venueType } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!venueType) throw new HttpsError('invalid-argument', 'Missing venueType.');
    await assertVenueAuthorized(request, venueId);

    const librarySnap = await db.collection('starter_menu_item_library').get();
    const relevant = librarySnap.docs.filter(d => {
      const vt = d.data().venueType;
      return Array.isArray(vt) && vt.includes(venueType);
    });

    const menuItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');
    const existingCountSnap = await menuItemsRef.count().get();
    const startRank = existingCountSnap.data().count;

    const batch = db.batch();
    relevant.forEach((templateDoc, index) => {
      const template = templateDoc.data();
      const itemId = `${venueId}-${slugify(template.name)}-${slugify(template.serviceMode || '')}`;
      const modifierGroupIds = Array.from(new Set(
        (template.suggestedModifierGroups || []).map((name: string) => `${venueId}-${slugify(name)}`)
      ));
      const availableOn = SERVICE_MODE_LABELS[template.serviceMode] ? [SERVICE_MODE_LABELS[template.serviceMode]] : [];

      batch.set(menuItemsRef.doc(itemId), {
        id: itemId,
        name: template.name,
        description: template.description || '',
        price: template.price,
        category: template.category,
        rank: startRank + index + 1,
        imageUrl: template.imageUrl || '',
        modifierGroupIds,
        availableOn,
        isAvailable: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();

    return { totalCreated: relevant.length };
  } catch (err: any) {
    logger.error("applyStarterItems Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to clone menu item templates.');
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
      // Keyed on the PaymentIntent id (matching the client's own order write) so this
      // and the client's write always land on the same doc, however they race - a
      // query-then-create-if-missing here previously let both sides create separate
      // order docs for one payment, which then each independently triggered SMS
      // status updates (duplicate texts) once staff acted on either one.
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata || {};
      await db.collection('orders').doc(pi.id).set({
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
      }, { merge: true });
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
