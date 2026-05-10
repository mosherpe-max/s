
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Validates a Stripe Connected Account ID by retrieving its status.
 * This proves the Platform's Secret Key is valid and authorized to act on behalf of the venue.
 */
export const testStripeConnection = onCall(async (request) => {
  // 1. Authorization check (Platform Admins only)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Admin authentication required.');
  }

  const { connectedAccountId } = request.data;
  if (!connectedAccountId) {
    throw new HttpsError('invalid-argument', 'Missing Connected Account ID.');
  }

  console.log(`Starting Stripe connection test for account: ${connectedAccountId}`);

  try {
    // 2. Fetch platform secret key from private vault
    const configSnap = await admin.firestore().doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      console.error('Configuration document "config/platform_private" not found.');
      throw new HttpsError('failed-precondition', 'Platform secrets vault (config/platform_private) does not exist. Please save keys in the Admin UI first.');
    }

    const data = configSnap.data();
    const rawSecretKey = data?.stripeSecretKey;

    if (!rawSecretKey) {
      console.error('Stripe Secret Key missing in platform_private document.');
      throw new HttpsError('failed-precondition', 'Stripe Secret Key not found in platform_private vault.');
    }

    const secretKey = rawSecretKey.trim();

    if (!secretKey.startsWith('sk_')) {
      console.error('Invalid Secret Key format detected.');
      throw new HttpsError('invalid-argument', 'The stored Secret Key does not appear to be a valid Stripe Secret Key (should start with sk_).');
    }

    // 3. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 4. Attempt to retrieve the connected account
    console.log('Calling Stripe API...');
    const account = await stripe.accounts.retrieve(connectedAccountId);
    console.log('Stripe API call successful.');

    return {
      success: true,
      account: {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_type: account.type,
      }
    };
  } catch (error: any) {
    console.error('Stripe Connection Test Failed:', error);
    
    // If it's already an HttpsError we threw, just pass it through
    if (error instanceof HttpsError) {
      throw error;
    }

    // Otherwise, wrap the Stripe-specific error
    const message = error.message || 'Unknown Stripe error';
    throw new HttpsError('internal', `Stripe API Error: ${message}`);
  }
});
