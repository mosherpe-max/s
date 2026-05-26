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
 * 
 * invoker: "public" - This is critical. It allows the browser's unauthenticated 
 * preflight (OPTIONS) handshake to reach the function.
 */
export const createStripeConnectAccount = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  invoker: 'public',
  maxInstances: 10,
}, async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    logger.error("Unauthorized attempt: No auth context found.");
    throw new HttpsError("unauthenticated", "User must be logged in to initialize Stripe.");
  }

  const { venueId } = request.data;
  if (!venueId) {
    logger.error("Missing venueId in request data");
    throw new HttpsError("invalid-argument", "Missing required field: venueId.");
  }

  // 2. Secret Key Retrieval
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logger.error("STRIPE_SECRET_KEY is missing from environment.");
    throw new HttpsError("failed-precondition", "System configuration error: Missing Stripe API Key.");
  }

  const stripe = new Stripe(secretKey);

  try {
    // 3. Ownership Verification
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      logger.error(`Venue [${venueId}] not found in registry.`);
      throw new HttpsError("not-found", `Venue record [${venueId}] not found in registry.`);
    }

    const venueData = venueDoc.data();
    if (venueData?.ownerUid !== request.auth.uid) {
      logger.error(`Permission denied for user ${request.auth.uid} on venue ${venueId}`);
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
        metadata: { venueId, ownerUid: request.auth.uid }
      });
      stripeAccountId = account.id;

      // Update registry
      await venueRef.update({
        stripeAccountId,
        stripeOnboardingComplete: false,
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Generate Onboarding Link
    // Default origin for local dev, will be overridden by header if present
    let origin = 'http://localhost:9002';
    const headerOrigin = request.rawRequest?.headers?.origin;
    if (headerOrigin) {
      origin = typeof headerOrigin === 'string' ? headerOrigin : headerOrigin[0];
    }
    
    logger.info(`Generating setup link for ${stripeAccountId} with origin ${origin}`);
    
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/onboarding-refresh?venueId=${venueId}`,
      return_url: `${origin}/onboarding-success?venueId=${venueId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };

  } catch (error: any) {
    logger.error("Stripe Onboarding Logic Error:", {
      message: error.message,
      code: error.code
    });
    
    if (error instanceof HttpsError) throw error;
    
    throw new HttpsError("internal", error.message || "Failed to initialize the onboarding session.");
  }
});

/**
 * testFunction
 * Minimal health check to verify deployment connectivity.
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true,
  invoker: 'public'
}, (request) => {
  return { 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    project: process.env.GCLOUD_PROJECT || "unknown"
  };
});
