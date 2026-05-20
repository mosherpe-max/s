import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
/**
 * testFunction
 * Strictly minimal v2 callable to isolate environment health.
 */
export const testFunction = onCall({
    region: 'us-central1',
    cors: true
}, (request) => {
    logger.info("testFunction execution started");
    return {
        success: true,
        message: "Functions working",
        timestamp: new Date().toISOString()
    };
});
