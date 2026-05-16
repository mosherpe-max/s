import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

/**
 * testFunction
 * Minimal v2 callable function to verify environment health.
 * Region: us-central1
 */
export const testFunction = onCall({ 
  cors: true,
  region: 'us-central1'
}, (request) => {
  logger.info("testFunction called", { auth: request.auth?.uid });
  
  // Returns immediate static response with no dependencies
  return { 
    success: true, 
    message: "Functions working",
    timestamp: new Date().toISOString()
  };
});
