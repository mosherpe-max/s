import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin once at the top level
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lightweight heartbeat to verify Cloud Function runtime availability.
 * This function does NOT access Firestore or external APIs.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Cloud Function runtime is operational.'
  };
});

/**
 * Generates a Stripe Connect OAuth URL for a specific venue.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  console.log('[ST-INFO] Onboarding request received:', request.data);

  if (!request.data) {
    throw new HttpsError('invalid-argument', 'Request data is missing.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId || !origin) {
    throw new HttpsError('invalid-argument', 'Venue ID and Origin URL are required.');
  }

  try {
    const configDoc = await db.doc('config/platform_private').get();
    
    if (!configDoc.exists) {
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials are not configured in Firestore.');
    }

    const config = configDoc.data();
    const secretKey = config?.stripeSecretKey?.trim();
    const clientId = config?.stripeClientId?.trim();

    if (!secretKey || !clientId) {
      throw new HttpsError('failed-precondition', 'Stripe configuration is incomplete in the Credential Vault.');
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const redirect_uri = `${origin}/onboarding-success`;

    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: clientId,
      response_type: 'code',
      scope: 'read_write',
      state: sellerId,
      redirect_uri: redirect_uri,
    });

    return { url: onboardingUrl };

  } catch (error: any) {
    console.error('[ST-OAUTH-CRASH]', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', `Backend Error: ${error.message || 'Unknown error'}`);
  }
});

/**
 * Diagnostic function to verify Firestore connectivity.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  try {
    // Attempt a lightweight read to verify Firestore connection
    await db.collection('config').limit(1).get();
    
    return { 
      success: true, 
      status: 'Online',
      timestamp: Date.now()
    };
  } catch (e: any) {
    console.error('[ST-DIAG-FAIL]', e);
    throw new HttpsError('internal', `Firestore Unreachable: ${e.message}`);
  }
});
