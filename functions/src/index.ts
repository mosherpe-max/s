
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

  try {
    // 2. Fetch platform secret key from private vault
    const configSnap = await admin.firestore().doc('config/platform_private').get();
    const secretKey = configSnap.data()?.stripeSecretKey;

    if (!secretKey) {
      throw new HttpsError('failed-precondition', 'Stripe Secret Key not found in platform_private.');
    }

    // 3. Initialize Stripe
    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 4. Attempt to retrieve the connected account
    const account = await stripe.accounts.retrieve(connectedAccountId);

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
    throw new HttpsError('internal', error.message || 'Internal Stripe error.');
  }
});
