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
    throw new HttpsError("failed-precondition", "System configuration error: Missing Stripe API Key in Firebase Console.");
  }

  const stripe = new Stripe(secretKey);

  try {
    // 3. Ownership Verification
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      logger.error(`Venue [${venueId}] not found in registry.`);
      throw new HttpsError("not-found", `Venue record [${venueId}] not found in registry. Please initialize it in the admin panel.`);
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
 * createPaymentIntent
 * Initializes a Stripe PaymentIntent for a patron order, directed to the venue's Express account.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
  cors: true,
  invoker: 'public',
  maxInstances: 10,
}, async (request) => {
  // Log request context for debugging
  logger.info("createPaymentIntent invoked", { 
    data: request.data, 
    auth: request.auth?.uid || 'anonymous' 
  });

  // Allow anonymous patrons to pay
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be identified (anonymous is OK) to place an order.");
  }

  const { amount, sellerId } = request.data;
  if (!amount || typeof amount !== 'number' || amount <= 0 || !sellerId) {
    throw new HttpsError("invalid-argument", "Transaction failed: Missing or invalid amount/venue identifier.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'REPLACE_ME') {
    logger.error("CRITICAL: STRIPE_SECRET_KEY is missing or unconfigured.");
    throw new HttpsError("failed-precondition", "Platform Configuration Error: The payment gateway is not configured. Please add the STRIPE_SECRET_KEY to your functions environment.");
  }

  const stripe = new Stripe(secretKey);

  try {
    // 1. Fetch Venue Stripe Identity from Registry
    const venueRef = db.collection('venues').doc(sellerId);
    const venueDoc = await venueRef.get();
    
    if (!venueDoc.exists) {
      logger.error(`Venue document missing for sellerId: ${sellerId}`);
      throw new HttpsError("not-found", `Venue registry missing for "${sellerId}". Please visit the venue admin panel and click "Initialize Registry" under Payments.`);
    }

    const venueData = venueDoc.data();
    const stripeAccountId = venueData?.stripeAccountId;

    if (!stripeAccountId) {
      logger.error(`Stripe Account ID missing for venue: ${sellerId}`);
      throw new HttpsError("failed-precondition", `Payment blocked: The venue "${venueData?.name || sellerId}" has not connected a Stripe Express account.`);
    }

    // 2. Create PaymentIntent (Destination Charge)
    // Captures funds and routes them to the venue's connected account
    logger.info(`Creating PaymentIntent for ${amount} to account ${stripeAccountId}`);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
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
    logger.error("Stripe Transaction Handshake Error:", {
      message: error.message,
      type: error.type,
      code: error.code
    });
    
    // Preserve specific HttpsErrors thrown in the logic above
    if (error instanceof HttpsError) throw error;
    
    // Wrap Stripe-specific errors in a descriptive HttpsError for the frontend
    const userMessage = error.type === 'StripeInvalidRequestError' 
      ? `Stripe rejected the request: ${error.message}`
      : "The payment server encountered an error during processing.";

    throw new HttpsError("aborted", userMessage);
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
