
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Placeholder for future backend integrations.
 */
export const healthCheck = onRequest((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
