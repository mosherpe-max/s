import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

/**
 * Initialize Firebase Admin once.
 * Using a global check to prevent multiple initialization errors.
 */
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * systemHeartbeat
 * Minimal function to verify that the Cloud Function runtime is online.
 * Does not access any external services.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[ST-LOG] systemHeartbeat invoked');
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
  logger.info('[ST-LOG] pingPlatform invoked');
  try {
    // Attempt a lightweight read from the public config
    const configSnap = await db.doc('config/platform').get();
    
    return { 
      success: true, 
      status: 'Connected',
      databasePath: 'config/platform',
      exists: configSnap.exists
    };
  } catch (e: any) {
    logger.error('[ST-ERROR] Firestore unreachable', e);
    throw new HttpsError('internal', `Database Connectivity Failure: ${e.message}`);
  }
});

/**
 * generateStripeOnboardingUrl
 * Retrieves platform secrets from Firestore and generates a Stripe OAuth URL.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[ST-LOG] generateStripeOnboardingUrl invoked');

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to initialize onboarding.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId || !origin) {
    throw new HttpsError('invalid-argument', 'Venue ID and Origin URL are required.');
  }

  try {
    // Fetch Platform Secrets from the Vault
    // Note: The frontend saves to 'config/platform_private'
    const vaultDoc = await db.doc('config/platform_private').get();
    
    if (!vaultDoc.exists) {
      logger.error('[ST-ERROR] Platform secrets missing in Vault');
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials (SK/Client ID) are not configured in the Admin Vault.');
    }

    const secrets = vaultDoc.data();
    const secretKey = secrets?.stripeSecretKey?.trim();
    const clientId = secrets?.stripeClientId?.trim();

    if (!secretKey || !clientId) {
      logger.error('[ST-ERROR] Malformed secrets in Vault');
      throw new HttpsError('failed-precondition', 'Stripe configuration is incomplete. Please check your Secret Key and Client ID.');
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // The URL Stripe will send the user back to after onboarding
    const redirect_uri = `${origin}/onboarding-success`;

    // Generate the standard OAuth URL
    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: clientId,
      response_type: 'code',
      scope: 'read_write',
      state: sellerId, // Pass sellerId through to the success page
      redirect_uri: redirect_uri,
    });

    return { url: onboardingUrl };

  } catch (error: any) {
    logger.error('[ST-CRASH]', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', `Onboarding Engine Error: ${error.message || 'Unknown failure'}`);
  }
});
