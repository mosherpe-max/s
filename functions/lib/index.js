"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFunction = void 0;
const https_1 = require("firebase-functions/v2/https");
exports.testFunction = (0, https_1.onCall)({
    cors: true,
    region: 'us-central1'
}, (request) => {
    return {
        success: true,
        message: "Functions working"
    };
});
//# sourceMappingURL=index.js.map