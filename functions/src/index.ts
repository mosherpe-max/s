import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin once at the top level
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Generates a Stripe Connect OAuth URL for a specific venue.
 * Expects { sellerId: string, origin: string } in request data.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  console.log('[ST-INFO] Onboarding request received:', request.data);

  // 1. Validate Input
  if (!request.data) {
    throw new HttpsError('invalid-argument', 'Request data is missing.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'Venue ID (sellerId) is required.');
  }

  if (!origin) {
    throw new HttpsError('invalid-argument', 'The origin URL is required for the redirect handshake.');
  }

  try {
    // 2. Fetch Platform Secrets from Firestore
    const configDoc = await db.doc('config/platform_private').get();
    
    if (!configDoc.exists) {
      console.error('[ST-ERR] config/platform_private document does not exist');
      throw new HttpsError('failed-precondition', 'Platform credentials (Stripe Secret Key/Client ID) have not been configured in the Admin Vault.');
    }

    const config = configDoc.data();
    const secretKey = config?.stripeSecretKey?.trim();
    const clientId = config?.stripeClientId?.trim();

    if (!secretKey || !clientId) {
      console.error('[ST-ERR] Missing required keys in vault');
      throw new HttpsError('failed-precondition', 'Stripe configuration is incomplete. Please check the Credential Vault.');
    }

    // 3. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 4. Generate the OAuth URL
    const redirect_uri = `${origin}/onboarding-success`;

    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: clientId,
      response_type: 'code',
      scope: 'read_write',
      state: sellerId,
      redirect_uri: redirect_uri,
    });

    console.log(`[ST-SUCCESS] Generated onboarding URL for seller: ${sellerId}`);
    return { url: onboardingUrl };

  } catch (error: any) {
    console.error('[ST-OAUTH-CRASH]', error);
    
    // Pass through HttpsErrors we explicitly threw
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new HttpsError('internal', error.message || 'The server encountered an error while communicating with Stripe.');
  }
});

/**
 * Diagnostic function to verify backend availability and environment health.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  console.log('[ST-DIAG] Ping received from:', request.auth?.uid || 'anonymous');
  
  try {
    // Test Firestore connectivity
    await db.collection('config').limit(1).get();
    
    return { 
      success: true, 
      status: 'Online',
      region: 'us-central1',
      timestamp: Date.now(),
      authenticated: !!request.auth
    };
  } catch (e: any) {
    console.error('[ST-DIAG-FAIL]', e);
    throw new HttpsError('internal', 'Backend is online but cannot reach Firestore: ' + e.message);
  }
});