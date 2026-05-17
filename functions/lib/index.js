import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
initializeApp();
export const testFunction = onCall({
    cors: true,
    region: 'us-central1'
}, (request) => {
    logger.info("testFunction called");
    return {
        success: true,
        message: "Functions working",
        timestamp: new Date().toISOString(),
        env: "esm-v2"
    };
});
//# sourceMappingURL=index.js.map