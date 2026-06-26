import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
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
 * createPaymentIntent
 * Securely generates a Stripe Client Secret for the patron checkout.
 */
export const createPaymentIntent = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
}, async (request) => {
    const { amount, sellerId } = request.data;
    // 1. Validation
    if (!amount || amount <= 0) {
        logger.error("[createPaymentIntent] Invalid amount received:", { amount });
        throw new HttpsError('invalid-argument', 'A valid positive amount is required for checkout.');
    }
    if (!sellerId) {
        logger.error("[createPaymentIntent] Missing sellerId in request.");
        throw new HttpsError('invalid-argument', 'Establishment identity is required for routing.');
    }
    // 2. Stripe Initialization
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        logger.error("[createPaymentIntent] STRIPE_SECRET_KEY is missing from environment/secrets.");
        throw new HttpsError('failed-precondition', 'The payment gateway is not configured. Please contact support.');
    }
    // Use a specific API version for stability
    const stripe = new Stripe(apiKey, {
        apiVersion: '2025-01-27.acacia',
    });
    try {
        logger.info(`[createPaymentIntent] Creating intent for $${amount} (Venue: ${sellerId})`);
        // 3. Create Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert dollars to cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                sellerId,
                buyerUid: request.auth?.uid || 'anonymous'
            }
        });
        if (!paymentIntent.client_secret) {
            throw new Error("Stripe failed to generate a client secret.");
        }
        return {
            clientSecret: paymentIntent.client_secret,
        };
    }
    catch (err) {
        logger.error(`[createPaymentIntent] Stripe API Error:`, {
            message: err.message,
            code: err.code,
            type: err.type
        });
        throw new HttpsError('internal', err.message || 'Unable to initialize secure payment environment.');
    }
});
/**
 * handleStripeWebhook
 * Secure HTTP endpoint for Stripe event ingestion.
 */
export const handleStripeWebhook = onRequest({
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    region: 'us-central1',
}, async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!signature || !webhookSecret || !apiKey) {
        logger.error("[handleStripeWebhook] Missing signature or secret configuration.");
        res.status(400).send("Webhook Error: Missing configuration");
        return;
    }
    const stripe = new Stripe(apiKey);
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    }
    catch (err) {
        logger.error(`[handleStripeWebhook] Signature verification failed: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerPhone = session.customer_details?.phone;
        const metadata = session.metadata || {};
        logger.info(`[handleStripeWebhook] Processing completed session: ${session.id}`);
        try {
            const orderData = {
                customerPhone: customerPhone || null,
                status: "received",
                deviceOS: metadata.deviceOS || "iOS",
                sellerId: metadata.sellerId || null,
                buyerProfileId: metadata.buyerUid || null,
                stripeSessionId: session.id,
                subtotal: (session.amount_subtotal || 0) / 100,
                total: (session.amount_total || 0) / 100,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            const orderRef = await db.collection('orders').add(orderData);
            logger.info(`[handleStripeWebhook] Successfully created order ${orderRef.id}`);
        }
        catch (err) {
            logger.error(`[handleStripeWebhook] Firestore ingestion failed: ${err.message}`);
            res.status(500).send("Internal Server Error during Firestore write");
            return;
        }
    }
    res.status(200).send({ received: true });
});
/**
 * onGuestOrderStatusUpdate
 * Triggers on any creation or update to an order document.
 * Manages patron SMS notifications via Twilio.
 */
export const onGuestOrderStatusUpdate = onDocumentWritten({
    document: "orders/{orderId}",
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    region: 'us-central1',
}, async (event) => {
    const orderId = event.params.orderId;
    const before = event.data?.before;
    const after = event.data?.after;
    if (!after || !after.exists)
        return;
    const afterData = after.data();
    const customerPhone = afterData?.customerPhone;
    const status = afterData?.status;
    if (!customerPhone)
        return;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        logger.error("[onGuestOrderStatusUpdate] Twilio credentials missing from Secret Manager.");
        return;
    }
    const client = twilio(accountSid, authToken);
    let messageBody = "";
    if (!before || !before.exists) {
        if (status === 'received') {
            messageBody = `Thanks for your order at Koop! We've received it and are preparing it now. Track your order status live here: https://koop.app/orders/${orderId}`;
        }
    }
    else {
        const beforeData = before.data();
        const oldStatus = beforeData?.status;
        if (status === 'delivery' && oldStatus !== 'delivery') {
            messageBody = `Your Koop order is out for delivery! A runner is on the way. track progress here: https://koop.app/orders/${orderId}`;
        }
    }
    if (messageBody) {
        try {
            await client.messages.create({
                body: messageBody,
                from: fromNumber,
                to: customerPhone
            });
            logger.info(`[onGuestOrderStatusUpdate] SMS sent to ${customerPhone} (Order: ${orderId})`);
        }
        catch (error) {
            logger.error(`[onGuestOrderStatusUpdate] Twilio dispatch failed: ${error.message}`);
        }
    }
});
//# sourceMappingURL=index.js.map