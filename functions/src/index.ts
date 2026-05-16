import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

// Ensure initialization is clean
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * getStripeSecret
 * Resolves the Stripe Secret Key from Environment Secrets or Firestore Vault.
 */
async function getStripeSecret(): Promise<string> {
  // 1. Try Environment Secret (Recommended for Production)
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }

  // 2. Fallback to Firestore Vault (Convenient for Prototype Setup)
  const db = admin.firestore();
  const configSnap = await db.doc('config/platform_private').get();
  const config = configSnap.data();
  
  if (!config?.stripeSecretKey) {
    throw new HttpsError('failed-precondition', 'Stripe Secret Key is not configured. Please set it in the KOOP Admin Vault.');
  }

  return config.stripeSecretKey;
}

/**
 * createStripeAccountLink
 * Creates a Stripe Standard account for a venue and returns an onboarding URL.
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

  const db = admin.firestore();

  try {
    // 1. Initialize Stripe with the resolved secret
    const secret = await getStripeSecret();
    const stripe = new Stripe(secret, {
      apiVersion: '2023-10-16' as any,
    });

    // 2. Fetch Seller details
    const sellerRef = db.doc(`sellers/${sellerId}`);
    const sellerSnap = await sellerRef.get();

    if (!sellerSnap.exists) {
      throw new HttpsError('not-found', 'Venue not found.');
    }

    const sellerData = sellerSnap.data();
    let stripeAccountId = sellerData?.stripeAccountId;

    // 3. Create Stripe Connect Account if one doesn't exist
    if (!stripeAccountId) {
      logger.info(`[STRIPE] Creating Standard account for ${sellerData?.courseName}`);
      const account = await stripe.accounts.create({
        type: 'standard',
        email: sellerData?.contactEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { sellerId }
      });
      stripeAccountId = account.id;
      
      // Save ID to Firestore immediately (Requirement #4)
      await sellerRef.update({ stripeAccountId });
    }

    // 4. Create Account Link for hosted onboarding
    logger.info(`[STRIPE] Generating onboarding link for ${stripeAccountId}`);
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
    throw new HttpsError('internal', `Failed to initialize Stripe: ${error.message}`);
  }
});

/**
 * Diagnostic Heartbeat
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async () => {
  return { status: 'Ready', timestamp: Date.now() };
});

/**
 * Diagnostic Ping
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async () => {
  const db = admin.firestore();
  const vaultSnap = await db.doc('config/platform_private').get();
  return { 
    success: true, 
    vaultConfigured: !!vaultSnap.data()?.stripeSecretKey 
  };
});
