
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Initialize Firebase Admin once.
 */
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * systemHeartbeat
 * Minimal function to verify that the Cloud Function runtime is online.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] systemHeartbeat invoked');
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Runtime Operational'
  };
});

/**
 * pingPlatform
 * Diagnostic function to verify that the backend can reach Firestore.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] pingPlatform invoked');
  try {
    const configSnap = await db.doc('config/platform').get();
    
    return { 
      success: true, 
      status: 'Connected',
      firestoreReachable: true,
      timestamp: Date.now()
    };
  } catch (e: any) {
    logger.error('[KOOP-ERROR] Firestore unreachable', e);
    throw new HttpsError('internal', `Database Connectivity Failure: ${e.message}`);
  }
});
