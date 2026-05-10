
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Dynamically fetches the Stripe Secret Key from Firestore config.
 * Checks platform_private first, falls back to platform for legacy or env vars.
 */
async function getStripeClient() {
  try {
    const db = admin.firestore();
    const [privateDoc, publicDoc] = await Promise.all([
      db.doc('config/platform_private').get(),
      db.doc('config/platform').get()
    ]);

    const privateData = privateDoc.data();
    const publicData = publicDoc.data();
    
    const secretKey = privateData?.stripeSecretKey || publicData?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new HttpsError(
        'failed-precondition', 
        'Stripe Secret Key is missing from Firestore (config/platform_private). Please add it in KOOP Admin > System.'
      );
    }

    if (secretKey.startsWith('pk_')) {
      throw new HttpsError(
        'invalid-argument',
        'CRITICAL ERROR: A Publishable Key (pk_...) was found in the Secret Key field. Please update your Stripe Secret Key in the Admin dashboard.'
      );
    }
    
    return new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  } catch (err: any) {
    console.error('Stripe Client Init Error:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Failed to initialize Stripe client: ' + err.message);
  }
}

/**
 * Creates a Checkout Session for a patron.
 */
export const createStripeCheckoutSession = onCall(async (request) => {
  const { orderId, sellerId, origin } = request.data;
  if (!orderId || !sellerId) throw new HttpsError('invalid-argument', 'Missing parameters.');

  try {
    const db = admin.firestore();
    const stripe = await getStripeClient();
    
    // Fetch Account ID from Private Vault
    const privateSellerDoc = await db.doc(`sellers_private/${sellerId}`).get();
    const stripeAccountId = privateSellerDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      throw new HttpsError('failed-precondition', 'Venue has not provided a Stripe Account ID. Please contact the establishment.');
    }
    
    const [orderDoc, sellerDoc] = await Promise.all([
      db.doc(`orders/${orderId}`).get(),
      db.doc(`sellers/${sellerId}`).get()
    ]);

    if (!orderDoc.exists) throw new HttpsError('not-found', 'Order not found.');
    if (!sellerDoc.exists) throw new HttpsError('not-found', 'Seller not found.');

    const orderData = orderDoc.data()!;
    const sellerData = sellerDoc.data()!;
    const baseUrl = origin || 'https://kooporders.com';

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
      return_url: `${baseUrl}/order/track?id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    });

    await db.doc(`orders/${orderId}`).update({
      stripeSessionId: session.id,
    });

    return { clientSecret: session.client_secret };
  } catch (err: any) {
    console.error('Stripe Session Creation Failed:', err);
    if (err instanceof HttpsError) throw err;
    const message = err.raw?.message || err.message || 'Unknown Stripe error';
    throw new HttpsError('internal', message);
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
    const configDoc = await admin.firestore().doc('config/platform_private').get();
    const webhookSecret = configDoc.data()?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook Verification Failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = (session as any).metadata?.orderId;

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
