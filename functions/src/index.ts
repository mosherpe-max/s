
import { onRequest, onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { randomBytes } from "crypto";
import {
  IN_PROGRESS_STATUSES, cancelReasonOf, computeDurations, isDemoSeller, isExcluded, localTimeParts,
  modeFlagPrefix, placementLocation, roundCoord, summarizeItems, suspectReasons,
} from "./order-timing.js";
import { canTakeCardPayments, stripeStatusFromAccount } from "./stripe-status.js";
import { reconcileOrderQueue, syncQueueEntry } from "./order-queue.js";
import Stripe from 'stripe';
import twilio from 'twilio';
import webpush from 'web-push';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();
const APP_BASE_URL = 'https://kooporder.app';

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
 * Mirrors firestore.rules' isVenueOwner: super admin, a Koop team member, the venue's
 * ownerUid, or a roles_seller_admin mapping for the caller's email.
 */
async function assertVenueAuthorized(request: CallableRequest, venueId: string) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');

  const uid = request.auth.uid;
  const email = request.auth.token.email?.toLowerCase();

  const isSuperAdmin = uid === 'o9vAQy0aFRPSNPoG0ETvjiGt9If1' || email === 'mosherpe@gmail.com';
  if (isSuperAdmin) return;
  if (email && (await db.collection('roles_koop_team').doc(email).get()).exists) return;

  const venueDoc = await db.collection('venues').doc(venueId).get();
  if (venueDoc.exists && venueDoc.data()?.ownerUid === uid) return;

  if (email) {
    const roleDoc = await db.collection('roles_seller_admin').doc(email).get();
    if (roleDoc.exists && roleDoc.data()?.sellerId === venueId) return;
  }

  throw new HttpsError('permission-denied', 'Not authorized for this venue.');
}

/**
 * assertSuperAdmin
 * Only the Koop admin may create venue admin logins or issue reset links.
 */
function assertSuperAdmin(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
  const email = request.auth.token.email?.toLowerCase();
  const isSuperAdmin = request.auth.uid === 'o9vAQy0aFRPSNPoG0ETvjiGt9If1' || email === 'mosherpe@gmail.com';
  if (!isSuperAdmin) throw new HttpsError('permission-denied', 'Koop admin access required.');
}

/**
 * assertKoopAdmin
 * The Koop admin or a Koop team member (roles_koop_team, keyed by email). For the day-to-day
 * setup work; things only the Koop admin may do keep using assertSuperAdmin.
 */
async function assertKoopAdmin(request: CallableRequest) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign-in required.');
  const email = request.auth.token.email?.toLowerCase();
  if (request.auth.uid === 'o9vAQy0aFRPSNPoG0ETvjiGt9If1' || email === 'mosherpe@gmail.com') return;
  if (email && (await db.collection('roles_koop_team').doc(email).get()).exists) return;
  throw new HttpsError('permission-denied', 'Koop admin access required.');
}

const SUPER_ADMIN_EMAIL = 'mosherpe@gmail.com';
const SUPER_ADMIN_UID = 'o9vAQy0aFRPSNPoG0ETvjiGt9If1';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * staffLogin
 * A staff member enters their 4-digit PIN on the venue's staff login screen. The PIN is
 * checked here, on the server, and a sign-in token is returned that carries which venue
 * (and which staff member) the device is signed in for. Security rules can then tell a
 * staff device from a patron's. Wrong PINs are limited per venue and device so the
 * 10,000 possible PINs can't be tried one after another.
 */
const STAFF_LOGIN_MAX_FAILURES = 8;
const STAFF_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const staffLogin = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const sellerId = typeof request.data?.sellerId === 'string' ? request.data.sellerId.trim() : '';
    const pin = typeof request.data?.pin === 'string' ? request.data.pin.trim() : '';
    if (!sellerId || sellerId.includes('/')) throw new HttpsError('invalid-argument', 'Missing venue.');
    if (!/^\d{4}$/.test(pin)) throw new HttpsError('invalid-argument', 'Enter your 4-digit PIN.');

    const ip = String(request.rawRequest?.ip || 'unknown').replace(/[^a-zA-Z0-9:.]/g, '_');
    const attemptsRef = db.collection('staffLoginAttempts').doc(`${sellerId}_${ip}`);
    const attemptsSnap = await attemptsRef.get();
    const attempts = attemptsSnap.data() as { count?: number; windowStart?: number } | undefined;
    const windowOpen = !!attempts?.windowStart && Date.now() - attempts.windowStart < STAFF_LOGIN_WINDOW_MS;
    if (windowOpen && (attempts?.count || 0) >= STAFF_LOGIN_MAX_FAILURES) {
      throw new HttpsError('resource-exhausted', 'Too many wrong PINs. Wait a few minutes and try again.');
    }

    // PINs live in staffSecrets (readable only by the venue admin); an active staff record
    // with that PIN is the match. Records not yet moved still carry the PIN themselves.
    const sellerRef = db.collection('sellers').doc(sellerId);
    let staffDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    const secretSnap = await sellerRef.collection('staffSecrets').where('pin', '==', pin).get();
    for (const secret of secretSnap.docs) {
      const candidate = await sellerRef.collection('staff').doc(secret.id).get();
      if (candidate.exists && candidate.data()?.isActive === true) { staffDoc = candidate; break; }
    }
    if (!staffDoc) {
      const legacySnap = await sellerRef.collection('staff')
        .where('pin', '==', pin)
        .where('isActive', '==', true)
        .limit(1)
        .get();
      if (!legacySnap.empty) staffDoc = legacySnap.docs[0];
    }

    if (!staffDoc) {
      // Counts only (never the PIN) so a refused login can be told apart from missing data.
      const [secretTotal, staffTotal] = await Promise.all([
        sellerRef.collection('staffSecrets').count().get(),
        sellerRef.collection('staff').count().get(),
      ]);
      logger.warn('staffLogin: PIN not matched', {
        sellerId,
        pinMatches: secretSnap.size,
        secretsInVenue: secretTotal.data().count,
        staffInVenue: staffTotal.data().count,
        matchedButInactiveOrMissing: secretSnap.docs.map(d => d.id),
      });
      await attemptsRef.set({
        count: windowOpen ? (attempts?.count || 0) + 1 : 1,
        windowStart: windowOpen ? attempts!.windowStart : Date.now(),
      });
      throw new HttpsError('permission-denied', 'Invalid PIN.');
    }

    if (attemptsSnap.exists) await attemptsRef.delete();

    const staff = staffDoc.data() || {};
    const token = await getAuth().createCustomToken(`staff_${sellerId}_${staffDoc.id}`, {
      staffSellerId: sellerId,
      staffId: staffDoc.id,
    });
    return { token, staff: { id: staffDoc.id, name: String(staff.name || '') } };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    logger.error("staffLogin Error", err);
    throw new HttpsError('internal', 'Could not sign in. Please try again.');
  }
});

/**
 * Staff PINs are kept out of the staff records (which patrons can read) in
 * sellers/{id}/staffSecrets/{staffId}, readable only by the venue admin and Koop admin.
 * movePinToSecrets copies a PIN across and removes it from the staff record.
 */
async function movePinToSecrets(staffRef: FirebaseFirestore.DocumentReference, pin: string) {
  const secretRef = staffRef.parent.parent!.collection('staffSecrets').doc(staffRef.id);
  await secretRef.set({ pin, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await staffRef.update({ pin: FieldValue.delete() });
}

/**
 * syncStaffPin
 * Any time a staff record is written with a PIN on it (an old browser tab, or a record
 * not yet migrated), move the PIN to the private place straight away.
 */
export const syncStaffPin = onDocumentWritten({
  document: "sellers/{sellerId}/staff/{staffId}",
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) {
    // The staff member was removed, so remove their PIN too.
    await db.doc(`sellers/${event.params.sellerId}/staffSecrets/${event.params.staffId}`).delete().catch(() => {});
    return;
  }
  const pin = after.data()?.pin;
  if (typeof pin !== 'string' || !pin) return;
  await movePinToSecrets(after.ref, pin);
});

/**
 * migrateStaffPins
 * Koop admin runs this once to move every existing staff PIN into staffSecrets. Safe to
 * run again: it only touches records that still carry a PIN.
 */
export const migrateStaffPins = onCall({ region: 'us-central1', timeoutSeconds: 300 }, async (request) => {
  try {
    assertSuperAdmin(request);
    let moved = 0;
    const sellers = await db.collection('sellers').get();
    for (const seller of sellers.docs) {
      const staff = await seller.ref.collection('staff').get();
      for (const doc of staff.docs) {
        const pin = doc.data().pin;
        if (typeof pin === 'string' && pin) {
          await movePinToSecrets(doc.ref, pin);
          moved++;
        }
      }
    }
    return { moved };
  } catch (err: any) {
    logger.error("migrateStaffPins Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Could not move the staff PINs.');
  }
});

/**
 * createVenueAdminLogin
 * Koop admin sets up a login for a venue's manager: creates the Firebase sign-in
 * (or reuses one that exists), maps their email to the venue so the login page
 * routes them to its dashboard (roles_seller_admin, which also grants the access
 * the Firestore rules check), and returns a link for them to choose their own
 * password. No password is ever generated for a person to see: the account starts
 * with a random one nobody knows, and the link replaces it.
 */
export const createVenueAdminLogin = onCall({ region: 'us-central1' }, async (request) => {
  try {
    await assertKoopAdmin(request);
    const venueId = typeof request.data?.venueId === 'string' ? request.data.venueId.trim() : '';
    const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
    const name = typeof request.data?.name === 'string' ? request.data.name.trim().slice(0, 80) : '';

    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!EMAIL_PATTERN.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
    if (email === SUPER_ADMIN_EMAIL) throw new HttpsError('invalid-argument', 'That email is the Koop admin account.');
    if ((await db.collection('roles_koop_team').doc(email).get()).exists) {
      throw new HttpsError('failed-precondition', 'That email is a Koop team login, not a venue login.');
    }

    const sellerRef = db.collection('sellers').doc(venueId);
    const sellerSnap = await sellerRef.get();
    if (!sellerSnap.exists) throw new HttpsError('not-found', 'Venue not found.');
    const courseName = sellerSnap.data()?.courseName || venueId;

    const roleRef = db.collection('roles_seller_admin').doc(email);
    const roleSnap = await roleRef.get();
    if (roleSnap.exists && roleSnap.data()?.sellerId !== venueId) {
      throw new HttpsError('failed-precondition', `That email is already the admin login for another venue (${roleSnap.data()?.courseName || roleSnap.data()?.sellerId}).`);
    }

    const auth = getAuth();
    let userRecord;
    let created = false;
    try {
      userRecord = await auth.getUserByEmail(email);
      if (userRecord.uid === SUPER_ADMIN_UID) throw new HttpsError('invalid-argument', 'That email is the Koop admin account.');
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      if (err?.code !== 'auth/user-not-found') throw err;
      userRecord = await auth.createUser({
        email,
        displayName: name || undefined,
        password: randomBytes(24).toString('base64url'),
        emailVerified: false,
      });
      created = true;
    }

    const venueRef = db.collection('venues').doc(venueId);
    const venueSnap = await venueRef.get();
    const batch = db.batch();
    batch.set(roleRef, {
      userName: name || userRecord.displayName || email,
      email,
      sellerId: venueId,
      courseName,
      uid: userRecord.uid,
      assignedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    // Record an owner on the venue records only if none is set, so adding a second
    // admin never replaces the first.
    if (venueSnap.exists && !venueSnap.data()?.ownerUid) batch.update(venueRef, { ownerUid: userRecord.uid, updatedAt: FieldValue.serverTimestamp() });
    if (!sellerSnap.data()?.ownerId) batch.update(sellerRef, { ownerId: userRecord.uid, updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();

    const resetLink = await auth.generatePasswordResetLink(email);
    return { uid: userRecord.uid, created, email, resetLink };
  } catch (err: any) {
    logger.error("createVenueAdminLogin Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to create the venue admin login.');
  }
});

/**
 * generateVenueAdminResetLink
 * Koop admin gets a fresh password-reset link for an existing venue admin, to send
 * them directly (for example by text) when they can't use the emailed one.
 */
export const generateVenueAdminResetLink = onCall({ region: 'us-central1' }, async (request) => {
  try {
    await assertKoopAdmin(request);
    const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');

    // Only for people who are set up as a venue admin, not any account in the project.
    const roleSnap = await db.collection('roles_seller_admin').doc(email).get();
    if (!roleSnap.exists) throw new HttpsError('failed-precondition', 'That email is not a venue admin login.');

    const resetLink = await getAuth().generatePasswordResetLink(email);
    return { email, resetLink };
  } catch (err: any) {
    logger.error("generateVenueAdminResetLink Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to create a reset link.');
  }
});

/**
 * createKoopTeamLogin
 * Only the Koop admin may add a Koop team member: a login that can set venues up, build menus and
 * work the sales pipeline, but cannot manage the team or change system settings. Creates the sign-in
 * (or reuses one that exists), records the email in roles_koop_team, and returns a link for them to
 * choose their own password, as createVenueAdminLogin does for a venue manager.
 */
export const createKoopTeamLogin = onCall({ region: 'us-central1' }, async (request) => {
  try {
    assertSuperAdmin(request);
    const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
    const name = typeof request.data?.name === 'string' ? request.data.name.trim().slice(0, 80) : '';

    if (!EMAIL_PATTERN.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
    if (email === SUPER_ADMIN_EMAIL) throw new HttpsError('invalid-argument', 'That email is the Koop admin account.');

    const venueRole = await db.collection('roles_seller_admin').doc(email).get();
    if (venueRole.exists) throw new HttpsError('failed-precondition', 'That email is already a venue admin login. Use a different email.');

    const auth = getAuth();
    let userRecord;
    let created = false;
    try {
      userRecord = await auth.getUserByEmail(email);
      if (userRecord.uid === SUPER_ADMIN_UID) throw new HttpsError('invalid-argument', 'That email is the Koop admin account.');
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      if (err?.code !== 'auth/user-not-found') throw err;
      userRecord = await auth.createUser({
        email,
        displayName: name || undefined,
        password: randomBytes(24).toString('base64url'),
        emailVerified: false,
      });
      created = true;
    }

    await db.collection('roles_koop_team').doc(email).set({
      userName: name || userRecord.displayName || email,
      email,
      uid: userRecord.uid,
      addedBy: request.auth?.token.email || null,
      assignedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const resetLink = await auth.generatePasswordResetLink(email);
    return { uid: userRecord.uid, created, email, resetLink };
  } catch (err: any) {
    logger.error("createKoopTeamLogin Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to create the Koop team login.');
  }
});

/**
 * generateKoopTeamResetLink
 * Koop admin gets a fresh password link for an existing Koop team member.
 */
export const generateKoopTeamResetLink = onCall({ region: 'us-central1' }, async (request) => {
  try {
    assertSuperAdmin(request);
    const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');

    const roleSnap = await db.collection('roles_koop_team').doc(email).get();
    if (!roleSnap.exists) throw new HttpsError('failed-precondition', 'That email is not a Koop team login.');

    const resetLink = await getAuth().generatePasswordResetLink(email);
    return { email, resetLink };
  } catch (err: any) {
    logger.error("generateKoopTeamResetLink Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to create a reset link.');
  }
});

/**
 * removeKoopTeamLogin
 * Takes a person off the Koop team right away: their entry is deleted, so the rules and functions stop
 * recognizing them, and their sessions are revoked so a page they have open is signed out too. The
 * sign-in account itself is kept (adding them again switches them back on).
 */
export const removeKoopTeamLogin = onCall({ region: 'us-central1' }, async (request) => {
  try {
    assertSuperAdmin(request);
    const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');

    const roleRef = db.collection('roles_koop_team').doc(email);
    const roleSnap = await roleRef.get();
    if (!roleSnap.exists) throw new HttpsError('not-found', 'That email is not a Koop team login.');

    await roleRef.delete();
    const uid = roleSnap.data()?.uid;
    if (uid && uid !== SUPER_ADMIN_UID) {
      const auth = getAuth();
      await auth.revokeRefreshTokens(uid).catch(() => {});
    }
    return { email, removed: true };
  } catch (err: any) {
    logger.error("removeKoopTeamLogin Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Failed to remove the Koop team login.');
  }
});

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
    // Stripe has to have approved the venue's account (payouts enabled) before a card is charged for it.
    const venueRecordSnap = await db.collection('venues').doc(sellerId).get();
    if (!canTakeCardPayments({ stripeAccountId: venueStripeAccountId, payoutsEnabled: venueRecordSnap.data()?.payoutsEnabled })) {
      throw new HttpsError('failed-precondition', 'This venue is not ready to take card payments yet.');
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

    const koopStripeFeeCoverageCents = Math.round(venueRecordSnap.data()?.solutionFeeFixed ?? 0);

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
      refresh_url: `${APP_BASE_URL}/onboarding-refresh?venueId=${venueId}`,
      return_url: `${APP_BASE_URL}/onboarding-success?venueId=${venueId}`,
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
 * With no mode, items are only added to the venue's own list (availableOn
 * empty, so nothing goes live) and ones already there are left untouched;
 * the venue admin then adds them to a service mode when ready.
 * Callable by a super admin or the venue's own authorized admin.
 */
export const applyStarterItems = onCall({ region: 'us-central1' }, async (request) => {
  try {
    const { venueId, itemIds, mode } = request.data || {};
    if (!venueId) throw new HttpsError('invalid-argument', 'Missing venueId.');
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing itemIds.');
    }
    if (mode && !SERVICE_MODE_LABELS[mode]) throw new HttpsError('invalid-argument', 'Invalid mode.');
    await assertVenueAuthorized(request, venueId);

    const modeLabel: string | null = mode ? SERVICE_MODE_LABELS[mode] : null;
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
    let alreadyInCatalog = 0;

    selected.forEach((templateDoc, index) => {
      const template = templateDoc.data();
      const itemRef = itemRefs[index];
      const existing = existingById.get(itemRef.id);
      categoriesTouched.add(template.category);

      if (existing?.exists) {
        if (modeLabel) {
          batch.update(itemRef, {
            availableOn: FieldValue.arrayUnion(modeLabel),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          alreadyInCatalog++;
        }
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
          availableOn: modeLabel ? [modeLabel] : [],
          isAvailable: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    if (modeLabel && categoriesTouched.size > 0) {
      batch.set(db.collection('sellers').doc(venueId), {
        categoryVisibility: { [modeLabel]: FieldValue.arrayUnion(...Array.from(categoriesTouched)) },
      }, { merge: true });
    }

    await batch.commit();

    return { totalCreated: selected.length - alreadyInCatalog, alreadyInCatalog };
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
  // Cancels every open order and signs out all staff, so only the Koop admin may run it.
  assertSuperAdmin(request);
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
    const link = `${APP_BASE_URL}/orders/${event.params.orderId}`;
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
        const status = stripeStatusFromAccount(account);
        const batch = db.batch();
        batch.set(db.collection('sellers').doc(venueId), {
          stripeOnboardingComplete: status.stripeDetailsSubmitted,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        batch.set(db.collection('venues').doc(venueId), {
          ...status,
          stripeStatusUpdatedAt: FieldValue.serverTimestamp(),
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
 * syncOrderQueue
 * Keeps orderQueue/{orderId}: a copy of every in-progress order with only venue, service
 * mode, status and placed time. Patrons read this to see their place in line, so they never
 * need to read other patrons' orders (which hold names, phones and emails).
 */
export const syncOrderQueue = onDocumentWritten({
  document: "orders/{orderId}",
  region: 'us-central1'
}, async (event) => {
  // Works from the order as it is now, not from this event, so events handled out of order cannot leave a stale entry.
  await syncQueueEntry(db, event.params.orderId);
});

/**
 * reconcileOrderQueue
 * Safety net for orderQueue: every 15 minutes, finds any entry that is missing, left over from an order that is no
 * longer in progress, or out of date, and fixes it. A patron's place in line counts these entries, so a stale one
 * makes everyone behind it look further back than they are.
 */
export const reconcileOrderQueueSchedule = onSchedule({
  schedule: "every 15 minutes",
  region: 'us-central1',
}, async () => {
  const result = await reconcileOrderQueue(db);
  if (result.fixed > 0) logger.warn(`[reconcileOrderQueue] fixed ${result.fixed} of ${result.checked} queue entries`);
});

/**
 * recordOrderTiming
 * Writes one record per order to orderTimings/{orderId}: what the order looked like and how busy the venue
 * was when it was placed, and when each step happened. It is the history that delivery time estimates will
 * be built from, so it is written here on the server (staff phones cannot change it), holds no names, phone
 * numbers or emails, and each step time is only ever set once. Nothing the patron or staff see depends on it.
 *
 * A patron's phone updates its order about every 30 seconds with GPS; those writes are ignored straight away.
 */
export const recordOrderTiming = onDocumentWritten({
  document: "orders/{orderId}",
  region: 'us-central1'
}, async (event) => {
  try {
    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;
    if (!after || !after.sellerId) return;

    // A card order starts as a bare record from the payment webhook and is completed by the patron's browser,
    // so "placed" means the moment it has its details (service mode and items).
    const hasDetails = !!after.menuType;
    const detailsCompleted = hasDetails && !before?.menuType;
    const statusChanged = !!before && before.status !== after.status;
    const relocated = !!before && (before.deliveryHole !== after.deliveryHole || before.menuTypeLocation !== after.menuTypeLocation);
    if (!detailsCompleted && !statusChanged && !relocated) return;

    const orderId: string = event.params.orderId;
    const sellerId: string = after.sellerId;
    const ref = db.collection('orderTimings').doc(orderId);
    const eventTs = Timestamp.fromDate(event.time ? new Date(event.time) : new Date());
    const stampOr = (value: unknown) => (value instanceof Timestamp ? value : eventTs);
    const toMs = (value: any): number | null => (value && typeof value.toMillis === 'function' ? value.toMillis() : null);

    const existing = (await ref.get()).data() || {};
    const once: Record<string, unknown> = {};   // set the first time only
    let relocationIncrement = false;

    // --- placement snapshot, taken once the order has its details. An order that was already in progress before
    // this function existed has no honest snapshot (the venue has moved on), so its load and location fields
    // stay empty and it is labelled as such.
    if (existing.menuType === undefined && hasDetails && !detailsCompleted) {
      const placedMs = toMs(after.createdAt) ?? eventTs.toMillis();
      Object.assign(once, {
        sellerId,
        menuType: after.menuType,
        isDemo: isDemoSeller(sellerId),
        backfilled: false,
        placementSnapshot: false,
        placedAt: Timestamp.fromMillis(placedMs),
        ...localTimeParts(new Date(placedMs)),
        ...summarizeItems(after.items),
        paymentMethod: after.paymentMethod || null,
        relocationCount: 0,
        quotedMinMinutes: null,
        quotedMaxMinutes: null,
        quoteModelVersion: null,
      });
    } else if (existing.menuType === undefined && hasDetails) {
      const mode: string = after.menuType;
      const placedMs = toMs(after.createdAt) ?? eventTs.toMillis();
      const [venueSnap, sellerSnap, activeSnap, staffSnap] = await Promise.all([
        db.collection('venues').doc(sellerId).get(),
        db.collection('sellers').doc(sellerId).get(),
        db.collection('orders').where('sellerId', '==', sellerId).where('menuType', '==', mode).where('status', 'in', IN_PROGRESS_STATUSES).get(),
        db.collection('sellers').doc(sellerId).collection('staff').where('activeMode', '==', mode).get(),
      ]);
      const ahead = activeSnap.docs.filter(d => d.id !== orderId && (toMs(d.data().createdAt) ?? 0) <= placedMs);
      const oldestWaitingSec = ahead.reduce((max, d) => Math.max(max, Math.round((placedMs - (toMs(d.data().createdAt) ?? placedMs)) / 1000)), 0);
      const prefix = modeFlagPrefix(mode);
      const seller = sellerSnap.data() || {};
      const location = placementLocation(after);
      const local = localTimeParts(new Date(placedMs));
      Object.assign(once, {
        sellerId,
        menuType: mode,
        isDemo: isDemoSeller(sellerId, venueSnap.data()?.isDemo),
        backfilled: false,
        placementSnapshot: true,
        placedAt: Timestamp.fromMillis(placedMs),
        ...local,
        ...summarizeItems(after.items),
        paymentMethod: after.paymentMethod || null,
        ordersAhead: ahead.length,
        ordersAheadPreparing: ahead.filter(d => d.data().status !== 'Placed').length,
        oldestWaitingSec,
        staffOnShift: staffSnap.size,
        staffAvailable: staffSnap.docs.filter(d => d.data().isAvailable !== false).length,
        modePaused: prefix ? !!seller[`${prefix}PausedByStaff`] : false,
        modeThrottled: prefix ? !!seller[`${prefix}AutoThrottled`] : false,
        locationSource: location.source,
        hole: location.hole,
        placedLat: location.lat,
        placedLng: location.lng,
        relocationCount: 0,
        // Filled in later, once estimates are shown to patrons.
        quotedMinMinutes: null,
        quotedMaxMinutes: null,
        quoteModelVersion: null,
      });
    }

    // --- when each step happened, and who and where
    const staffId: string | null = after.assignedStaffId || null;
    const staffLocation = async () => {
      if (!staffId) return { lat: null, lng: null };
      const staff = (await db.collection('sellers').doc(sellerId).collection('staff').doc(staffId).get()).data();
      return { lat: roundCoord(staff?.latitude), lng: roundCoord(staff?.longitude) };
    };
    if (statusChanged) {
      switch (after.status) {
        case 'Preparing': {
          const loc = await staffLocation();
          Object.assign(once, {
            preparingAt: eventTs,
            acknowledgedAt: stampOr(after.acknowledgedAt),
            acknowledgedByStaffId: staffId,
            staffLatAtAck: loc.lat,
            staffLngAtAck: loc.lng,
          });
          break;
        }
        case 'Out for Delivery':
          Object.assign(once, {
            outForDeliveryAt: eventTs,
            preparedByStaffId: after.preparedByStaffId || before?.assignedStaffId || null,
          });
          break;
        case 'Delivered': {
          const loc = await staffLocation();
          Object.assign(once, {
            deliveredAt: stampOr(after.deliveredAt),
            deliveredByStaffId: staffId,
            staffLatAtDelivery: loc.lat,
            staffLngAtDelivery: loc.lng,
            patronLatAtDelivery: roundCoord(after.deliveryLocation?.latitude),
            patronLngAtDelivery: roundCoord(after.deliveryLocation?.longitude),
            lateAlertSent: !!after.lateAlertSentAt,
          });
          break;
        }
        case 'Cancelled':
          Object.assign(once, { cancelledAt: eventTs, cancelReason: cancelReasonOf(after) });
          break;
      }
    }
    if (relocated && existing.menuType !== undefined) relocationIncrement = true;

    await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data() || {};
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(once)) {
        if (cur[key] === undefined) patch[key] = value;
      }
      // The order's own identity, in case it was placed before this record existed.
      if (cur.sellerId === undefined && patch.sellerId === undefined) patch.sellerId = sellerId;
      if (cur.placedAt === undefined && patch.placedAt === undefined && after.createdAt instanceof Timestamp) patch.placedAt = after.createdAt;
      if (cur.isDemo === undefined && patch.isDemo === undefined) patch.isDemo = isDemoSeller(sellerId);
      if (relocationIncrement) patch.relocationCount = FieldValue.increment(1);

      // Totals, a first check on the data, and whether to leave this order out of analysis.
      if (after.status === 'Delivered' || after.status === 'Cancelled') {
        const merged: Record<string, any> = { ...cur, ...patch };
        patch.outcome = after.status;
        let suspect = !!merged.suspect;
        if (after.status === 'Delivered') {
          const times = {
            placed: toMs(merged.placedAt), acknowledged: toMs(merged.acknowledgedAt), preparing: toMs(merged.preparingAt),
            outForDelivery: toMs(merged.outForDeliveryAt), delivered: toMs(merged.deliveredAt),
          };
          const reasons = suspectReasons(times);
          suspect = reasons.length > 0;
          Object.assign(patch, computeDurations(times), { suspect, suspectReasons: reasons });
        }
        patch.excluded = isExcluded({ isDemo: merged.isDemo, cancelReason: merged.cancelReason, suspect });
      }

      if (Object.keys(patch).length > 0) tx.set(ref, patch, { merge: true });
    });
  } catch (err) {
    // Recording must never get in the way of an order.
    logger.error("recordOrderTiming failed", err);
  }
});

/**
 * refreshStripeStatus
 * Asks Stripe for a venue's current account status and saves it (card payments allowed, anything Stripe
 * still wants). The account.updated webhook normally keeps this current; this is the manual check for when
 * that is late or was never set up, and how existing venues get their status recorded the first time.
 * One venue: its own admin or the Koop admin. No venue given: every venue with a Stripe account, Koop admin only.
 */
export const refreshStripeStatus = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  timeoutSeconds: 120,
}, async (request) => {
  try {
    const venueId = typeof request.data?.venueId === 'string' ? request.data.venueId.trim() : '';
    if (venueId) await assertVenueAuthorized(request, venueId);
    else await assertKoopAdmin(request);

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');
    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    const venueDocs = venueId
      ? [await db.collection('venues').doc(venueId).get()]
      : (await db.collection('venues').get()).docs;

    let checked = 0;
    const failed: { venueId: string; message: string }[] = [];
    for (const venueDoc of venueDocs) {
      const accountId = venueDoc.data()?.stripeAccountId;
      if (!venueDoc.exists || !accountId) continue;
      try {
        const account = await stripe.accounts.retrieve(accountId);
        await venueDoc.ref.set({
          ...stripeStatusFromAccount(account),
          stripeStatusUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        checked++;
      } catch (err: any) {
        failed.push({ venueId: venueDoc.id, message: err?.message || 'Could not reach Stripe.' });
      }
    }
    return { checked, failed };
  } catch (err: any) {
    logger.error("refreshStripeStatus Error", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err.message || 'Could not check Stripe.');
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
