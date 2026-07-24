
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from 'stripe';
import twilio from 'twilio';

/**
 * Initialize the Firebase Admin SDK.
 */
initializeApp();
const db = getFirestore();

/**
 * createPaymentIntent
 * Securely generates a Stripe Client Secret and Customer Session for zero-friction checkout.
 * Handles customer creation, future-usage authorization, and Express destination charges.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  try {
    const { amount, sellerId, patronName, patronPhone, patronEmail, saveInfo, stripeCustomerId: clientProvidedCustomerId } = request.data || {};
    const buyerUid = request.auth?.uid;

    if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');
    if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');

    const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

    // 1. VENUE RESOLUTION: Get the destination Stripe Account ID
    const sellerDoc = await db.collection('sellers').doc(sellerId).get();
    const venueStripeAccountId = sellerDoc.data()?.stripeAccountId;
    if (!venueStripeAccountId) {
      throw new HttpsError('failed-precondition', 'Venue is not configured for digital payments.');
    }

    let stripeCustomerId: string | undefined = clientProvidedCustomerId;

    // 2. IDENTITY SYNC: Fallback to Firestore profile if no client ID provided
    if (!stripeCustomerId && buyerUid) {
      const userDoc = await db.collection('users').doc(buyerUid).get();
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      }
    }

    // 3. CUSTOMER CREATION: Create customer if totally unknown
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ 
        email: patronEmail || undefined, 
        name: patronName || 'Guest Patron', 
        description: 'Koop Guest Patron',
        metadata: { buyerUid: buyerUid || 'anonymous' } 
      });
      stripeCustomerId = customer.id;
    }

    // 4. PERSISTENCE: If buyer is authenticated, ensure the UID is linked to the ID
    if (buyerUid && stripeCustomerId) {
      await db.collection('users').doc(buyerUid).set({ 
        stripeCustomerId, 
        email: patronEmail || '',
        displayName: patronName || '',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 5. CUSTOMER SESSION: For redisplaying saved cards in the Payment Element
    const customerSession = await stripe.customerSessions.create({
      customer: stripeCustomerId,
      components: { 
        payment_element: { 
          enabled: true, 
          features: { 
            payment_method_save: 'enabled', 
            payment_method_redisplay: 'enabled' 
          } 
        } 
      }
    });

    // 6. INTENT: Create the payment intent with destination charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: saveInfo ? 'off_session' : undefined,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: venueStripeAccountId,
      },
      metadata: { 
        sellerId, 
        buyerUid: buyerUid || 'anonymous', 
        customerName: patronName || 'Guest', 
        customerPhone: patronPhone || '', 
        customerEmail: patronEmail || '' 
      }
    });

    return { 
      clientSecret: paymentIntent.client_secret, 
      customerSessionClientSecret: customerSession.client_secret,
      stripeCustomerId 
    };
  } catch (err: any) {
    logger.error("Stripe PI Error", err);
    throw new HttpsError('internal', err.message || 'Internal payment gateway error.');
  }
});

/**
 * applyStarterMenu
 * Clones template modifiers into a venue's collection.
 */
export const applyStarterMenu = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data || {};
  
  if (!venueId || !venueType) {
    throw new HttpsError('invalid-argument', 'venueId and venueType are required.');
  }

  try {
    const normalizedType = venueType.toLowerCase();
    logger.info(`[applyStarterMenu] Provisioning modifiers for ${venueId} (Type: ${normalizedType})`);

    const libraryRef = db.collection('starter_modifier_library');
    const snapshot = await libraryRef.where('venueType', 'array-contains', normalizedType).get();

    if (snapshot.empty) {
      logger.warn(`[applyStarterMenu] No templates found in library for venue type: ${normalizedType}`);
      return { totalCreated: 0, status: 'no_templates_found' };
    }

    const batch = db.batch();
    let count = 0;
    const summary: Record<string, number> = {};

    snapshot.docs.forEach(docSnap => {
      const template = docSnap.data();
      if (!template || !template.name || !Array.isArray(template.options)) return;

      const groupId = `${venueId}-${docSnap.id}`;
      const groupRef = db.collection('modifier_groups').doc(groupId);

      batch.set(groupRef, {
        id: groupId,
        sellerId: venueId,
        name: template.name,
        minSelection: template.minSelection ?? (template.required ? 1 : 0),
        maxSelection: template.maxSelection ?? (template.selectionType === 'single' ? 1 : 99),
        options: template.options.map((opt: any) => ({
          id: String(opt.label || opt.name || 'option').toLowerCase().replace(/\s+/g, '-'),
          name: String(opt.label || opt.name || 'Option'),
          priceAdjustment: Number(opt.priceModifier || opt.priceAdjustment || 0),
          isAvailable: true
        })),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      const cat = template.category || 'universal';
      summary[cat] = (summary[cat] || 0) + 1;
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    logger.info(`[applyStarterMenu] Successfully provisioned ${count} modifier sets for ${venueId}`);
    return { totalCreated: count, byCategory: summary, status: 'success' };
  } catch (error: any) {
    logger.error("[applyStarterMenu] Critical Failure:", error);
    throw new HttpsError('internal', `Failed to provision starter modifiers: ${error.message}`);
  }
});

/**
 * applyStarterItems
 * Clones template items into a venue's collection and links them to relevant modifiers.
 */
export const applyStarterItems = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data || {};
  
  if (!venueId || !venueType) {
    throw new HttpsError('invalid-argument', 'venueId and venueType are required.');
  }

  try {
    const normalizedType = venueType.toLowerCase();
    logger.info(`[applyStarterItems] Provisioning menu items for ${venueId} (Type: ${normalizedType})`);

    const itemSnap = await db.collection('starter_menu_item_library')
      .where('venueType', 'array-contains', normalizedType)
      .get();
      
    if (itemSnap.empty) {
      logger.warn(`[applyStarterItems] No menu templates found in library for type: ${normalizedType}`);
      return { totalCreated: 0, status: 'no_templates_found' };
    }

    const modSnap = await db.collection('modifier_groups').where('sellerId', '==', venueId).get();
    const modMap: Record<string, string> = {};
    modSnap.forEach(m => { 
      const name = m.data()?.name;
      if (name) modMap[name.toLowerCase()] = m.id; 
    });

    const batch = db.batch();
    const venueItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');

    const modeMap: Record<string, string> = {
      beverageCart: "Beverage Cart",
      clubhouse: "Clubhouse",
      pool: "Pool",
      laneService: "Lane Delivery",
      takeout: "Take Out"
    };

    const operationalCatMap: Record<string, string> = {
      alcohol: "Beer",
      beverage: "Soft Drinks",
      food: "Handhelds"
    };

    let count = 0;
    itemSnap.docs.forEach((docSnap, index) => {
      const template = docSnap.data();
      if (!template || !template.name) return;

      const itemId = `${venueId}-${docSnap.id}`;
      const linkedIds: string[] = [];
      if (Array.isArray(template.suggestedModifierGroups)) {
        template.suggestedModifierGroups.forEach((name: string) => {
          const lowerName = String(name).toLowerCase();
          if (modMap[lowerName]) {
            linkedIds.push(modMap[lowerName]);
          }
        });
      }

      let opCat = template.category || "Other";
      if (operationalCatMap[template.category]) {
        opCat = operationalCatMap[template.category];
        if (template.category === 'alcohol') {
          const n = String(template.name).toLowerCase();
          if (n.includes('wine') || n.includes('cocktail') || n.includes('whiskey')) {
            opCat = "Spirits";
          }
        }
      }

      const mode = modeMap[template.serviceMode] || "Clubhouse";

      batch.set(venueItemsRef.doc(itemId), {
        id: itemId,
        name: template.name,
        description: template.description || "",
        price: Number(template.price || 0),
        category: opCat,
        rank: template.sortOrder || index + 1,
        imageUrl: template.imageUrl || "", 
        isAvailable: true,
        availableOn: [mode],
        modifierGroupIds: Array.from(new Set(linkedIds)),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      count++;
    });

    if (count > 0) {
      await batch.commit();
    }

    logger.info(`[applyStarterItems] Successfully provisioned ${count} menu items for ${venueId}`);
    return { totalCreated: count, status: 'success' };
  } catch (error: any) {
    logger.error("[applyStarterItems] Critical Failure:", error);
    throw new HttpsError('internal', `Failed to provision menu items: ${error.message}`);
  }
});

/**
 * dailyOperationalReset
 * Performs a system-wide sweep at the reset hour (default 4 AM EST).
 * 1. Deactivates venue service modes.
 * 2. Clears staff activeMode and location (effectively logging them out).
 * 3. Cancels stale active orders.
 */
export const dailyOperationalReset = onSchedule({ 
  schedule: "0 * * * *", 
  timeZone: "America/New_York", 
  region: 'us-central1' 
}, async () => {
  const configSnap = await db.collection('solution').doc('config').get();
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  
  // Get current hour in EST
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (nowInEst.getHours() !== resetHour) {
    logger.info(`[dailyOperationalReset] Current hour ${nowInEst.getHours()} is not reset hour ${resetHour}. Skipping.`);
    return;
  }

  logger.info(`[dailyOperationalReset] Starting system-wide operational sweep for reset hour: ${resetHour}`);

  // 1. FETCH ACTIVE SELLERS
  const sellers = await db.collection('sellers').where('status', '==', 'Active').get();
  if (sellers.empty) {
    logger.info("[dailyOperationalReset] No active sellers found. Sweep complete.");
    return;
  }

  // 2. ITERATE AND RESET EACH VENUE'S ECOSYSTEM
  for (const sellerDoc of sellers.docs) {
    const sellerId = sellerDoc.id;
    const batch = db.batch();

    // A. Reset Venue Status
    batch.update(sellerDoc.ref, { 
      bevcartActive: false, 
      clubhouseActive: false, 
      lanedeliveryActive: false, 
      takeoutActive: false, 
      lastActive: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // B. Clear Staff Sessions
    const staffRef = db.collection('sellers').doc(sellerId).collection('staff');
    const activeStaff = await staffRef.where('activeMode', '!=', null).get();
    activeStaff.forEach(sDoc => {
      batch.update(sDoc.ref, { 
        activeMode: null, 
        latitude: null, 
        longitude: null, 
        lastActive: FieldValue.serverTimestamp() 
      });
    });

    // C. Cancel Stale Orders
    const ordersRef = db.collection('orders');
    const staleOrders = await ordersRef
      .where('sellerId', '==', sellerId)
      .where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
      .get();
      
    staleOrders.forEach(oDoc => {
      batch.update(oDoc.ref, { 
        status: 'Cancelled', 
        notes: 'System Reset: Order expired at daily reset hour.',
        updatedAt: FieldValue.serverTimestamp() 
      });
    });

    await batch.commit();
    logger.info(`[dailyOperationalReset] Reset complete for venue: ${sellerId} (${activeStaff.size} staff, ${staleOrders.size} orders)`);
  }

  logger.info("[dailyOperationalReset] Global operational sweep finalized.");
});

export const onGuestOrderStatusUpdate = onDocumentWritten({ document: "orders/{orderId}", secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], region: 'us-central1' }, async (event) => {
  const after = event.data?.after;
  if (!after || !after.exists) return;
  
  try {
    const configSnap = await db.collection('solution').doc('config').get();
    if (configSnap.exists && configSnap.data()?.smsNotificationsEnabled === false) return;

    const data = after.data();
    if (!data?.customerPhone) return;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) return;

    const client = twilio(accountSid, authToken);
    let body = "";
    const link = `https://koop.app/orders/${event.params.orderId}`;

    const beforeData = event.data?.before?.exists ? event.data.before.data() : null;

    if (!beforeData) {
      if (data.status === 'Placed') body = `Order received! Track live: ${link}`;
    } else if (data.status !== beforeData.status && data.status === 'Out for Delivery') {
      body = `Order out for delivery! Track live: ${link}`;
    }

    if (body) {
      const to = String(data.customerPhone).length === 10 ? `+1${data.customerPhone}` : `+${data.customerPhone}`;
      await client.messages.create({ body, from: process.env.TWILIO_FROM_NUMBER!, to });
    }
  } catch (err) {
    logger.error("Twilio Task Failed", err);
  }
});

export const handleStripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], region: 'us-central1' }, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!sig || !webhookSecret || !stripeKey) {
    res.status(400).send("Webhook configuration missing.");
    return;
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' as any });
  try {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata || {};
      await db.collection('orders').add({
        customerName: meta.customerName || 'Guest', customerPhone: meta.customerPhone || '', customerEmail: meta.customerEmail || '',
        status: "received", sellerId: meta.sellerId || '', buyerProfileId: meta.buyerUid || 'anonymous',
        stripePaymentIntentId: pi.id, total: (pi.amount || 0) / 100, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
    }
    res.status(200).send({ received: true });
  } catch (err: any) { 
    logger.error("Stripe Webhook Error", err);
    res.status(400).send(`Webhook Error: ${err.message}`); 
  }
});
