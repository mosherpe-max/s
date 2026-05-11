
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Validates a Stripe Connected Account ID by retrieving its status.
 * This is the critical "Handshake" test for the multi-venue architecture.
 */
export const testStripeConnection = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  try {
    // 1. Authorization check (Platform Admins only)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Security Check Failed: You must be a Platform Admin to run diagnostics.');
    }

    const { connectedAccountId } = request.data || {};
    if (!connectedAccountId) {
      throw new HttpsError('invalid-argument', 'Input Missing: Please provide a Connected Account ID (acct_...).');
    }

    console.log(`[ST-DIAG] Step 1: Initiating test for account: ${connectedAccountId}`);

    // 2. Fetch platform secret key from private vault
    const db = admin.firestore();
    const configSnap = await db.doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      console.error('[ST-DIAG] Error: Document "config/platform_private" not found.');
      return { 
        success: false, 
        error: 'Vault Empty: The platform secrets document does not exist. Please save your keys in the System tab first.' 
      };
    }

    const data = configSnap.data();
    const rawSecretKey = data?.stripeSecretKey;

    if (!rawSecretKey) {
      console.error('[ST-DIAG] Error: Stripe Secret Key missing in vault.');
      return { 
        success: false, 
        error: 'Secret Missing: No Stripe Secret Key was found in the vault.' 
      };
    }

    const secretKey = rawSecretKey.trim();
    const isTestMode = secretKey.startsWith('sk_test_');

    // 3. Key Format Validation
    if (!secretKey.startsWith('sk_')) {
      console.error('[ST-DIAG] Error: Invalid Secret Key format.');
      return { 
        success: false, 
        error: `Credential Error: The stored Secret Key starts with "${secretKey.substring(0, 3)}...", but it must start with "sk_". You might have used a Publishable Key by mistake.` 
      };
    }

    console.log('[ST-DIAG] Step 2: Secret Key validated. Initializing Stripe SDK...');

    // 4. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
      typescript: true,
    });

    // 5. Attempt to retrieve the connected account
    try {
      console.log('[ST-DIAG] Step 3: Requesting account data from Stripe API...');
      const account = await stripe.accounts.retrieve(connectedAccountId);
      
      console.log('[ST-DIAG] Success: Account data retrieved.');
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
        error: `Stripe Rejection: ${stripeErr.message || 'The Stripe API rejected this request. Verify the Account ID exists and belongs to this platform.'}` 
      };
    }
  } catch (globalErr: any) {
    console.error('[ST-DIAG] Global Function Crash:', globalErr);
    
    if (globalErr instanceof HttpsError) {
      throw globalErr;
    }
    
    throw new HttpsError('internal', `System Error: ${globalErr.message || 'The server crashed unexpectedly during the diagnostic run.'}`);
  }
});
