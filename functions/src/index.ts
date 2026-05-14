import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Placeholder for future platform functions.
 * All Stripe related diagnostic logic has been removed.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { success: true, timestamp: Date.now() };
});
