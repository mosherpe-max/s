import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// Using require for the Authorize.net SDK to ensure compatibility with all Node environments
const { APIContracts, APIControllers, constants } = require('authorizenet');

admin.initializeApp();

/**
 * Prototype: Official SDK implementation for Authorize.net connection verification.
 * Uses hardcoded Sandbox credentials and test card.
 */
export const testCharge = onCall(async (request) => {
  const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName('9Nuy36TT');
  merchantAuthenticationType.setTransactionKey('7fw2Y5hx2pK24ZNz');

  const creditCard = new APIContracts.CreditCardType();
  creditCard.setCardNumber('5424000000000015');
  creditCard.setExpirationDate('1226');
  creditCard.setCardCode('999');

  const paymentType = new APIContracts.PaymentType();
  paymentType.setCreditCard(creditCard);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount('1.00');

  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
  ctrl.setEnvironment(constants.endpoint.sandbox);

  return new Promise((resolve, reject) => {
    try {
      ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new APIContracts.CreateTransactionResponse(apiResponse);

        console.info('Authorize.net SDK Result:', JSON.stringify(apiResponse));
        
        // Return the full response to the client for debugging
        resolve(apiResponse);
      });
    } catch (err: any) {
      console.error('Authorize.net SDK Execution Error:', err);
      reject(new HttpsError('internal', err.message || 'SDK Execution Failed'));
    }
  });
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
