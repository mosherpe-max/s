
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Validates a Stripe Connected Account ID by retrieving its status.
 * Explicitly uses CORS and a standardized region for reliable reachability.
 */
export const testStripeConnection = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  // 1. Authorization check (Platform Admins only)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Admin authentication required.');
  }

  const { connectedAccountId } = request.data;
  if (!connectedAccountId) {
    throw new HttpsError('invalid-argument', 'Missing Connected Account ID.');
  }

  console.log(`[ST-DIAG] Starting test for account: ${connectedAccountId} (Admin: ${request.auth.uid})`);

  try {
    // 2. Fetch platform secret key from private vault
    const db = admin.firestore();
    const configSnap = await db.doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      console.error('[ST-DIAG] Document "config/platform_private" not found.');
      return { 
        success: false, 
        error: 'Platform secrets vault (config/platform_private) does not exist. Please save your Stripe Secret Key in the Admin UI and click "Update Vault" first.' 
      };
    }

    const data = configSnap.data();
    const rawSecretKey = data?.stripeSecretKey;

    if (!rawSecretKey) {
      console.error('[ST-DIAG] Stripe Secret Key missing in document.');
      return { 
        success: false, 
        error: 'Stripe Secret Key not found in platform_private vault. Please save it in the System tab.' 
      };
    }

    const secretKey = rawSecretKey.trim();
    const isTestMode = secretKey.startsWith('sk_test_');

    // 3. Simple Format Validation
    if (!secretKey.startsWith('sk_')) {
      console.error('[ST-DIAG] Invalid Secret Key format.');
      return { 
        success: false, 
        error: `The stored Secret Key starts with "${secretKey.substring(0, 3)}...", which is not a valid Stripe Secret Key format (should start with sk_).` 
      };
    }

    // 4. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });

    // 5. Attempt to retrieve the connected account
    try {
      const account = await stripe.accounts.retrieve(connectedAccountId);
      return {
        success: true,
        isTestMode,
        account: {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          business_type: account.type,
          email: account.email || 'N/A'
        }
      };
    } catch (stripeErr: any) {
      console.error('[ST-DIAG] Stripe API Error:', stripeErr);
      return { 
        success: false, 
        isTestMode,
        error: stripeErr.message || 'Stripe rejected the request. Verify the Account ID exists and your API Key has the correct permissions.' 
      };
    }
  } catch (globalErr: any) {
    console.error('[ST-DIAG] Global Function Error:', globalErr);
    return { 
      success: false, 
      error: `System Error: ${globalErr.message || 'An unexpected error occurred in the Cloud Function environment.'}` 
    };
  }
});
