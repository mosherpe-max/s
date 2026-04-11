import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Prototype: Hardcoded test charge for Authorize.net connection verification.
 * Uses hardcoded Sandbox credentials and test card.
 */
export const testCharge = onCall(async (request) => {
  const payload = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: "9Nuy36TT",
        transactionKey: "7fw2Y5hx2pK24ZNz"
      },
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: "1.00",
        payment: {
          creditCard: {
            cardNumber: "5424000000000015",
            expirationDate: "1226",
            cardCode: "999"
          }
        }
      }
    }
  };

  try {
    const response = await fetch('https://apitest.authorize.net/xml/v1/request.api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gateway returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.info('Authorize.net Sandbox Result:', JSON.stringify(data));
    return data;
  } catch (err: any) {
    console.error('Test Charge Error:', err);
    throw new HttpsError('internal', err.message || 'Failed to contact Authorize.net');
  }
});

/**
 * Clean slate stub for processing payments.
 * Venue credentials can be retrieved from 'sellers_private/{sellerId}'.
 */
export const processPayment = onCall(async (request) => {
  const { amount, orderId, sellerId } = request.data;

  if (!amount || !orderId || !sellerId) {
    throw new HttpsError('invalid-argument', 'Missing parameters.');
  }

  console.info(`Stub: Initiating payment process for Order ${orderId} at Venue ${sellerId}`);
  
  // Future implementation should retrieve secrets from admin.firestore().doc(`sellers_private/${sellerId}`)
  
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
