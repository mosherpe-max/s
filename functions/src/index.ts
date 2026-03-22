
import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { APIContracts, APIControllers, SDKConstants } from 'authorizenet';

admin.initializeApp();

// Platform-level fallback secrets (Managed in Google Cloud Secret Manager)
const platformApiLoginId = functions.defineSecret('AUTHORIZENET_API_LOGIN_ID');
const platformTransactionKey = functions.defineSecret('AUTHORIZENET_TRANSACTION_KEY');

/**
 * Securely processes a one-time payment using Authorize.net Accept.js Nonce.
 * Dynamically fetches venue-specific credentials from the Private Vault.
 * Requirement: API Login ID and Transaction Key are mandatory for transaction execution.
 */
export const processPayment = onCall({
  secrets: [platformApiLoginId, platformTransactionKey]
}, async (request) => {
  const { paymentNonce, amount, orderId, buyerProfileId, sellerId } = request.data;

  // 1. Validation
  if (!paymentNonce || !amount || !orderId || !buyerProfileId || !sellerId) {
    throw new HttpsError('invalid-argument', 'Missing transaction parameters.');
  }

  // 2. Fetch Venue Credentials from Private Vault
  let activeLoginId = platformApiLoginId.value();
  let activeTransKey = platformTransactionKey.value();
  let isSandbox = true; // Default to sandbox for safety

  try {
    const vaultDoc = await admin.firestore().doc(`sellers_private/${sellerId}`).get();
    if (vaultDoc.exists) {
      const vaultData = vaultDoc.data();
      if (vaultData?.authorizeNetLoginId && vaultData?.authorizeNetTransactionKey) {
        console.log(`Using venue-specific credentials for: ${sellerId}`);
        activeLoginId = vaultData.authorizeNetLoginId;
        activeTransKey = vaultData.authorizeNetTransactionKey;
        // Logic to determine production vs sandbox
        // For prototype purposes, we check if the ID starts with 'demo-'
        isSandbox = sellerId.startsWith('demo-');
      }
    }
  } catch (err) {
    console.warn(`Could not access Private Vault for ${sellerId}. Falling back to platform keys.`);
  }

  // 3. Configure Authorize.net Transaction
  const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(activeLoginId);
  merchantAuthenticationType.setTransactionKey(activeTransKey);

  const opaqueData = new APIContracts.OpaqueDataType();
  opaqueData.setDataDescriptor('COMMON.ACCEPT.INAPP.PAYMENT');
  opaqueData.setDataValue(paymentNonce);

  const paymentType = new APIContracts.PaymentType();
  paymentType.setOpaqueData(opaqueData);

  const transactionRequestType = new APIContracts.TransactionRequestType();
  transactionRequestType.setTransactionType(APIContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequestType.setPayment(paymentType);
  transactionRequestType.setAmount(amount.toString());

  const createRequest = new APIContracts.CreateTransactionRequest();
  createRequest.setMerchantAuthentication(merchantAuthenticationType);
  createRequest.setTransactionRequest(transactionRequestType);

  const ctrl = new APIControllers.CreateTransactionController(createRequest.getJSON());
  
  if (!isSandbox) {
    ctrl.setEnvironment(SDKConstants.endpoint.production);
  } else {
    ctrl.setEnvironment(SDKConstants.endpoint.sandbox);
  }

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
            reject(new HttpsError('internal', errorText));
          }
        } else {
          const errorText = response.getMessages().getMessage()[0].getText();
          reject(new HttpsError('internal', `Authorize.net Error: ${errorText}`));
        }
      } else {
        reject(new HttpsError('internal', 'No response from payment gateway.'));
      }
    });
  });
});

/**
 * Trigger: Automatically promotes a user to 'Subscriber' status upon successful payment.
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
