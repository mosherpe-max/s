import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Generates a Stripe Connect OAuth URL for a specific venue.
 * Expects { sellerId: string, origin: string } in request data.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  const { sellerId, origin } = request.data;

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'The function must be called with a valid sellerId.');
  }

  if (!origin) {
    throw new HttpsError('invalid-argument', 'The origin is required to construct the redirect URI.');
  }

  try {
    // 1. Fetch Platform Secrets from Firestore
    // Using admin SDK to bypass security rules
    const configDoc = await admin.firestore().doc('config/platform_private').get();
    const config = configDoc.data();

    if (!config || !config.stripeSecretKey || !config.stripeClientId) {
      console.error('[ST-ERR] Missing configuration in config/platform_private');
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials (Secret Key or Client ID) are not configured in the Admin Vault.');
    }

    const stripe = new Stripe(config.stripeSecretKey.trim(), {
      apiVersion: '2023-10-16' as any,
    });

    // 2. Generate the OAuth URL
    // We encode the sellerId in 'state' so we know which venue just connected
    // The redirect_uri MUST be registered in the Stripe Dashboard > Connect > Settings
    const redirect_uri = `${origin}/onboarding-success`;

    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: config.stripeClientId.trim(),
      response_type: 'code',
      scope: 'read_write',
      state: sellerId,
      redirect_uri: redirect_uri,
    });

    console.log(`[ST-INFO] Generated onboarding URL for seller: ${sellerId} with redirect: ${redirect_uri}`);
    return { url: onboardingUrl };

  } catch (error: any) {
    console.error('[ST-OAUTH-ERR]', error);
    
    // If it's already an HttpsError we threw, rethrow it
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', error.message || 'Failed to generate onboarding URL. Check platform logs.');
  }
});

export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { success: true, timestamp: Date.now() };
});
