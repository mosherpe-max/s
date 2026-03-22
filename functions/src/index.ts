
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
    console.error("Payment Error: Missing transaction parameters.", { orderId, sellerId });
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
      throw new Error(`Venue ${sellerId} is missing Merchant API credentials (Login ID or Transaction Key).`);
    }
    
    console.info(`Processing payment for Order ${orderId} at Venue ${sellerId} (${isProduction ? 'PRODUCTION' : 'SANDBOX'})`);
  } catch (err: any) {
    console.error(`Vault Access Error for ${sellerId}:`, err);
    throw new HttpsError('failed-precondition', `Setup Error: ${err.message}`);
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
  transactionRequestType.setAmount(Number(amount).toFixed(2)); // Force strict 2-decimal string

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
    // Watchdog timer to prevent function hang
    const timeout = setTimeout(() => {
      console.error("Payment Error: Gateway Timeout", { orderId });
      reject(new HttpsError('deadline-exceeded', 'The payment gateway timed out. Please try again.'));
    }, 25000);

    try {
      ctrl.execute(() => {
        clearTimeout(timeout);
        const apiResponse = ctrl.getResponse();
        
        if (!apiResponse) {
          console.error("Payment Error: Null response from Authorize.net SDK", { orderId });
          return reject(new HttpsError('internal', 'No response received from Authorize.net gateway.'));
        }

        const response = new APIContracts.CreateTransactionResponse(apiResponse);
        const messages = response.getMessages();
        const resultCode = messages?.getResultCode();
        
        console.info(`Gateway Result for Order ${orderId}: ${resultCode}`);

        if (resultCode === APIContracts.MessageTypeEnum.OK) {
          const tresponse = response.getTransactionResponse();
          
          // Check if transaction was actually successful inside the OK response
          if (tresponse && tresponse.getMessages() != null) {
            const transId = tresponse.getTransId();
            console.info(`Payment Successful: ${transId} for Order ${orderId}`);
            
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
            // Extract specific error from transaction response (e.g. Card Declined)
            const errors = tresponse?.getErrors()?.getError();
            const errorText = errors && errors.length > 0 ? errors[0].getErrorText() : 'Transaction Denied by Gateway';
            const errorCode = errors && errors.length > 0 ? errors[0].getErrorCode() : 'N/A';
            
            console.warn(`Gateway Refusal (${errorCode}): ${errorText}`, { orderId });
            reject(new HttpsError('permission-denied', `Payment Refused: ${errorText} (${errorCode})`));
          }
        } else {
          // Gateway-level error (e.g. User Authentication Failed)
          const errorMessages = messages?.getMessage();
          const errorMsg = errorMessages && errorMessages.length > 0 ? errorMessages[0].getText() : 'Unknown Gateway Error';
          const errorCode = errorMessages && errorMessages.length > 0 ? errorMessages[0].getCode() : 'N/A';
          
          console.error(`Authorize.net System Error ${errorCode}: ${errorMsg}`, { orderId });
          reject(new HttpsError('unavailable', `Gateway System Error: ${errorMsg} (${errorCode})`));
        }
      });
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('Controller Execution Crash:', err);
      reject(new HttpsError('internal', `Payment Controller Crash: ${err.message}`));
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
