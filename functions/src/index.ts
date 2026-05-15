
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

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
      exists: configSnap.exists
    };
  } catch (e: any) {
    logger.error('[KOOP-ERROR] Firestore unreachable', e);
    throw new HttpsError('internal', `Database Connectivity Failure: ${e.message}`);
  }
});

/**
 * generateStripeOnboardingUrl
 * Retrieves platform secrets from Firestore and generates a Stripe OAuth URL.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] generateStripeOnboardingUrl invoked', { data: request.data });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to initialize onboarding.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId || !origin) {
    throw new HttpsError('invalid-argument', 'Venue ID and Origin URL are required.');
  }

  try {
    // Fetch Platform Secrets from the Vault
    const vaultDoc = await db.doc('config/platform_private').get();
    
    if (!vaultDoc.exists) {
      logger.error('[KOOP-ERROR] Vault not found at config/platform_private');
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials (SK/Client ID) are not configured in the Admin Vault.');
    }

    const secrets = vaultDoc.data();
    const secretKey = secrets?.stripeSecretKey?.trim();
    const clientId = secrets?.stripeClientId?.trim();

    if (!secretKey || !clientId) {
      logger.error('[KOOP-ERROR] Malformed secrets in Vault', { hasSk: !!secretKey, hasCi: !!clientId });
      throw new HttpsError('failed-precondition', 'Stripe configuration is incomplete. Please check your Secret Key and Client ID in KOOP Admin.');
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

    logger.info('[KOOP-SUCCESS] Onboarding URL generated');
    return { url: onboardingUrl };

  } catch (error: any) {
    logger.error('[KOOP-CRASH]', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Onboarding Engine Error: ${error.message || 'Unknown failure'}`);
  }
});
