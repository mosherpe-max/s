
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const stripeSecret = defineSecret('STRIPE_SECRET_KEY');

/**
 * createStripeAccountLink
 * Creates a Stripe Standard account for a venue and returns an onboarding link.
 */
export const createStripeAccountLink = onCall({ 
  secrets: [stripeSecret],
  cors: true,
  region: 'us-central1' 
}, async (request) => {
  const { sellerId, returnBaseUrl } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'sellerId is required.');
  }

  const stripe = new Stripe(stripeSecret.value(), {
    apiVersion: '2023-10-16' as any,
  });

  try {
    // 1. Verify user has permission for this seller
    const sellerRef = db.doc(`sellers/${sellerId}`);
    const sellerSnap = await sellerRef.get();

    if (!sellerSnap.exists) {
      throw new HttpsError('not-found', 'Venue not found.');
    }

    const sellerData = sellerSnap.data();
    
    // 2. Check if account already exists or create new one
    let stripeAccountId = sellerData?.stripeAccountId;

    if (!stripeAccountId) {
      logger.info(`Creating new Stripe Standard account for ${sellerId}`);
      const account = await stripe.accounts.create({
        type: 'standard',
        email: sellerData?.contactEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      
      // Save the ID immediately
      await sellerRef.update({ stripeAccountId });
    }

    // 3. Create the onboarding link
    logger.info(`Generating account link for ${stripeAccountId}`);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBaseUrl}/onboarding-refresh?sellerId=${sellerId}`,
      return_url: `${returnBaseUrl}/onboarding-success?sellerId=${sellerId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: any) {
    logger.error('[STRIPE-ERROR]', error);
    throw new HttpsError('internal', error.message || 'Failed to create Stripe link');
  }
});

/**
 * systemHeartbeat
 * Minimal function to verify that the Cloud Function runtime is online.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Runtime Operational'
  };
});
