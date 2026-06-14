import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from 'stripe';
import twilio from 'twilio';
/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();
/**
 * CONFIGURATION TOGGLE
 * Set to true to suppress notifications for the initial 'Preparing' transition
 * and only notify when the order is 'Out for Delivery'.
 */
const NOTIFY_ONLY_ON_DISPATCH = false;
/**
 * onOrderStatusUpdate
 * Firestore trigger that monitors order status transitions.
 * Dispatches SMS alerts to all patrons to ensure real-time coordination.
 */
export const onOrderStatusUpdate = onDocumentUpdated({
    document: "orders/{orderId}",
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    region: 'us-central1',
}, async (event) => {
    const orderId = event.params.orderId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) {
        logger.warn(`[onOrderStatusUpdate] Event data missing for order: ${orderId}`);
        return;
    }
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // 1. Identify valid status transitions based on platform lifecycle
    // Transition A: Staff acknowledged (Placed -> Preparing)
    const isTransitionToReceived = newStatus === 'Preparing' && oldStatus !== 'Preparing';
    // Transition B: Out for delivery (Preparing -> Out for Delivery)
    const isTransitionToReady = newStatus === 'Out for Delivery' && oldStatus !== 'Out for Delivery';
    if (!isTransitionToReceived && !isTransitionToReady) {
        return; // No relevant status change
    }
    // 2. Apply "Notify Only on Dispatch" constraint if toggled
    if (NOTIFY_ONLY_ON_DISPATCH && isTransitionToReceived) {
        logger.info(`[onOrderStatusUpdate] Notification suppressed for 'Preparing' transition.`);
        return;
    }
    // 3. Extract Customer Contact Information
    const customerPhone = afterData.customerPhone;
    if (!customerPhone) {
        logger.error(`[onOrderStatusUpdate] Missing customerPhone for order: ${orderId}`);
        return;
    }
    // 4. Initialize Twilio Client using Secret Manager
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        logger.error("[onOrderStatusUpdate] Twilio credentials missing from Secret Manager.");
        return;
    }
    const client = twilio(accountSid, authToken);
    try {
        // 5. Build Dynamic Message
        const statusLabel = newStatus === 'Preparing' ? 'is being prepared' : 'is out for delivery';
        const message = `Your Koop order ${statusLabel}! View live tracking details here: https://koop.app/orders/${orderId}`;
        // 6. Dispatch SMS
        const result = await client.messages.create({
            body: message,
            from: fromNumber,
            to: customerPhone
        });
        logger.info(`[onOrderStatusUpdate] Universal SMS sent to ${customerPhone}. Status: ${newStatus}. SID: ${result.sid}`);
        return;
    }
    catch (error) {
        logger.error(`[onOrderStatusUpdate] Twilio dispatch failed for ${orderId}:`, error);
        return;
    }
});
/**
 * sendSmsNotification
 * Dispatches a manual SMS via Twilio for custom staff alerts.
 */
export const sendSmsNotification = onCall({
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    region: 'us-central1',
    cors: true,
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    const { to, message } = request.data;
    if (!to || !message) {
        throw new HttpsError("invalid-argument", "Recipient number and message body are required.");
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        throw new HttpsError("internal", "Twilio configuration is missing from Secret Manager.");
    }
    const client = twilio(accountSid, authToken);
    try {
        const result = await client.messages.create({
            body: message,
            from: fromNumber,
            to: to
        });
        logger.info(`SMS sent successfully to ${to}. SID: ${result.sid}`);
        return { success: true, sid: result.sid };
    }
    catch (error) {
        logger.error("Twilio SMS Error:", error);
        throw new HttpsError("internal", error.message || "Failed to dispatch SMS notification.");
    }
});
/**
 * createStripeConnectAccount
 * Securely provisions a Stripe Connect Express account and returns an onboarding link.
 */
export const createStripeConnectAccount = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
    cors: true,
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }
    const { venueId } = request.data;
    if (!venueId) {
        throw new HttpsError("invalid-argument", "Missing required field: venueId.");
    }
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new HttpsError("internal", "STRIPE_SECRET_KEY not found in environment.");
    }
    const stripe = new Stripe(apiKey);
    try {
        const venueRef = db.collection('venues').doc(venueId);
        const venueDoc = await venueRef.get();
        if (!venueDoc.exists) {
            throw new HttpsError("not-found", `Venue registry [${venueId}] not found.`, { venueId });
        }
        const venueData = venueDoc.data();
        if (venueData?.ownerUid !== request.auth.uid) {
            throw new HttpsError("permission-denied", "Unauthorized venue management.");
        }
        let stripeAccountId = venueData?.stripeAccountId || venueData?.stripeConnectId;
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: { venueId, ownerUid: request.auth.uid }
            });
            stripeAccountId = account.id;
            await venueRef.update({
                stripeAccountId,
                stripeConnectId: stripeAccountId,
                stripeOnboardingComplete: false,
                updatedAt: new Date().toISOString()
            });
        }
        let origin = 'http://localhost:9002';
        const headerOrigin = request.rawRequest?.headers?.origin;
        if (headerOrigin) {
            origin = typeof headerOrigin === 'string' ? headerOrigin : headerOrigin[0];
        }
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${origin}/onboarding-refresh?venueId=${venueId}`,
            return_url: `${origin}/onboarding-success?venueId=${venueId}`,
            type: 'account_onboarding',
        });
        return { url: accountLink.url };
    }
    catch (error) {
        logger.error("createStripeConnectAccount Error:", error);
        throw new HttpsError("internal", error.message || "Stripe initialization failed", {
            rawMessage: error.message,
            type: error.type
        });
    }
});
/**
 * createPaymentIntent
 * Initializes a Stripe PaymentIntent restricted to card payments with a Patron-paid fee.
 */
export const createPaymentIntent = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
    cors: true,
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const { amount, sellerId } = request.data;
    if (amount === undefined || !sellerId) {
        throw new HttpsError("invalid-argument", "Base amount and sellerId are required.");
    }
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new HttpsError("internal", "STRIPE_SECRET_KEY missing in environment.");
    }
    const stripe = new Stripe(apiKey);
    try {
        // 1. Fetch Venue Registry for routing and fee policy
        const venueRef = db.collection('venues').doc(sellerId);
        const venueDoc = await venueRef.get();
        if (!venueDoc.exists) {
            throw new HttpsError("not-found", `Registry document missing for venue: ${sellerId}.`, { sellerId });
        }
        const venueData = venueDoc.data();
        const stripeConnectId = venueData?.stripeConnectId || venueData?.stripeAccountId;
        if (!stripeConnectId) {
            throw new HttpsError("failed-precondition", `Stripe Account ID is missing for venue: ${sellerId}.`, { sellerId });
        }
        // 2. Fetch Fee Configuration from Registry
        const patronConvenienceFee = venueData?.patronConvenienceFee ?? 150;
        const platformFeeFixed = venueData?.platformFeeFixed ?? 20;
        // 3. Calculate Final Stripe Values
        const baseAmountInCents = Math.round(amount * 100);
        const totalChargeAmount = baseAmountInCents + patronConvenienceFee;
        const applicationFeeAmount = Math.max(0, patronConvenienceFee - platformFeeFixed);
        // 4. Create the PaymentIntent with restricted payment methods
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalChargeAmount,
            currency: 'usd',
            payment_method_types: ['card'],
            application_fee_amount: applicationFeeAmount,
            transfer_data: {
                destination: stripeConnectId,
            },
            metadata: {
                sellerId,
                buyerUid: request.auth.uid,
                patronFeeCents: patronConvenienceFee.toString(),
                koopCoverageCents: platformFeeFixed.toString(),
                baseAmountCents: baseAmountInCents.toString()
            }
        });
        return { clientSecret: paymentIntent.client_secret };
    }
    catch (error) {
        logger.error("createPaymentIntent Error:", error);
        throw new HttpsError("aborted", error.message || "Payment intent creation failed", {
            stripeError: error.message,
            stripeCode: error.code
        });
    }
});
/**
 * createCheckoutSession
 * Securely creates a hosted Stripe Checkout session with phone number collection enabled.
 */
export const createCheckoutSession = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
    cors: true,
    maxInstances: 10,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const { amount, sellerId, successUrl, cancelUrl } = request.data;
    if (amount === undefined || !sellerId || !successUrl || !cancelUrl) {
        throw new HttpsError("invalid-argument", "Missing required parameters (amount, sellerId, urls).");
    }
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new HttpsError("internal", "STRIPE_SECRET_KEY missing in environment.");
    }
    const stripe = new Stripe(apiKey);
    try {
        // 1. Fetch Venue Registry for routing and multi-tenant fee policy
        const venueRef = db.collection('venues').doc(sellerId);
        const venueDoc = await venueRef.get();
        if (!venueDoc.exists) {
            throw new HttpsError("not-found", "Venue registry not found.");
        }
        const venueData = venueDoc.data();
        const stripeConnectId = venueData?.stripeConnectId || venueData?.stripeAccountId;
        if (!stripeConnectId) {
            throw new HttpsError("failed-precondition", "Venue has not completed Stripe onboarding.");
        }
        const patronConvenienceFee = venueData?.patronConvenienceFee ?? 150;
        const platformFeeFixed = venueData?.platformFeeFixed ?? 20;
        const baseAmountInCents = Math.round(amount * 100);
        const totalChargeAmount = baseAmountInCents + patronConvenienceFee;
        const applicationFeeAmount = Math.max(0, patronConvenienceFee - platformFeeFixed);
        // 2. Create the hosted Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Order from ${venueData?.name || 'Koop'}`,
                        },
                        unit_amount: totalChargeAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            // CRITICAL: Enable phone number collection for SMS triggers
            phone_number_collection: {
                enabled: true,
            },
            payment_intent_data: {
                application_fee_amount: applicationFeeAmount,
                transfer_data: {
                    destination: stripeConnectId,
                },
                metadata: {
                    sellerId,
                    buyerUid: request.auth.uid,
                    patronFeeCents: patronConvenienceFee.toString(),
                    baseAmountCents: baseAmountInCents.toString()
                }
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                sellerId,
                buyerUid: request.auth.uid,
            }
        });
        return { url: session.url };
    }
    catch (error) {
        logger.error("createCheckoutSession Error:", error);
        throw new HttpsError("internal", error.message || "Failed to initialize checkout session.");
    }
});
/**
 * verifyVenueConnection
 * Diagnostic utility to verify Stripe account status.
 */
export const verifyVenueConnection = onCall({
    secrets: ["STRIPE_SECRET_KEY"],
    region: 'us-central1',
    cors: true,
    maxInstances: 5,
}, async (request) => {
    const { venueId } = request.data;
    if (!venueId) {
        throw new HttpsError("invalid-argument", "Missing required parameter: venueId");
    }
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new HttpsError("internal", "STRIPE_SECRET_KEY not found in environment.");
    }
    const stripe = new Stripe(apiKey);
    try {
        const venueRef = db.collection('venues').doc(venueId);
        const venueDoc = await venueRef.get();
        if (!venueDoc.exists) {
            throw new HttpsError("not-found", `Venue record for [${venueId}] not found in Firestore registry.`);
        }
        const venueData = venueDoc.data();
        const stripeAccountId = venueData?.stripeConnectId || venueData?.stripeAccountId;
        if (!stripeAccountId) {
            throw new HttpsError("failed-precondition", `The venue [${venueId}] does not have a stripeConnectId assigned yet.`);
        }
        const account = await stripe.accounts.retrieve(stripeAccountId);
        return {
            id: account.id,
            businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || 'Unnamed Merchant',
            capabilities: account.capabilities,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            status: (account.charges_enabled && account.payouts_enabled) ? 'Ready' : 'Restricted'
        };
    }
    catch (error) {
        logger.error(`[verifyVenueConnection] Failed for ${venueId}:`, error);
        throw new HttpsError("internal", error.message || "Stripe API retrieval failed", {
            details: error.message,
            code: error.code
        });
    }
});
/**
 * Health Check
 */
export const testFunction = onCall({
    region: 'us-central1',
    cors: true,
}, (request) => {
    return { status: "healthy", timestamp: new Date().toISOString() };
});
