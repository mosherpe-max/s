
import { onRequest, onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from 'stripe';
import twilio from 'twilio';
import webpush from 'web-push';

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
  // Cold starts on this function are directly patron-visible checkout
  // latency (Node.js + firebase-admin + stripe init can add seconds on a
  // cold invocation). Keeping one instance warm removes that entirely for
  // the function on the critical path to loading the payment form.
  minInstances: 1,
}, async (request) => {
  try {
    const { amount, convenienceFee, sellerId, menuType, patronName, patronPhone, patronEmail, stripeCustomerId: clientProvidedCustomerId } = request.data || {};
    const buyerUid = request.auth?.uid;

    if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');
    if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');
    if (!menuType) throw new HttpsError('invalid-argument', 'Missing menuType.');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');

    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    const sellerDoc = await db.collection('sellers').doc(sellerId).get();
    const sellerData = sellerDoc.data();
    const venueStripeAccountId = sellerData?.stripeAccountId;
    if (!venueStripeAccountId) {
      throw new HttpsError('failed-precondition', 'Venue is not configured for digital payments.');
    }

    // Never charge a patron for a service mode nobody can currently fulfill.
    // The client's isModeAvailable() (order/page.tsx) checks this too, but
    // only to decide which menu tab renders as clickable - it's never
    // re-checked at the point money actually moves, so a stale tab or a
    // direct call could otherwise charge a card for an order no one is
    // staffed to make. Demo venues keep the same unconditional bypass used
    // everywhere else in the ordering flow.
    if (!sellerId.startsWith('demo-')) {
      const activeFlagByMode: Record<string, string> = {
        'Beverage Cart': 'bevcartActive',
        'Clubhouse': 'clubhouseActive',
        'Lane Delivery': 'lanedeliveryActive',
      };
      const activeFlag = activeFlagByMode[menuType];
      const isVenueAuthorized = activeFlag && (sellerData?.menuTypes || []).includes(menuType) && !!sellerData?.[activeFlag];
      if (!isVenueAuthorized) {
        throw new HttpsError('failed-precondition', 'This service is currently closed.');
      }

      const configDoc = await db.collection('solution').doc('config').get();
      const enabledModes: string[] | undefined = configDoc.data()?.enabledModes;
      if (enabledModes && !enabledModes.includes(menuType)) {
        throw new HttpsError('failed-precondition', 'This service is currently closed.');
      }

      const staffSnap = await db.collection('sellers').doc(sellerId).collection('staff')
        .where('activeMode', '==', menuType).get();
      const hasActiveStaff = staffSnap.docs.some(d => d.data()?.isActive !== false);
      if (!hasActiveStaff) {
        throw new HttpsError('failed-precondition', 'No staff are currently available to take orders for this service.');
      }

      // A staff-initiated pause or an auto-throttle trip (queue too full)
      // both stop new orders without touching *Active - see the
      // PausedByStaff/AutoThrottled fields on Seller in src/lib/types.ts.
      const pausedFlagByMode: Record<string, string> = {
        'Beverage Cart': 'bevcartPausedByStaff',
        'Clubhouse': 'clubhousePausedByStaff',
        'Lane Delivery': 'lanedeliveryPausedByStaff',
      };
      const throttledFlagByMode: Record<string, string> = {
        'Beverage Cart': 'bevcartAutoThrottled',
        'Clubhouse': 'clubhouseAutoThrottled',
        'Lane Delivery': 'lanedeliveryAutoThrottled',
      };
      if (sellerData?.[pausedFlagByMode[menuType]] || sellerData?.[throttledFlagByMode[menuType]]) {
        throw new HttpsError('failed-precondition', 'Very busy right now - please try again shortly.');
      }
    }

    const venueDoc = await db.collection('venues').doc(sellerId).get();
    const koopStripeFeeCoverageCents = Math.round(venueDoc.data()?.solutionFeeFixed ?? 0);

    const baseCents = Math.round(amount * 100);
    const convenienceFeeCents = Math.round((convenienceFee || 0) * 100);
    const totalCents = baseCents + convenienceFeeCents;

    // Koop keeps the convenience fee minus its own per-venue contribution
    // toward Stripe's processing cost (solutionFeeFixed). The rest of that
    // real cost lands on the venue's own balance via on_behalf_of below,
    // rather than being deducted from the platform's balance.
    const applicationFeeAmount = Math.max(0, convenienceFeeCents - koopStripeFeeCoverageCents);

    let stripeCustomerId = clientProvidedCustomerId;
    let isReturningCustomer = !!stripeCustomerId;
    if (!stripeCustomerId && buyerUid) {
      const userDoc = await db.collection('users').doc(buyerUid).get();
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
        isReturningCustomer = true;
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: patronEmail || undefined,
        name: patronName || 'Guest Patron',
        phone: patronPhone || undefined,
        metadata: { buyerUid: buyerUid || 'anonymous' }
      });
      stripeCustomerId = customer.id;
    }

    // Only look up saved cards for a customer we already knew about - a
    // brand-new customer can't have any, and skipping the extra Stripe
    // round-trip keeps first-time checkout as fast as before.
    let savedPaymentMethod: { id: string; brand: string; last4: string } | null = null;
    if (isReturningCustomer) {
      const paymentMethods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 1 });
      const pm = paymentMethods.data[0];
      if (pm?.card) {
        savedPaymentMethod = { id: pm.id, brand: pm.card.brand, last4: pm.card.last4 };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      on_behalf_of: venueStripeAccountId,
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
      stripeCustomerId,
      savedPaymentMethod
    };
  } catch (err: any) {
    logger.error("Stripe PI Error", err);
    // Preserve deliberate HttpsErrors (e.g. failed-precondition for a closed
    // service) so the client can branch on `.code` instead of string-matching
    // a message - only an unexpected exception gets downgraded to 'internal'.
    if (err instanceof HttpsError) throw err;
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
 * Copies specific global starter modifier-group templates
 * (starter_modifier_library) into the venue's modifier_groups. Callable by
 * a super admin (building out a venue's initial setup) or that venue's own
 * authorized admin (pulling in a modifier whenever they want) - both pass
 * the same assertVenueAuthorized check.
 */
export const applyStarterMenu = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { venueId, modifierIds } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!Array.isArray(modifierIds) || modifierIds.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing modifierIds.');
    }
    await assertVenueAuthorized(request, venueId);

    const librarySnap = await db.collection('starter_modifier_library').get();
    const selected = librarySnap.docs.filter(d => modifierIds.includes(d.id));

    const modifierGroupsRef = db.collection('modifier_groups');
    const batch = db.batch();
    selected.forEach(templateDoc => {
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

    return { totalCreated: selected.length };
  } catch (err: any) {
    logger.error("applyStarterMenu Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to import modifier templates.');
  }
});

/**
 * applyStarterItems
 * Copies specific global starter menu-item templates
 * (starter_menu_item_library) into the venue's sellers/{venueId}/menuItems,
 * onto the given service mode. An item already on the venue's menu (e.g.
 * imported earlier for a different mode) gets this mode added to its
 * availableOn list instead of being overwritten, so the same item can live
 * on multiple modes without duplicate docs or clobbering prior edits.
 * Also opts the item's category into that mode's categoryVisibility so an
 * import doesn't silently end up invisible on the buyer-facing menu.
 * Callable by a super admin or the venue's own authorized admin.
 */
export const applyStarterItems = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { venueId, itemIds, mode } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing itemIds.');
    }
    if (!SERVICE_MODE_LABELS[mode]) throw new HttpsError('invalid-argument', 'Missing or invalid mode.');
    await assertVenueAuthorized(request, venueId);

    const modeLabel = SERVICE_MODE_LABELS[mode];
    const librarySnap = await db.collection('starter_menu_item_library').get();
    const selected = librarySnap.docs.filter(d => itemIds.includes(d.id));

    const menuItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');
    const itemRefs = selected.map(templateDoc => menuItemsRef.doc(`${venueId}-${templateDoc.id}`));
    const existingDocs = itemRefs.length ? await db.getAll(...itemRefs) : [];
    const existingById = new Map(existingDocs.map(d => [d.id, d]));

    const existingCountSnap = await menuItemsRef.count().get();
    let nextRank = existingCountSnap.data().count + 1;

    const batch = db.batch();
    const categoriesTouched = new Set<string>();

    selected.forEach((templateDoc, index) => {
      const template = templateDoc.data();
      const itemRef = itemRefs[index];
      const existing = existingById.get(itemRef.id);
      categoriesTouched.add(template.category);

      if (existing?.exists) {
        batch.update(itemRef, {
          availableOn: FieldValue.arrayUnion(modeLabel),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const modifierGroupIds = Array.from(new Set(
          (template.suggestedModifierGroups || []).map((name: string) => `${venueId}-${slugify(name)}`)
        ));
        batch.set(itemRef, {
          id: itemRef.id,
          name: template.name,
          description: template.description || '',
          price: template.price,
          category: template.category,
          rank: nextRank++,
          imageUrl: template.imageUrl || '',
          modifierGroupIds,
          availableOn: [modeLabel],
          isAvailable: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    if (categoriesTouched.size > 0) {
      batch.set(db.collection('sellers').doc(venueId), {
        categoryVisibility: { [modeLabel]: FieldValue.arrayUnion(...Array.from(categoriesTouched)) },
      }, { merge: true });
    }

    await batch.commit();

    return { totalCreated: selected.length };
  } catch (err: any) {
    logger.error("applyStarterItems Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to import menu item templates.');
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

// Same 4-digit display id derivation as getNumericOrderId in src/lib/utils.ts -
// duplicated here since functions/ is a separate TS project that can't import
// from src/.
function getNumericOrderId(id: string): string {
  if (!id) return '0000';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0');
}

function modePathFor(mode: string): string {
  if (mode === 'Clubhouse') return 'clubhouse';
  if (mode === 'Lane Delivery') return 'laneside';
  return 'bevcart';
}

const VAPID_SUBJECT = 'mailto:support@koop.app';

/**
 * Web Push counterpart to the in-app audible/toast alerts on the staff
 * pages - reaches on-shift staff even when the installed PWA is
 * backgrounded or the screen is off, which the in-app alert (only runs
 * while the tab/app is actually open) can't do. No-ops gracefully if the
 * VAPID keys haven't been configured yet.
 */
function getWebPushClient(): typeof webpush | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
  return webpush;
}

interface StaffPushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Sends to every device currently signed into this exact venue + service
 * mode (activeMode match on the staff doc) - a Beverage Cart order never
 * reaches a Clubhouse-logged-in device and vice versa, and a staff member
 * who has clocked out (activeMode cleared) receives nothing. The push
 * subscription itself lives on a separate per-device doc
 * (sellers/{sellerId}/pushDevices/{deviceId}), not on the staff doc -
 * set up once from Safari before the PWA is added to the Home Screen,
 * since requesting notification permission from inside the already-
 * installed standalone app ejects it into Safari chrome on this iOS
 * build. Each staff doc just points at the device it last logged in from
 * (currentDeviceId), so the actual subscription outlives any one staff
 * member on a shared terminal. Deletes any device doc Web Push reports as
 * gone (expired/unsubscribed) instead of retrying it forever.
 */
async function pushToActiveStaff(sellerId: string, mode: string, payload: StaffPushPayload) {
  const client = getWebPushClient();
  if (!client) return;

  const staffSnap = await db.collection('sellers').doc(sellerId).collection('staff')
    .where('activeMode', '==', mode)
    .get();
  if (staffSnap.empty) return;

  const deviceIds = Array.from(new Set(
    staffSnap.docs.map(d => d.data()?.currentDeviceId).filter((id): id is string => !!id)
  ));
  if (deviceIds.length === 0) return;

  const devicesRef = db.collection('sellers').doc(sellerId).collection('pushDevices');
  const deviceDocs = await db.getAll(...deviceIds.map(id => devicesRef.doc(id)));

  const body = JSON.stringify(payload);

  await Promise.all(deviceDocs.map(async (deviceDoc) => {
    if (!deviceDoc.exists) return;
    const subscription = deviceDoc.data()?.subscription;
    if (!subscription?.endpoint) return;
    try {
      await client.sendNotification(subscription, body);
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await deviceDoc.ref.delete().catch(() => {});
      } else {
        logger.error(`Push failed for device ${deviceDoc.id}`, err);
      }
    }
  }));
}

/**
 * notifyStaffOnNewOrder
 */
export const notifyStaffOnNewOrder = onDocumentWritten({
  document: "orders/{orderId}",
  secrets: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
  region: 'us-central1'
}, async (event) => {
  // Only brand-new orders - status transitions on existing orders are not
  // a "new order" event.
  if (event.data?.before?.exists) return;
  const after = event.data?.after;
  if (!after?.exists) return;

  const order = after.data();
  if (!order?.sellerId || !order?.menuType) return;

  try {
    const itemCount = (order.items || []).length;
    await pushToActiveStaff(order.sellerId, order.menuType, {
      title: 'New Order',
      body: `${order.customerName || 'Guest'} - ${itemCount} item${itemCount === 1 ? '' : 's'}`,
      url: `/sellers/${order.sellerId}/${modePathFor(order.menuType)}`,
    });
  } catch (err) {
    logger.error("notifyStaffOnNewOrder failed", err);
  }
});

/**
 * checkLateOrders
 * Scheduled sweep for orders that have exceeded their venue's configured
 * max processing time. Unlike notifyStaffOnNewOrder (a per-write trigger),
 * "has now been open too long" is a pure time-passing condition with no
 * new document write to hang a trigger off of, so this polls instead.
 */
export const checkLateOrders = onSchedule({
  schedule: "every 2 minutes",
  region: 'us-central1',
  secrets: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
}, async () => {
  const activeSnap = await db.collection('orders')
    .where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    .get();
  if (activeSnap.empty) return;

  const sellerCache = new Map<string, FirebaseFirestore.DocumentData | undefined>();
  const configSnap = await db.collection('solution').doc('config').get();
  const solutionConfig = configSnap.exists ? configSnap.data() : undefined;

  for (const orderDoc of activeSnap.docs) {
    const order = orderDoc.data();
    if (order.lateAlertSentAt || !order.createdAt || !order.sellerId || !order.menuType) continue;

    if (!sellerCache.has(order.sellerId)) {
      const sellerSnap = await db.collection('sellers').doc(order.sellerId).get();
      sellerCache.set(order.sellerId, sellerSnap.exists ? sellerSnap.data() : undefined);
    }
    const seller = sellerCache.get(order.sellerId);
    const thresholds = seller?.orderThresholds?.[order.menuType]
      || solutionConfig?.orderThresholds?.[order.menuType]
      || { maxOrderProcessingMinutes: 25 };

    const elapsedMinutes = (Date.now() - order.createdAt.toDate().getTime()) / 60000;
    if (elapsedMinutes < thresholds.maxOrderProcessingMinutes) continue;

    try {
      await pushToActiveStaff(order.sellerId, order.menuType, {
        title: 'Order Running Late',
        body: `#${getNumericOrderId(orderDoc.id)} has been open ${Math.floor(elapsedMinutes)}+ minutes`,
        url: `/sellers/${order.sellerId}/${modePathFor(order.menuType)}`,
      });
      await orderDoc.ref.update({ lateAlertSentAt: FieldValue.serverTimestamp() });
    } catch (err) {
      logger.error(`checkLateOrders push failed for order ${orderDoc.id}`, err);
    }
  }
});
