import { onCall } from "firebase-functions/v2/https";

/**
 * testFunction
 * Minimal v2 callable function to verify environment health.
 */
export const testFunction = onCall({ 
  cors: true,
  region: 'us-central1'
}, (request) => {
  // Returns immediate static response with no dependencies
  return { 
    success: true, 
    message: "Functions working" 
  };
});
