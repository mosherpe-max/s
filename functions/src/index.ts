
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

/**
 * Dynamically fetches the Stripe Secret Key from Firestore config.
 */
async function getStripeClient() {
  const configDoc = await admin.firestore().doc('config/platform').get();
  const config = configDoc.data();
  
  const secretKey = config?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey || secretKey === 'sk_test_placeholder') {
    throw new HttpsError(
      'failed-precondition', 
      'Stripe is not configured. Please add your Secret Key in the KOOP Admin > System panel.'
    );
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2025-01-27.acacia',
  });
}

/**
 * Creates a Stripe Connect account for a seller.
 */
export const createStripeConnectAccount = onCall(async (request) => {
  const { sellerId, email } = request.data;
  if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

  try {
    const stripe = await getStripeClient();
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: { interval: 'manual' }
        }
      }
    });

    await admin.firestore().doc(`sellers/${sellerId}`).update({
      stripeAccountId: account.id,
      stripeOnboardingComplete: false,
    });

    return { accountId: account.id };
  } catch (err: any) {
    console.error('Stripe Account Creation Failed:', err);
    throw new HttpsError(err.code || 'internal', err.message);
  }
});

/**
 * Generates an onboarding link for a Stripe Connect account.
 */
export const getStripeOnboardingLink = onCall(async (request) => {
  const { accountId, sellerId, origin } = request.data;
  if (!accountId || !sellerId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  // Use provided origin or fall back to request header
  const baseUrl = origin || request.rawRequest.headers.origin || 'https://kooporders.com';

  try {
    const stripe = await getStripeClient();
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/sellers/${sellerId}?stripe=refresh`,
      return_url: `${baseUrl}/sellers/${sellerId}?stripe=success`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (err: any) {
    console.error('Stripe Link Creation Failed:', err);
    throw new HttpsError(err.code || 'internal', err.message);
  }
});

/**
 * Generates a login link for a Stripe Express Dashboard.
 */
export const getStripeDashboardLink = onCall(async (request) => {
  const { accountId } = request.data;
  if (!accountId) throw new HttpsError('invalid-argument', 'Missing accountId.');

  try {
    const stripe = await getStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return { url: loginLink.url };
  } catch (err: any) {
    console.error('Stripe Dashboard Link Failed:', err);
    throw new HttpsError(err.code || 'internal', err.message);
  }
});

/**
 * Creates a Checkout Session for a patron.
 */
export const createStripeCheckoutSession = onCall(async (request) => {
  const { orderId, sellerId, stripeAccountId } = request.data;
  if (!orderId || !sellerId || !stripeAccountId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  try {
    const db = admin.firestore();
    const stripe = await getStripeClient();
    
    const [orderDoc, sellerDoc] = await Promise.all([
      db.doc(`orders/${orderId}`).get(),
      db.doc(`sellers/${sellerId}`).get()
    ]);

    if (!orderDoc.exists) throw new HttpsError('not-found', 'Order not found.');
    if (!sellerDoc.exists) throw new HttpsError('not-found', 'Seller not found.');

    const orderData = orderDoc.data()!;
    const sellerData = sellerDoc.data()!;

    const convenienceFeeCents = Math.round(orderData.serviceFee * 100);
    const koopOffsetCents = sellerData.koopFeeOffsetCents || 0;
    const applicationFeeAmount = Math.max(0, convenienceFeeCents - koopOffsetCents);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      line_items: orderData.items.map((item: any) => {
        const modifiersPrice = item.selectedModifiers 
          ? Object.values(item.selectedModifiers).flat().reduce((sum: number, mod: any) => sum + mod.price, 0)
          : 0;
        
        return {
          price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round((item.price + modifiersPrice) * 100),
          },
          quantity: item.quantity,
        };
      }),
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: stripeAccountId },
        metadata: { orderId, sellerId },
      },
      return_url: `${request.rawRequest.headers.origin}/order/track?id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    });

    await db.doc(`orders/${orderId}`).update({
      stripeSessionId: session.id,
    });

    return { clientSecret: session.client_secret };
  } catch (err: any) {
    console.error('Stripe Session Creation Failed:', err);
    throw new HttpsError(err.code || 'internal', err.message);
  }
});

/**
 * Webhook to handle confirmed payments.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    const stripe = await getStripeClient();
    const configDoc = await admin.firestore().doc('config/platform').get();
    const webhookSecret = configDoc.data()?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook Verification Failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.payment_intent_data?.metadata?.orderId as string;

    if (orderId) {
      await admin.firestore().doc(`orders/${orderId}`).update({
        status: 'Placed', 
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.json({ received: true });
});

export const onPaymentSuccess = onDocumentCreated('paymentTransactions/{transactionId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const data = snapshot.data();
  if (data.status === 'Success' && data.buyerProfileId) {
    const buyerProfileRef = admin.firestore().doc(`users/${data.buyerProfileId}/buyerProfile`);
    try {
      await buyerProfileRef.update({
        subscriberStatus: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Promotion failed:", err);
    }
  }
});
