
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

/**
 * Initialize Firebase Admin once.
 */
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * testGetStripeUrl
 * A bare-bones, hardcoded redirect to Stripe OAuth.
 * Usage: Hit this URL directly in a browser to test basic OAuth configuration.
 */
export const testGetStripeUrl = onRequest({ cors: true, region: 'us-central1' }, (req, res) => {
  logger.info('[KOOP-TEST] testGetStripeUrl invoked');

  // 1. Hardcoded Stripe Client ID
  // REPLACE 'ca_...' with your actual Stripe Client ID if needed
  const clientId = 'ca_YOUR_TEST_CLIENT_ID_HERE'; 

  // 2. Hardcoded Redirect URI
  // This should match a "Redirect URI" added in your Stripe Dashboard Settings
  const redirectUri = 'https://studio-8903828989-977c5.web.app/onboarding-success';

  // 3. Manually construct the URL string
  const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}`;

  logger.info(`[KOOP-TEST] Redirecting to: ${stripeUrl}`);

  // 4. Send the user straight to Stripe
  res.redirect(stripeUrl);
});

/**
 * systemHeartbeat
 * Minimal function to verify that the Cloud Function runtime is online.
 */
export const systemHeartbeat = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] systemHeartbeat invoked');
  return { 
    status: 'Ready',
    timestamp: Date.now(),
    message: 'Runtime Operational'
  };
});

/**
 * pingPlatform
 * Diagnostic function to verify that the backend can reach Firestore.
 */
export const pingPlatform = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] pingPlatform invoked');
  try {
    const configSnap = await db.doc('config/platform').get();
    const vaultSnap = await db.doc('config/platform_private').get();
    
    return { 
      success: true, 
      status: 'Connected',
      vaultConfigured: vaultSnap.exists,
      firestoreReachable: true
    };
  } catch (e: any) {
    logger.error('[KOOP-ERROR] Firestore unreachable', e);
    throw new HttpsError('internal', `Database Connectivity Failure: ${e.message}`);
  }
});

/**
 * generateStripeOnboardingUrl
 * Retrieves platform secrets from Firestore and generates a Stripe OAuth URL.
 * Designed for Stripe Connect Standard multi-tenant onboarding.
 */
export const generateStripeOnboardingUrl = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  logger.info('[KOOP-LOG] generateStripeOnboardingUrl invoked', { data: request.data });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to initialize onboarding.');
  }

  const { sellerId, origin } = request.data;

  if (!sellerId || !origin) {
    throw new HttpsError('invalid-argument', 'Venue ID and Origin URL are required.');
  }

  try {
    const vaultDoc = await db.doc('config/platform_private').get();
    
    if (!vaultDoc.exists) {
      throw new HttpsError('failed-precondition', 'Platform Stripe credentials are not configured in the Admin Vault.');
    }

    const secrets = vaultDoc.data();
    const secretKey = secrets?.stripeSecretKey?.trim();
    const clientId = secrets?.stripeClientId?.trim();

    if (!secretKey || !clientId) {
      throw new HttpsError('failed-precondition', 'Stripe configuration is incomplete. Check KOOP Admin.');
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Stripe Standard Connect OAuth URL
    const onboardingUrl = stripe.oauth.authorizeUrl({
      client_id: clientId,
      response_type: 'code',
      scope: 'read_write',
      state: sellerId, // Multi-tenant tracking: we pass the sellerId as state
      redirect_uri: `${origin}/onboarding-success`,
    });

    return { url: onboardingUrl };

  } catch (error: any) {
    logger.error('[KOOP-CRASH]', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Onboarding Engine Error: ${error.message}`);
  }
});

/**
 * finalizeStripeOnboarding
 * Exchanges the OAuth 'code' for a permanent Stripe Account ID.
 * Updates the Seller document in Firestore.
 */
export const finalizeStripeOnboarding = onCall({ cors: true, region: 'us-central1' }, async (request) => {
  const { code, sellerId } = request.data;

  if (!code || !sellerId) {
    throw new HttpsError('invalid-argument', 'Authorization code and Venue ID are required.');
  }

  try {
    const vaultDoc = await db.doc('config/platform_private').get();
    const secrets = vaultDoc.data();
    const secretKey = secrets?.stripeSecretKey?.trim();

    if (!secretKey) {
      throw new HttpsError('failed-precondition', 'Platform Secret Key is missing.');
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // Exchange the code for an Access Token (Standard Connect)
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      throw new Error('No Stripe Account ID returned from exchange.');
    }

    // Update the Seller document with their new permanent Stripe ID
    await db.doc(`sellers/${sellerId}`).update({
      stripeAccountId: stripeAccountId,
      stripeOnboardedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'Active'
    });

    logger.info(`[KOOP-SUCCESS] Venue ${sellerId} connected to Stripe: ${stripeAccountId}`);
    return { success: true, stripeAccountId };

  } catch (error: any) {
    logger.error('[KOOP-ONBOARDING-FINAL-FAIL]', error);
    throw new HttpsError('internal', error.message || 'Token exchange failed.');
  }
});
