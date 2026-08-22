
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from 'stripe';
import twilio from 'twilio';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();

/**
 * performOperationalReset
 */
async function performOperationalReset() {
    logger.info("[performOperationalReset] STARTING ROBUST SYSTEM SWEEP");
    let totalStaffReset = 0;
    let totalOrdersCancelled = 0;
    try {
        const [sellersSnapshot, ordersSnapshot] = await Promise.all([
            db.collection('sellers').get(),
            db.collection('orders').where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery']).get()
        ]);
        const batches = [];
        let currentBatch = db.batch();
        let writeCount = 0;
        const commitAndReset = () => {
            batches.push(currentBatch.commit());
            currentBatch = db.batch();
            writeCount = 0;
        };
        ordersSnapshot.forEach(oDoc => {
            currentBatch.update(oDoc.ref, {
                status: 'Cancelled',
                notes: 'Operational Reset: Terminal system sweep.',
                updatedAt: FieldValue.serverTimestamp()
            });
            totalOrdersCancelled++;
            writeCount++;
            if (writeCount >= 450)
                commitAndReset();
        });
        for (const sellerDoc of sellersSnapshot.docs) {
            const staffSnapshot = await sellerDoc.ref.collection('staff').where('activeMode', '!=', null).get();
            staffSnapshot.forEach(sDoc => {
                currentBatch.update(sDoc.ref, {
                    activeMode: null,
                    latitude: null,
                    longitude: null,
                    lastActive: FieldValue.serverTimestamp()
                });
                totalStaffReset++;
                writeCount++;
                if (writeCount >= 450)
                    commitAndReset();
            });
        }
        if (writeCount > 0) {
            batches.push(currentBatch.commit());
        }
        await Promise.all(batches);
        logger.info(`[performOperationalReset] Finalized. Staff: ${totalStaffReset}, Orders: ${totalOrdersCancelled}`);
        return { status: 'success', totalStaffReset, totalOrdersCancelled };
    }
    catch (err) {
        logger.error("[performOperationalReset] Critical Failure during sweep:", err);
        throw err;
    }
}

/**
 * createPaymentIntent
 */
export const createPaymentIntent = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
}, async (request) => {
    try {
        const { amount, sellerId, patronName, patronPhone, patronEmail, stripeCustomerId: clientProvidedCustomerId } = request.data || {};
        const buyerUid = request.auth?.uid;
        if (!amount || amount <= 0)
            throw new HttpsError('invalid-argument', 'Invalid amount.');
        if (!sellerId)
            throw new HttpsError('invalid-argument', 'Missing sellerId.');
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey)
            throw new HttpsError('failed-precondition', 'Gateway not configured.');
        const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' });
        const sellerDoc = await db.collection('sellers').doc(sellerId).get();
        const venueStripeAccountId = sellerDoc.data()?.stripeAccountId;
        if (!venueStripeAccountId) {
            throw new HttpsError('failed-precondition', 'Venue is not configured for digital payments.');
        }
        let stripeCustomerId = clientProvidedCustomerId;
        if (!stripeCustomerId && buyerUid) {
            const userDoc = await db.collection('users').doc(buyerUid).get();
            if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
                stripeCustomerId = userDoc.data()?.stripeCustomerId;
            }
        }
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: patronEmail || undefined,
                name: patronName || 'Guest Patron',
                metadata: { buyerUid: buyerUid || 'anonymous' }
            });
            stripeCustomerId = customer.id;
        }
        const customerSession = await stripe.customerSessions.create({
            customer: stripeCustomerId,
            components: { payment_element: { enabled: true, features: { payment_method_save: 'enabled', payment_method_redisplay: 'enabled' } } }
        });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'usd',
            customer: stripeCustomerId,
            automatic_payment_methods: { enabled: true },
            transfer_data: { destination: venueStripeAccountId },
            metadata: {
                sellerId,
                buyerUid: buyerUid || 'anonymous',
                customerName: patronName || 'Guest',
                customerPhone: patronPhone || '',
                customerEmail: patronEmail || ''
            }
        });
        return {
            clientSecret: paymentIntent.client_secret,
            customerSessionClientSecret: customerSession.client_secret,
            stripeCustomerId
        };
    }
    catch (err) {
        logger.error("Stripe PI Error", err);
        throw new HttpsError('internal', err.message || 'Internal payment gateway error.');
    }
});

/**
 * dailyOperationalReset
 */
export const dailyOperationalReset = onSchedule({
    schedule: "0 * * * *",
    timeZone: "America/New_York",
    region: 'us-central1'
}, async () => {
    const configSnap = await db.collection('solution').doc('config').get();
    const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
    const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    if (nowInEst.getHours() !== resetHour)
        return;
    await performOperationalReset();
});

/**
 * manualOperationalReset
 */
export const manualOperationalReset = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth)
        throw new HttpsError('unauthenticated', 'Unauthorized access.');
    return await performOperationalReset();
});

/**
 * onGuestOrderStatusUpdate
 */
export const onGuestOrderStatusUpdate = onDocumentWritten({
    document: "orders/{orderId}",
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    region: 'us-central1',
}, async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists)
        return;
    try {
        const configSnap = await db.collection('solution').doc('config').get();
        if (configSnap.exists && configSnap.data()?.smsNotificationsEnabled === false)
            return;
        const data = after.data();
        if (!data?.customerPhone)
            return;
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER;
        if (!accountSid || !authToken || !fromNumber)
            return;
        const client = twilio(accountSid, authToken);
        let body = "";
        const link = `https://koop.app/orders/${event.params.orderId}`;
        const beforeData = event.data?.before?.exists ? event.data.before.data() : null;
        
        if (beforeData) {
            if (data.status !== beforeData.status) {
                if (data.status === 'Preparing')
                    body = `Order confirmed! We're getting it ready: ${link}`;
                else if (data.status === 'Out for Delivery')
                    body = `Order out for delivery! Track live: ${link}`;
                else if (data.status === 'Delivered')
                    body = `Order delivered! Enjoy your time at the venue: ${link}`;
            }

            const getSeconds = (ts) => {
                if (!ts) return 0;
                if (typeof ts.seconds === 'number') return ts.seconds;
                if (typeof ts._seconds === 'number') return ts._seconds;
                if (typeof ts.toMillis === 'function') return Math.floor(ts.toMillis() / 1000);
                return 0;
            };

            const currentPingSec = getSeconds(data.refreshRequestedAt);
            const previousPingSec = getSeconds(beforeData.refreshRequestedAt);
            
            if (!body && currentPingSec > 0 && currentPingSec !== previousPingSec) {
                body = `Hey! Your Koop order is on the way - tap to help us find you: ${link}`;
            }
        }
        if (body) {
            const cleanPhone = String(data.customerPhone).replace(/\D/g, '');
            if (cleanPhone.length >= 10) {
                const to = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
                await client.messages.create({ body, from: fromNumber, to });
                logger.info(`[onGuestOrderStatusUpdate] SMS sent to ${to}: ${body}`);
            }
        }
    }
    catch (err) {
        logger.error("Twilio Trigger Failed", err);
    }
});

/**
 * handleStripeWebhook
 */
export const handleStripeWebhook = onRequest({
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    region: 'us-central1',
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!sig || !webhookSecret || !stripeKey) {
        res.status(400).send("Webhook configuration missing.");
        return;
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
    try {
        const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const existingQuery = await db.collection('orders').where('stripePaymentIntentId', '==', pi.id).limit(1).get();
            if (!existingQuery.empty) {
                await existingQuery.docs[0].ref.update({
                    paymentStatus: 'Succeeded',
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else {
                const meta = pi.metadata || {};
                await db.collection('orders').add({
                    customerName: meta.customerName || 'Guest',
                    customerPhone: (meta.customerPhone || '').replace(/\D/g, ''),
                    customerEmail: meta.customerEmail || '',
                    status: "Placed",
                    sellerId: meta.sellerId || '',
                    buyerProfileId: meta.buyerUid || 'anonymous',
                    stripePaymentIntentId: pi.id,
                    total: (pi.amount || 0) / 100,
                    paymentStatus: 'Succeeded',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
        }
        res.status(200).send({ received: true });
    }
    catch (err) {
        logger.error("Stripe Webhook Error", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
