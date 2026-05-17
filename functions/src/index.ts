import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";

/**
 * Initialize the Firebase Admin SDK.
 * ESM requires initializeApp to be called at the entry point for v2 callables.
 */
initializeApp();

/**
 * testFunction
 * Minimal v2 callable function to verify ESM environment health.
 * Region: us-central1
 */
export const testFunction = onCall({ 
  cors: true,
  region: 'us-central1'
}, (request) => {
  logger.info("testFunction called");
  
  return { 
    success: true, 
    message: "Functions working",
    timestamp: new Date().toISOString(),
    env: "esm-v2"
  };
});
