import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { APIContracts, APIControllers } from 'authorizenet';

admin.initializeApp();

// Platform-level secrets for Authorize.net
// These must be set via: firebase functions:secrets:set AUTHORIZENET_API_LOGIN_ID
const apiLoginId = functions.defineSecret('AUTHORIZENET_API_LOGIN_ID');
const transactionKey = functions.defineSecret('AUTHORIZENET_TRANSACTION_KEY');

/**
 * Securely processes a one-time payment using Authorize.net Accept.js Nonce.
 */
export const processPayment = functions.https.onCall({
  secrets: [apiLoginId, transactionKey]
}, async (request) => {
  const { paymentNonce, amount, orderId, buyerProfileId, sellerId } = request.data;

  // 1. Validation
  if (!paymentNonce || !amount || !orderId || !buyerProfileId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing transaction parameters.');
  }

  // 2. Configure Authorize.net Transaction
  const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(apiLoginId.value());
  merchantAuthenticationType.setTransactionKey(transactionKey.value());

  const opaqueData = new APIContracts.OpaqueDataType();
  opaqueData.setDataDescriptor('COMMON.ACCEPT.INAPP.PAYMENT');
  opaqueData.setDataValue(paymentNonce);

  const paymentType = new APIContracts.PaymentType();
  paymentType.setOpaqueData(opaqueData);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount(amount);

  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());

  return new Promise((resolve, reject) => {
    ctrl.execute(() => {
      const apiResponse = ctrl.getResponse();
      const response = new APIContracts.CreateTransactionResponse(apiResponse);

      if (response != null) {
        if (response.getMessages().getResultCode() === APIContracts.MessageTypeEnum.OK) {
          const tresponse = response.getTransactionResponse();
          if (tresponse != null && tresponse.getMessages() != null) {
            const transId = tresponse.getTransId();
            
            // Record transaction in Firestore
            admin.firestore().collection('paymentTransactions').add({
              orderId,
              buyerProfileId,
              sellerId,
              amount,
              status: 'Success',
              paymentGatewayTransactionId: transId,
              transactionDateTime: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              resolve({ success: true, transactionId: transId });
            }).catch(err => {
              console.error('Logging Error:', err);
              resolve({ success: true, transactionId: transId, warning: 'Log failed' });
            });
          } else {
            const errorText = tresponse?.getErrors()?.getError()[0]?.getErrorText() || 'Transaction Denied';
            reject(new functions.https.HttpsError('internal', errorText));
          }
        } else {
          const errorText = response.getMessages().getMessage()[0].getText();
          reject(new functions.https.HttpsError('internal', `Authorize.net Error: ${errorText}`));
        }
      } else {
        reject(new functions.https.HttpsError('internal', 'No response from payment gateway.'));
      }
    });
  });
});

/**
 * Trigger: Automatically promotes a user to 'Subscriber' status upon successful payment.
 */
export const onPaymentSuccess = functions.firestore
  .document('paymentTransactions/{transactionId}')
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    
    if (data.status === 'Success' && data.buyerProfileId) {
      const buyerProfileRef = admin.firestore().doc(`users/${data.buyerProfileId}/buyerProfile/${data.buyerProfileId}`);
      
      console.log(`Promoting user ${data.buyerProfileId} to Subscriber.`);
      return buyerProfileRef.update({
        subscriberStatus: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    return null;
  });