
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-01-27.acacia',
});

/**
 * Creates a Stripe Connect account for a seller.
 */
export const createStripeConnectAccount = onCall(async (request) => {
  const { sellerId, email } = request.data;
  if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await admin.firestore().doc(`sellers/${sellerId}`).update({
      stripeAccountId: account.id,
      stripeOnboardingComplete: false,
    });

    return { accountId: account.id };
  } catch (err: any) {
    console.error('Stripe Account Creation Failed:', err);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * Generates an onboarding link for a Stripe Connect account.
 */
export const getStripeOnboardingLink = onCall(async (request) => {
  const { accountId, sellerId } = request.data;
  if (!accountId || !sellerId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${request.rawRequest.headers.origin}/sellers/${sellerId}?stripe=refresh`,
      return_url: `${request.rawRequest.headers.origin}/sellers/${sellerId}?stripe=success`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (err: any) {
    console.error('Stripe Link Creation Failed:', err);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * Creates a Checkout Session for a patron.
 */
export const createStripeCheckoutSession = onCall(async (request) => {
  const { orderId, sellerId, amount, items, stripeAccountId } = request.data;
  if (!orderId || !sellerId || !stripeAccountId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round((item.price + (item.modifiersPrice || 0)) * 100),
        },
        quantity: item.quantity,
      })),
      // Add platform fees and taxes as separate line items if necessary, 
      // or fold them into items. For this prototype, we'll keep it simple.
      payment_intent_data: {
        application_fee_amount: 100, // Example: $1.00 platform fee
        transfer_data: { destination: stripeAccountId },
        metadata: { orderId, sellerId },
      },
      return_url: `${request.rawRequest.headers.origin}/order/track?id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    });

    await admin.firestore().doc(`orders/${orderId}`).update({
      stripeSessionId: session.id,
    });

    return { clientSecret: session.client_secret };
  } catch (err: any) {
    console.error('Stripe Session Creation Failed:', err);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * Webhook to handle confirmed payments.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.payment_intent_data?.metadata?.orderId as string;

    if (orderId) {
      await admin.firestore().doc(`orders/${orderId}`).update({
        status: 'Placed', // Move from Pending Payment to Placed for staff visibility
        paymentStatus: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  res.json({ received: true });
});

/**
 * Trigger: Automatically promotes a user to 'Subscriber' status upon successful payment record.
 */
export const onPaymentSuccess = onDocumentCreated('paymentTransactions/{transactionId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  
  const data = snapshot.data();
  
  if (data.status === 'Success' && data.buyerProfileId) {
    const buyerProfileRef = admin.firestore().doc(`users/${data.buyerProfileId}/buyerProfile`);
    
    console.log(`Promoting user ${data.buyerProfileId} to Subscriber.`);
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
