import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import Stripe from 'stripe';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();

/**
 * testFunction
 * Strictly minimal v2 callable to isolate environment health.
 * Now includes a verification check for the Stripe SDK (Step 1).
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true
}, (request) => {
  logger.info("Health check execution started");
  
  // Verify Stripe SDK availability
  const stripeAvailable = typeof Stripe !== 'undefined';
  
  return { 
    success: true, 
    message: "Cloud environment is stable",
    stripeStatus: stripeAvailable ? "SDK Detected" : "SDK Missing",
    timestamp: new Date().toISOString()
  };
});