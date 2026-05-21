import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();

/**
 * testFunction
 * Strictly minimal v2 callable to isolate environment health.
 */
export const testFunction = onCall({ 
  region: 'us-central1',
  cors: true
}, (request) => {
  logger.info("Health check execution started");
  return { 
    success: true, 
    message: "Cloud environment is stable",
    timestamp: new Date().toISOString()
  };
});
