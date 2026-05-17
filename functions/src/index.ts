import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";

/**
 * Initialize the Firebase Admin SDK.
 * Checking getApps() ensures we don't attempt to re-initialize during instance reuse,
 * which can sometimes trigger internal state errors in ESM environments.
 */
if (getApps().length === 0) {
  initializeApp();
}

/**
 * testFunction
 * Minimal v2 callable function to verify ESM environment health.
 * Region: us-central1
 */
export const testFunction = onCall({ 
  cors: true,
  region: 'us-central1',
  maxInstances: 10
}, (request) => {
  logger.info("testFunction execution started", { data: request.data });
  
  return { 
    success: true, 
    message: "Functions working",
    timestamp: new Date().toISOString(),
    env: "esm-node20-verified"
  };
});
