
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * createStripeAccountLink
 * Securely creates a Stripe Standard account for a venue and returns an onboarding URL.
 * Reads credentials from Firestore config/platform_private for easier management.
 */
export const createStripeAccountLink = onCall({ 
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

  try {
    // 1. Fetch platform credentials from the secure vault
    const configSnap = await db.doc('config/platform_private').get();
    const config = configSnap.data();

    if (!config?.stripeSecretKey) {
      throw new HttpsError('failed-precondition', 'Platform Stripe keys are not configured in Admin.');
    }

    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 2. Verify seller existence
    const sellerRef = db.doc(`sellers/${sellerId}`);
    const sellerSnap = await sellerRef.get();

    if (!sellerSnap.exists) {
      throw new HttpsError('not-found', 'Venue not found.');
    }

    const sellerData = sellerSnap.data();
    
    // 3. Create or reuse Stripe account
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
      
      // Save immediately to prevent duplicates
      await sellerRef.update({ stripeAccountId });
    }

    // 4. Generate onboarding link
    logger.info(`Generating link for ${stripeAccountId}`);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBaseUrl}/onboarding-refresh?sellerId=${sellerId}`,
      return_url: `${returnBaseUrl}/onboarding-success?sellerId=${sellerId}`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: any) {
    logger.error('[STRIPE-ERROR]', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Failed to initialize Stripe flow.');
  }
});

/**
 * systemHeartbeat
 * Minimal diagnostic function.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async () => {
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Runtime Operational'
  };
});

/**
 * pingPlatform
 * Diagnostic function to verify database connectivity.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async () => {
  try {
    const snap = await db.collection('sellers').limit(1).get();
    return { 
      success: true, 
      count: snap.size,
      vaultConfigured: (await db.doc('config/platform_private').get()).exists
    };
  } catch (e: any) {
    throw new HttpsError('internal', e.message);
  }
});
