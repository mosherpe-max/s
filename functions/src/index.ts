import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Clean slate stub for processing payments.
 */
export const processPayment = onCall(async (request) => {
  const { amount, orderId, sellerId } = request.data;

  if (!amount || !orderId || !sellerId) {
    throw new HttpsError('invalid-argument', 'Missing parameters.');
  }

  console.info(`Stub: Initiating payment process for Order ${orderId} at Venue ${sellerId}`);
  
  return { success: true, message: 'Payment stub executed successfully.' };
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
