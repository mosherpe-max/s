import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from 'stripe';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();

/**
 * createStripeConnectAccount
 * Securely provisions a Stripe Connect Express account and returns an onboarding link.
 */
export const createStripeConnectAccount = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  invoker: 'public',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const { venueId } = request.data;
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing required field: venueId.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'REPLACE_ME') {
    throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY is missing from environment.", { source: 'config' });
  }

  const stripe = new Stripe(secretKey);

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

    let stripeAccountId = venueData?.stripeAccountId;

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
 * Initializes a Stripe PaymentIntent for a patron order.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  invoker: 'public',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { amount, sellerId } = request.data;
  if (!amount || !sellerId) {
    throw new HttpsError("invalid-argument", "Amount and sellerId are required.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'REPLACE_ME') {
    throw new HttpsError("failed-precondition", "Stripe Secret Key is not configured in the Firebase Console.", { source: 'system_config' });
  }

  const stripe = new Stripe(secretKey);

  try {
    const venueRef = db.collection('venues').doc(sellerId);
    const venueDoc = await venueRef.get();
    
    if (!venueDoc.exists) {
      throw new HttpsError("not-found", `Registry document missing for venue: ${sellerId}. Click "Initialize Registry" in the admin panel.`, { sellerId });
    }

    const stripeAccountId = venueDoc.data()?.stripeAccountId;
    if (!stripeAccountId) {
      throw new HttpsError("failed-precondition", `Stripe Account ID is missing for venue: ${sellerId}.`, { sellerId });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: stripeAccountId,
      },
      metadata: {
        sellerId,
        buyerUid: request.auth.uid
      }
    });

    return { clientSecret: paymentIntent.client_secret };

  } catch (error: any) {
    logger.error("createPaymentIntent Error:", error);
    // Explicitly pass through the Stripe error message
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
  invoker: 'public',
  maxInstances: 10,
}, async (request) => {
  const { venueId } = request.data;
  if (!venueId) throw new HttpsError("invalid-argument", "venueId required.");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY missing.");

  const stripe = new Stripe(secretKey);

  try {
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) throw new HttpsError("not-found", `Venue [${venueId}] not in Firestore.`);

    const stripeAccountId = venueDoc.data()?.stripeAccountId;
    if (!stripeAccountId) throw new HttpsError("failed-precondition", "stripeAccountId field missing.");

    const account = await stripe.accounts.retrieve(stripeAccountId);

    return {
      id: account.id,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || 'Unnamed Business',
      capabilities: account.capabilities,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      status: (account.charges_enabled && account.payouts_enabled) ? 'Ready' : 'Restricted'
    };

  } catch (error: any) {
    logger.error("verifyVenueConnection Error:", error);
    throw new HttpsError("internal", error.message || "Stripe API retrieval failed", { details: error.message });
  }
});

/**
 * Health Check
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true,
  invoker: 'public'
}, (request) => {
  return { status: "healthy", timestamp: new Date().toISOString() };
});
