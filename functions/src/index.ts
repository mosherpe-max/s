import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

// Ensure initialization is clean
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * createStripeAccountLink
 * Securely creates a Stripe Standard account for a venue and returns an onboarding URL.
 */
export const createStripeAccountLink = onCall({ 
  cors: true,
  region: 'us-central1' 
}, async (request) => {
  const { sellerId, returnBaseUrl } = request.data;
  const uid = request.auth?.uid;

  logger.info(`[STRIPE-INIT] Starting onboarding for seller: ${sellerId} by user: ${uid}`);

  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  if (!sellerId) {
    throw new HttpsError('invalid-argument', 'sellerId is required.');
  }

  const db = admin.firestore();

  try {
    // 1. Fetch platform credentials
    logger.info('[STRIPE-CONFIG] Fetching platform secrets from config/platform_private');
    const configSnap = await db.doc('config/platform_private').get();
    
    if (!configSnap.exists) {
      logger.error('[STRIPE-CONFIG-ERROR] Document config/platform_private NOT FOUND');
      throw new HttpsError('failed-precondition', 'Platform Stripe keys are missing in Firestore.');
    }

    const config = configSnap.data();
    if (!config?.stripeSecretKey) {
      logger.error('[STRIPE-CONFIG-ERROR] stripeSecretKey field is missing or empty');
      throw new HttpsError('failed-precondition', 'Stripe Secret Key is not configured in Admin.');
    }

    const stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 2. Verify seller existence
    const sellerRef = db.doc(`sellers/${sellerId}`);
    const sellerSnap = await sellerRef.get();

    if (!sellerSnap.exists) {
      logger.error(`[STRIPE-SELLER-ERROR] Venue ${sellerId} not found in database`);
      throw new HttpsError('not-found', 'Venue not found.');
    }

    const sellerData = sellerSnap.data();
    
    // 3. Create or reuse Stripe account
    let stripeAccountId = sellerData?.stripeAccountId;

    if (!stripeAccountId) {
      logger.info(`[STRIPE-ACCOUNT] Creating new Stripe Standard account for email: ${sellerData?.contactEmail}`);
      const account = await stripe.accounts.create({
        type: 'standard',
        email: sellerData?.contactEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      
      logger.info(`[STRIPE-ACCOUNT-CREATED] New ID: ${stripeAccountId}. Updating Firestore.`);
      await sellerRef.update({ stripeAccountId });
    } else {
      logger.info(`[STRIPE-ACCOUNT-REUSE] Found existing Stripe ID: ${stripeAccountId}`);
    }

    // 4. Generate onboarding link
    logger.info(`[STRIPE-LINK] Generating link for ${stripeAccountId}`);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBaseUrl}/onboarding-refresh?sellerId=${sellerId}`,
      return_url: `${returnBaseUrl}/onboarding-success?sellerId=${sellerId}`,
      type: 'account_onboarding',
    });

    logger.info('[STRIPE-SUCCESS] Link generated successfully');
    return { url: accountLink.url };
  } catch (error: any) {
    logger.error('[STRIPE-CRITICAL-ERROR]', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Stripe initialization failed: ${error.message}`);
  }
});

/**
 * systemHeartbeat
 * Minimal diagnostic function to check runtime health.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async () => {
  logger.info('[DIAGNOSTIC] Heartbeat requested');
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Cloud Function Runtime Operational'
  };
});

/**
 * pingPlatform
 * Diagnostic function to verify database connectivity and vault status.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async () => {
  logger.info('[DIAGNOSTIC] Firestore ping requested');
  const db = admin.firestore();
  try {
    const vaultSnap = await db.doc('config/platform_private').get();
    const sellerSnap = await db.collection('sellers').limit(1).get();
    
    return { 
      success: true, 
      count: sellerSnap.size,
      vaultExists: vaultSnap.exists,
      vaultConfigured: !!vaultSnap.data()?.stripeSecretKey
    };
  } catch (e: any) {
    logger.error('[DIAGNOSTIC-ERROR] Firestore ping failed', e);
    throw new HttpsError('internal', e.message);
  }
});
