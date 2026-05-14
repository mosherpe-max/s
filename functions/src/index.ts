import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Standard initialization for Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generates a Stripe Connect OAuth URL for a specific venue.
 * Expects { sellerId: string, origin: string } in request data.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  // Defensive check for request data
  if (!request.data) {
    throw new HttpsError('invalid-argument', 'Request data is missing.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'The function must be called with a valid sellerId.');
  }

  if (!origin) {
    throw new HttpsError('invalid-argument', 'The origin is required to construct the redirect URI.');
  }

  try {
    // 1. Fetch Platform Secrets from Firestore
    const configDoc = await db.doc('config/platform_private').get();
    
    if (!configDoc.exists) {
      console.error('[ST-ERR] config/platform_private document does not exist');
      throw new HttpsError('failed-precondition', 'Platform credentials have not been configured in the Admin Vault.');
    }

    const config = configDoc.data();

    if (!config?.stripeSecretKey || !config?.stripeClientId) {
      console.error('[ST-ERR] Missing required fields in config/platform_private');
      throw new HttpsError('failed-precondition', 'Stripe Secret Key or Client ID is missing from the configuration.');
    }

    // 2. Initialize Stripe
    const stripe = new Stripe(config.stripeSecretKey.trim(), {
      apiVersion: '2023-10-16' as any,
    });

    // 3. Generate the OAuth URL
    // The redirect_uri MUST be registered in the Stripe Dashboard > Connect > Settings
    const redirect_uri = `${origin}/onboarding-success`;

    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: config.stripeClientId.trim(),
      response_type: 'code',
      scope: 'read_write',
      state: sellerId,
      redirect_uri: redirect_uri,
    });

    console.log(`[ST-INFO] Successfully generated onboarding URL for seller: ${sellerId}`);
    return { url: onboardingUrl };

  } catch (error: any) {
    console.error('[ST-OAUTH-ERR]', error);
    
    // Pass through HttpsErrors we explicitly threw
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // For Stripe API errors or other unexpected failures, wrap in HttpsError
    throw new HttpsError('internal', error.message || 'An unexpected error occurred while generating the onboarding link.');
  }
});

/**
 * Lightweight diagnostic function to verify backend availability.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async () => {
  return { 
    success: true, 
    timestamp: Date.now(),
    region: 'us-central1'
  };
});
