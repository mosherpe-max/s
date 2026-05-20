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
    throw new HttpsError("unauthenticated", "User must be logged in to initialize Stripe.");
  }

  const { venueId } = request.data as { venueId: string };
  if (!venueId) {
    throw new HttpsError("invalid-argument", "Missing target venueId.");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia',
  });

  try {
    // 2. Ownership Verification
    const venueRef = db.collection('venues').doc(venueId);
    const venueDoc = await venueRef.get();

    if (!venueDoc.exists) {
      throw new HttpsError("not-found", "Venue registry not found.");
    }

    const venueData = venueDoc.data();
    if (venueData?.ownerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Unauthorized venue management attempt.");
    }

    let stripeAccountId = venueData.stripeAccountId;

    // 3. Provision Stripe Account if missing
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

      // 4. Atomic Firestore Update
      await venueRef.update({ 
        stripeAccountId,
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Generate Onboarding Link
    const origin = request.rawRequest.headers.origin || 'https://kooporders.com';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/onboarding-refresh`,
      return_url: `${origin}/onboarding-success`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: any) {
    logger.error("Stripe onboarding error:", error);
    throw new HttpsError("internal", error.message || "Failed to initialize onboarding.");
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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia',
  });

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    // 1. Signature Verification
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // 2. Handle specific event type
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    
    // 3. Check for submission completion
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
