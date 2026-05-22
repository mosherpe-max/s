
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
  // Ensure the secret is set via: firebase functions:secrets:set STRIPE_SECRET_KEY
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1'
}, async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    logger.error("Unauthorized attempt: No auth context found.");
    throw new HttpsError("unauthenticated", "User must be logged in to initialize Stripe.");
  }

  const { venueId } = request.data;
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing target venueId.");
  }

  // 2. Secret Key Check
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logger.error("STRIPE_SECRET_KEY is not defined in environment.");
    throw new HttpsError("failed-precondition", "System configuration error: Missing Stripe key.");
  }

  const stripe = new Stripe(secretKey);

  try {
    // 3. Ownership Verification
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      throw new HttpsError("not-found", "Venue registry not found.");
    }

    const venueData = venueDoc.data();
    if (venueData?.ownerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "You do not have permission to manage this venue.");
    }

    let stripeAccountId = venueData?.stripeAccountId;

    // 4. Provision Stripe Account if missing
    if (!stripeAccountId) {
      logger.info(`Creating new Stripe Express account for venue: ${venueId}`);
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { venueId }
      });
      stripeAccountId = account.id;

      // Save the ID immediately to Firestore
      await venueRef.update({
        stripeAccountId,
        stripeOnboardingComplete: false,
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Generate Onboarding Link
    // In production, Firebase Functions can't reliably detect the origin of a callable,
    // so we use a fallback to localhost for your testing, but this should be your real domain in prod.
    const origin = request.rawRequest.headers.origin || 'http://localhost:9002';
    
    logger.info(`Generating account link for ${stripeAccountId} with origin ${origin}`);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/onboarding-refresh?venueId=${venueId}`,
      return_url: `${origin}/onboarding-success?venueId=${venueId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };

  } catch (error: any) {
    logger.error("Stripe onboarding error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to initialize onboarding.");
  }
});

/**
 * testFunction
 * Minimal health check for deployment verification.
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true
}, (request) => {
  return { 
    success: true, 
    message: "Cloud environment is stable",
    timestamp: new Date().toISOString()
  };
});
