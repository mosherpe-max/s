
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

console.log('[ST-BOOT] Stripe Diagnostic Module Loaded');

/**
 * Validates a Stripe Connected Account and optionally performs a $1.00 test intent.
 * Region: us-central1
 */
export const testStripeConnection = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  console.log('[ST-CALL] Diagnostic request received');

  try {
    // 1. Authorization check
    if (!request.auth) {
      console.error('[ST-AUTH] Request rejected: User unauthenticated');
      throw new HttpsError('unauthenticated', 'You must be logged in as an admin to run diagnostics.');
    }

    const { connectedAccountId, attemptTestCharge } = request.data || {};
    
    if (!connectedAccountId) {
      throw new HttpsError('invalid-argument', 'Connected Account ID (acct_...) is required.');
    }

    // 2. Fetch platform secret key from Firestore
    const db = admin.firestore();
    const configSnap = await db.doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      console.error('[ST-FS] config/platform_private document is missing');
      return { 
        success: false, 
        error: 'The platform vault (config/platform_private) does not exist in Firestore.' 
      };
    }

    const secretKey = configSnap.data()?.stripeSecretKey?.trim();

    if (!secretKey) {
      console.error('[ST-FS] stripeSecretKey field is empty in vault');
      return { 
        success: false, 
        error: 'Stripe Secret Key is missing from the platform vault. Please update it in the Admin tab.' 
      };
    }

    // 3. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });

    const isTestMode = secretKey.startsWith('sk_test_');

    // 4. Retrieve Account Status from Stripe API
    console.log(`[ST-API] Attempting to retrieve account: ${connectedAccountId}`);
    const account = await stripe.accounts.retrieve(connectedAccountId);
    console.log(`[ST-API] Successfully retrieved account: ${account.id}`);
    
    let chargeResult = null;

    // 5. Optional: Attempt a $1.00 Test Payment Intent (Direct Charge)
    if (attemptTestCharge) {
      try {
        console.log(`[ST-API] Creating $1.00 test intent for: ${connectedAccountId}`);
        const intent = await stripe.paymentIntents.create({
          amount: 100, // $1.00
          currency: 'usd',
          description: 'KOOP connectivity test intent',
          payment_method_types: ['card'],
          capture_method: 'manual', // Do not actually take funds
        }, {
          stripeAccount: connectedAccountId
        });

        chargeResult = {
          id: intent.id,
          status: intent.status,
          message: 'Intent created successfully'
        };
        console.log(`[ST-API] Intent created: ${intent.id}`);
      } catch (chargeErr: any) {
        console.error('[ST-API] Test intent failed:', chargeErr);
        chargeResult = {
          success: false,
          error: chargeErr.message || 'Payment Intent creation failed'
        };
      }
    }

    return {
      success: true,
      isTestMode,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_type: account.type,
      },
      charge: chargeResult
    };

  } catch (err: any) {
    console.error('[ST-FATAL] Server error during diagnostic:', err);
    
    // Ensure we return an HttpsError so the client SDK can catch it correctly
    if (err instanceof HttpsError) {
      throw err;
    }
    
    // Map unexpected errors to a structured response
    return { 
      success: false, 
      error: err.message || 'A server-side crash occurred. Check the Firebase logs for details.' 
    };
  }
});
