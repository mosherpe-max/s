
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Validates a Stripe Connected Account and optionally performs a $1.00 test intent.
 * This is the Step 1 validation for the multi-venue architecture.
 */
export const testStripeConnection = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  try {
    // 1. Authorization check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in as an admin.');
    }

    const { connectedAccountId, attemptTestCharge } = request.data || {};
    
    if (!connectedAccountId) {
      throw new HttpsError('invalid-argument', 'Connected Account ID is required.');
    }

    // 2. Fetch platform secret key
    const db = admin.firestore();
    const configSnap = await db.doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      return { 
        success: false, 
        error: 'Platform configuration document (config/platform_private) is missing in Firestore.' 
      };
    }

    const secretKey = configSnap.data()?.stripeSecretKey?.trim();

    if (!secretKey) {
      return { 
        success: false, 
        error: 'Stripe Secret Key is missing in the platform vault.' 
      };
    }

    // 3. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });

    const isTestMode = secretKey.startsWith('sk_test_');

    // 4. Retrieve Account Status
    console.log(`[ST-DIAG] retrieving account: ${connectedAccountId}`);
    const account = await stripe.accounts.retrieve(connectedAccountId);
    
    let chargeResult = null;

    // 5. Optional: Attempt a $1.00 Test Payment Intent (Direct Charge)
    if (attemptTestCharge) {
      try {
        console.log(`[ST-DIAG] Attempting $1.00 test intent for: ${connectedAccountId}`);
        const intent = await stripe.paymentIntents.create({
          amount: 100, // $1.00
          currency: 'usd',
          description: 'KOOP connectivity test intent',
          payment_method_types: ['card'],
          capture_method: 'manual', // Don't actually capture funds
        }, {
          stripeAccount: connectedAccountId
        });

        chargeResult = {
          id: intent.id,
          status: intent.status,
          message: 'Intent created successfully'
        };
      } catch (chargeErr: any) {
        console.error('[ST-DIAG] Test intent failed:', chargeErr);
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
    console.error('[ST-DIAG] Fatal Error:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }
    
    return { 
      success: false, 
      error: err.message || 'An unexpected server error occurred.' 
    };
  }
});
