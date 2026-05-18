import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();

// Define the Stripe Secret Key as a secure parameter.
// User must run: firebase functions:secrets:set STRIPE_SECRET_KEY
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");

/**
 * createPaymentIntent
 * Minimal Phase 1 implementation to generate a Stripe client_secret.
 */
export const createPaymentIntent = onCall({
  region: 'us-central1',
  secrets: [stripeSecret],
  cors: true
}, async (request) => {
  logger.info("createPaymentIntent started", { amount: request.data.amount });

  const { amount } = request.data;

  // Basic validation (Stripe amounts are in cents, min $0.50)
  if (!amount || typeof amount !== 'number' || amount < 50) {
    throw new HttpsError('invalid-argument', 'The amount must be at least 50 cents.');
  }

  try {
    const stripe = new Stripe(stripeSecret.value());

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        platform: 'KOOP',
        phase: '1'
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  } catch (error: any) {
    logger.error("Stripe PaymentIntent creation failed", error);
    throw new HttpsError('internal', error.message || 'Payment initiation failed');
  }
});

/**
 * testFunction
 * Strictly minimal v2 callable to isolate environment health.
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true
}, (request) => {
  logger.info("testFunction execution started");
  
  return { 
    success: true, 
    message: "Functions working",
    timestamp: new Date().toISOString()
  };
});
