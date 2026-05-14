import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generates a Stripe Connect OAuth URL for a specific venue.
 * Expects { sellerId: string } in request data.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  const sellerId = request.data.sellerId;

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'The function must be called with a valid sellerId.');
  }

  try {
    // 1. Fetch Platform Secrets from Firestore
    const configDoc = await admin.firestore().doc('config/platform_private').get();
    const config = configDoc.data();

    if (!config || !config.stripeSecretKey || !config.stripeClientId) {
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials (Secret Key or Client ID) are not configured.');
    }

    const stripe = new Stripe(config.stripeSecretKey.trim(), {
      apiVersion: '2023-10-16' as any,
    });

    // 2. Generate the OAuth URL
    // We use 'state' to pass the sellerId back to our success page
    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: config.stripeClientId.trim(),
      response_type: 'code',
      scope: 'read_write',
      state: sellerId,
      // Note: This redirect_uri MUST be registered in your Stripe Dashboard > Settings > Connect > Settings
      redirect_uri: `${request.instanceIdToken ? 'http://localhost:9002' : 'https://' + request.rawRequest.hostname}/onboarding-success`,
    });

    return { url: onboardingUrl };

  } catch (error: any) {
    console.error('[ST-OAUTH-ERR]', error);
    throw new HttpsError('internal', error.message || 'Failed to generate onboarding URL');
  }
});

export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { success: true, timestamp: Date.now() };
});
