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
 * Initializes a Stripe PaymentIntent with a Patron-paid convenience fee and Koop coverage.
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
    // 1. Fetch Venue Registry for routing and fee policy
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

    // 2. Fetch Fee Configuration from Registry
    // patronConvenienceFee: amount charged to patron (e.g. 150 cents)
    // platformFeeFixed: Koop's "fee coverage" coverage (e.g. 20 cents)
    const patronConvenienceFee = venueData?.patronConvenienceFee ?? 150; 
    const platformFeeFixed = venueData?.platformFeeFixed ?? 20;

    // 3. Calculate Final Stripe Values
    // Total Charge = Items/Tax/Tip + Convenience Fee
    const baseAmountInCents = Math.round(amount * 100);
    const totalChargeAmount = baseAmountInCents + patronConvenienceFee;
    
    // Application Fee (Koop's Cut) = Convenience Fee - Fee Subsidy
    const applicationFeeAmount = Math.max(0, patronConvenienceFee - platformFeeFixed);

    // 4. Create the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeAmount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
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
