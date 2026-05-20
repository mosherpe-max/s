import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
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
 * initializeVenueStripeOnboarding
 * Securely provisions a Stripe Connect Express account and returns an onboarding link.
 */
export const initializeVenueStripeOnboarding = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1'
}, async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    logger.error("Unauthorized attempt: No auth context found.");
    throw new HttpsError("unauthenticated", "User must be logged in to initialize Stripe.");
  }

  const { venueId } = request.data as { venueId: string };
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing target venueId.");
  }

  // 2. Ensure secret is available
  // In the cloud, this is populated from Secrets Manager. In emulator, from .env.
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logger.error("STRIPE_SECRET_KEY is not defined in environment.");
    throw new HttpsError("failed-precondition", "System configuration error: Stripe Secret Key is missing in Cloud Secrets.");
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });

  try {
    // 3. Ownership Verification
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      logger.error(`Venue document missing for ID: ${venueId}`);
      throw new HttpsError("not-found", "Venue registry not found. Please register the venue first.");
    }

    const venueData = venueDoc.data();
    
    // Strict ownership validation
    if (venueData?.ownerUid !== request.auth.uid) {
      logger.error(`Ownership mismatch. Registry owner: ${venueData?.ownerUid}, Requester: ${request.auth.uid}`);
      throw new HttpsError("permission-denied", "You are not authorized to manage the payment settings for this venue.");
    }

    let stripeAccountId = venueData?.stripeAccountId;

    // 4. Provision Stripe Account if missing
    if (!stripeAccountId) {
      logger.info(`Creating new Stripe Express account for venue: ${venueId}`);
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { venueId }
        });
        stripeAccountId = account.id;

        // Atomic Firestore Update
        await venueRef.update({ 
          stripeAccountId,
          updatedAt: new Date().toISOString()
        });
      } catch (stripeErr: any) {
        logger.error("Stripe Account Creation Failed:", stripeErr);
        throw new HttpsError("internal", `Stripe Error: ${stripeErr.message}`);
      }
    }

    // 5. Generate Onboarding Link
    // Safely extract origin for redirects
    let origin = 'https://kooporders.com'; // Default production fallback
    if (request.rawRequest && request.rawRequest.headers && request.rawRequest.headers.origin) {
      origin = request.rawRequest.headers.origin as string;
    } else if (process.env.FUNCTIONS_EMULATOR) {
      origin = 'http://localhost:9002';
    }
    
    logger.info(`Generating account link for ${stripeAccountId} with origin ${origin}`);
    
    try {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/onboarding-refresh`,
        return_url: `${origin}/onboarding-success`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url };
    } catch (linkErr: any) {
      logger.error("Stripe Account Link Generation Failed:", linkErr);
      throw new HttpsError("internal", `Link Error: ${linkErr.message}`);
    }
  } catch (error: any) {
    logger.error("Stripe onboarding process crashed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to initialize onboarding flow.");
  }
});

/**
 * handleStripeWebhookEvents
 * Unauthenticated HTTP endpoint to listen for account status updates from Stripe.
 */
export const handleStripeWebhookEvents = onRequest({
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  region: 'us-central1'
}, async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    logger.error("Missing Stripe secrets for webhook.");
    res.status(500).send("Configuration Error");
    return;
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  });

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig!,
      webhookSecret
    );
  } catch (err: any) {
    logger.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle specific event type
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    
    // Check for submission completion
    if (account.details_submitted) {
      const stripeAccountId = account.id;
      logger.info(`Stripe account verified: ${stripeAccountId}`);

      try {
        const venuesQuery = await db.collection('venues')
          .where('stripeAccountId', '==', stripeAccountId)
          .limit(1)
          .get();

        if (!venuesQuery.empty) {
          const venueDoc = venuesQuery.docs[0];
          await venueDoc.ref.update({
            stripeConnectVerified: true,
            updatedAt: new Date().toISOString()
          });
          logger.info(`Venue ${venueDoc.id} activated in registry.`);
        }
      } catch (dbErr) {
        logger.error("Database update failed during webhook:", dbErr);
      }
    }
  }

  res.json({ received: true });
});

/**
 * testFunction
 * Strictly minimal v2 callable to isolate environment health.
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true
}, (request) => {
  logger.info("Health check execution started");
  const stripeAvailable = typeof Stripe !== 'undefined';
  return { 
    success: true, 
    message: "Cloud environment is stable",
    stripeStatus: stripeAvailable ? "SDK Detected" : "SDK Missing",
    timestamp: new Date().toISOString()
  };
});
