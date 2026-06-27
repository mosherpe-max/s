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
    const { amount, sellerId, patronName, patronPhone, patronEmail } = request.data;
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
                buyerUid: request.auth?.uid || 'anonymous',
                customerName: patronName || 'Guest',
                customerPhone: patronPhone || '',
                customerEmail: patronEmail || ''
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
    // Handle successful payments from the PaymentElement flow
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata || {};
        logger.info(`[handleStripeWebhook] Processing successful PaymentIntent: ${paymentIntent.id}`);
        try {
            const orderData = {
                customerName: metadata.customerName || 'Guest Patron',
                customerPhone: metadata.customerPhone || null,
                customerEmail: metadata.customerEmail || null,
                status: "received",
                sellerId: metadata.sellerId || null,
                buyerProfileId: metadata.buyerUid || null,
                stripePaymentIntentId: paymentIntent.id,
                total: (paymentIntent.amount || 0) / 100,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };
            const orderRef = await db.collection('orders').add(orderData);
            logger.info(`[handleStripeWebhook] Successfully created order ${orderRef.id} for PI ${paymentIntent.id}`);
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
    if (!customerPhone) {
        logger.info(`[onGuestOrderStatusUpdate] No phone number for order ${orderId}. Skipping SMS.`);
        return;
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        logger.error("[onGuestOrderStatusUpdate] Twilio credentials missing from Secret Manager.");
        return;
    }
    const client = twilio(accountSid, authToken);
    let messageBody = "";
    // High-fidelity tracking link
    const trackingLink = `https://koop.app/orders/${orderId}`;
    if (!before || !before.exists) {
        // INITIAL CREATION
        if (status === 'received' || status === 'Placed') {
            messageBody = `Thanks for your order! We've received it and it's in our queue. Track live: ${trackingLink}`;
        }
    }
    else {
        // STATUS UPDATES
        const beforeData = before.data();
        const oldStatus = beforeData?.status;
        if (status !== oldStatus) {
            if (status === 'Preparing') {
                // Driver accepted the order
                messageBody = `Order Confirmed! Your order is being prepared now. Track live: ${trackingLink}`;
            }
            else if (status === 'Out for Delivery') {
                // Driver is moving
                messageBody = `Your order is out for delivery! A runner is on the way. Track live: ${trackingLink}`;
            }
            else if (status === 'Delivered') {
                // Order complete
                messageBody = `Your order has been delivered. Enjoy! Thanks for using Koop.`;
            }
        }
    }
    if (messageBody) {
        try {
            // Robust US phone formatting
            const cleanPhone = customerPhone.replace(/\D/g, '');
            const to = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
            await client.messages.create({
                body: messageBody,
                from: fromNumber,
                to: to
            });
            logger.info(`[onGuestOrderStatusUpdate] SMS sent to ${to} for order ${orderId} (Status: ${status})`);
        }
        catch (error) {
            logger.error(`[onGuestOrderStatusUpdate] Twilio dispatch failed for ${orderId}: ${error.message}`);
        }
    }
});
//# sourceMappingURL=index.js.map