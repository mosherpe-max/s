
import * as functions from 'firebase-functions';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { APIContracts, APIControllers, SDKConstants } from 'authorizenet';

admin.initializeApp();

/**
 * Securely processes a one-time payment using Authorize.net Accept.js Nonce.
 * Dynamically fetches venue-specific credentials from the Private Vault.
 */
export const processPayment = onCall(async (request) => {
  const { paymentNonce, dataDescriptor, amount, orderId, buyerProfileId, sellerId } = request.data;

  // 1. Validation
  if (!paymentNonce || !amount || !orderId || !buyerProfileId || !sellerId) {
    throw new HttpsError('invalid-argument', 'Missing transaction parameters.');
  }

  // 2. Fetch Venue Credentials from Private Vault
  let activeLoginId = '';
  let activeTransKey = '';
  let isProduction = false;

  try {
    const [sellerDoc, vaultDoc] = await Promise.all([
      admin.firestore().doc(`sellers/${sellerId}`).get(),
      admin.firestore().doc(`sellers_private/${sellerId}`).get()
    ]);

    if (!sellerDoc.exists) {
      throw new Error(`Venue ${sellerId} not found in registry.`);
    }

    const sellerData = sellerDoc.data();
    const vaultData = vaultDoc.exists ? vaultDoc.data() : {};

    // Favor vaulted credentials, fallback to public profile if necessary
    activeLoginId = vaultData?.authorizeNetLoginId || sellerData?.authorizeNetLoginId;
    activeTransKey = vaultData?.authorizeNetTransactionKey;
    isProduction = sellerData?.isProduction === true;

    if (!activeLoginId || !activeTransKey) {
      throw new Error(`Venue ${sellerId} is missing Merchant API credentials.`);
    }
  } catch (err: any) {
    console.error(`Vault Access Error for ${sellerId}:`, err);
    throw new HttpsError('internal', `Credential Error: ${err.message}`);
  }

  // 3. Configure Authorize.net Transaction
  const merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(activeLoginId);
  merchantAuthenticationType.setTransactionKey(activeTransKey);

  const opaqueData = new APIContracts.OpaqueDataType();
  // CRITICAL: Use the descriptor passed from Accept.js (e.g. COMMON.ACCEPT.WEB.PAYMENT)
  opaqueData.setDataDescriptor(dataDescriptor || 'COMMON.ACCEPT.WEB.PAYMENT');
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
  
  if (isProduction) {
    ctrl.setEnvironment(SDKConstants.endpoint.production);
  } else {
    ctrl.setEnvironment(SDKConstants.endpoint.sandbox);
  }

  return new Promise((resolve, reject) => {
    try {
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
                environment: isProduction ? 'production' : 'sandbox',
                transactionDateTime: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                resolve({ success: true, transactionId: transId });
              }).catch(err => {
                console.error('Logging Error:', err);
                resolve({ success: true, transactionId: transId, warning: 'Transaction succeeded but logging failed' });
              });
            } else {
              const errorText = tresponse?.getErrors()?.getError()[0]?.getErrorText() || 'Transaction Denied by Gateway';
              reject(new HttpsError('permission-denied', errorText));
            }
          } else {
            const errorMsg = response.getMessages().getMessage()[0].getText();
            const errorCode = response.getMessages().getMessage()[0].getCode();
            console.error(`Authorize.net API Error ${errorCode}: ${errorMsg}`);
            reject(new HttpsError('internal', `Authorize.net Error: ${errorMsg} (${errorCode})`));
          }
        } else {
          reject(new HttpsError('internal', 'No response from Authorize.net gateway.'));
        }
      });
    } catch (err: any) {
      console.error('Controller Execution Crash:', err);
      reject(new HttpsError('internal', `Payment Controller Error: ${err.message}`));
    }
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
