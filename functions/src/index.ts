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
 * Securely generates a Stripe Client Secret for the patron checkout.
 */
export const createPaymentIntent = onCall({
  secrets: ["STRIPE_SECRET_KEY"],
  region: 'us-central1',
}, async (request) => {
  const { amount, sellerId, patronName, patronPhone, patronEmail, saveInfo } = request.data;
  const buyerUid = request.auth?.uid;

  if (!amount || amount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');
  if (!sellerId) throw new HttpsError('invalid-argument', 'Missing sellerId.');

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new HttpsError('failed-precondition', 'Gateway not configured.');

  const stripe = new Stripe(apiKey, { apiVersion: '2025-01-27.acacia' as any });

  try {
    let stripeCustomerId: string | undefined;

    if (buyerUid) {
      const userDoc = await db.collection('users').doc(buyerUid).get();
      if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
        stripeCustomerId = userDoc.data()?.stripeCustomerId;
      } else {
        const existing = await stripe.customers.list({ email: patronEmail, limit: 1 });
        if (existing.data.length > 0) {
          stripeCustomerId = existing.data[0].id;
        } else if (saveInfo) {
          const customer = await stripe.customers.create({ email: patronEmail, name: patronName, phone: patronPhone, metadata: { buyerUid } });
          stripeCustomerId = customer.id;
        }
        if (stripeCustomerId) await db.collection('users').doc(buyerUid).set({ stripeCustomerId }, { merge: true });
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: saveInfo ? 'off_session' : undefined,
      automatic_payment_methods: { enabled: true },
      metadata: { sellerId, buyerUid: buyerUid || 'anonymous', customerName: patronName || 'Guest', customerPhone: patronPhone || '', customerEmail: patronEmail || '' }
    });

    let customerSessionClientSecret: string | undefined;
    if (stripeCustomerId) {
      const customerSession = await stripe.customerSessions.create({
        customer: stripeCustomerId,
        components: { payment_element: { enabled: true, features: { payment_method_save: 'disabled', payment_method_redisplay: 'always' } } }
      });
      customerSessionClientSecret = customerSession.client_secret;
    }

    return { clientSecret: paymentIntent.client_secret, customerSessionClientSecret };
  } catch (err: any) {
    logger.error("Stripe PI Error", err);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * applyStarterMenu
 * Clones template modifiers into a venue's collection.
 */
export const applyStarterMenu = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data;
  
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
    const summary: Record<string, number> = {};

    snapshot.docs.forEach(docSnap => {
      const template = docSnap.data();
      
      // Safety check: skip if template is malformed
      if (!template.name || !Array.isArray(template.options)) {
        logger.warn(`[applyStarterMenu] Skipping malformed template: ${docSnap.id}`);
        return;
      }

      const groupId = `${venueId}-${docSnap.id}`;
      const groupRef = db.collection('modifier_groups').doc(groupId);

      batch.set(groupRef, {
        id: groupId,
        sellerId: venueId,
        name: template.name,
        minSelection: template.required ? 1 : 0,
        maxSelection: template.selectionType === 'single' ? 1 : 99,
        options: template.options.map((opt: any) => ({
          id: (opt.label || opt.name || 'option').toLowerCase().replace(/\s+/g, '-'),
          name: opt.label || opt.name || 'Option',
          priceAdjustment: opt.priceModifier || opt.priceAdjustment || 0,
          isAvailable: true
        })),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      const cat = template.category || 'universal';
      summary[cat] = (summary[cat] || 0) + 1;
    });

    await batch.commit();
    logger.info(`[applyStarterMenu] Successfully provisioned ${snapshot.size} modifier sets for ${venueId}`);
    
    return { 
      totalCreated: snapshot.size, 
      byCategory: summary,
      status: 'success'
    };
  } catch (error: any) {
    logger.error("[applyStarterMenu] Critical Failure:", error);
    throw new HttpsError('internal', `Failed to provision starter modifiers: ${error.message}`);
  }
});

/**
 * applyStarterItems
 * Clones template items into a venue's collection and links them to relevant modifiers by name lookup.
 */
export const applyStarterItems = onCall({
  region: 'us-central1',
}, async (request) => {
  const { venueId, venueType } = request.data;
  
  if (!venueId || !venueType) {
    throw new HttpsError('invalid-argument', 'venueId and venueType are required.');
  }

  try {
    const normalizedType = venueType.toLowerCase();
    logger.info(`[applyStarterItems] Provisioning menu items for ${venueId} (Type: ${normalizedType})`);

    // 1. Fetch library items for this venue type
    const itemSnap = await db.collection('starter_menu_item_library')
      .where('venueType', 'array-contains', normalizedType)
      .get();
      
    if (itemSnap.empty) {
      logger.warn(`[applyStarterItems] No menu templates found in library for type: ${normalizedType}`);
      return { totalCreated: 0, status: 'no_templates_found' };
    }

    // 2. Fetch active modifier groups for this venue to build name->ID mapping
    const modSnap = await db.collection('modifier_groups').where('sellerId', '==', venueId).get();
    const modMap: Record<string, string> = {};
    modSnap.forEach(m => { 
      const name = m.data()?.name;
      if (name) modMap[name.toLowerCase()] = m.id; 
    });

    const batch = db.batch();
    const venueItemsRef = db.collection('sellers').doc(venueId).collection('menuItems');

    // Service mode mapping: library -> operational display name
    const modeMap: Record<string, string> = {
      beverageCart: "Beverage Cart",
      clubhouse: "Clubhouse",
      pool: "Pool",
      laneService: "Lane Delivery",
      takeout: "Take Out"
    };

    // Operational Category Mapping
    const operationalCatMap: Record<string, string> = {
      alcohol: "Beer",
      beverage: "Soft Drinks",
      food: "Handhelds"
    };

    itemSnap.docs.forEach((docSnap, index) => {
      const template = docSnap.data();
      
      // Safety check
      if (!template.name) return;

      const itemId = `${venueId}-${docSnap.id}`;
      
      // Resolve modifier IDs from suggested names
      const linkedIds: string[] = [];
      if (Array.isArray(template.suggestedModifierGroups)) {
        template.suggestedModifierGroups.forEach((name: string) => {
          const lowerName = name.toLowerCase();
          if (modMap[lowerName]) {
            linkedIds.push(modMap[lowerName]);
          }
        });
      }

      // Determine operational category
      let opCat = template.category || "Other";
      if (operationalCatMap[template.category]) {
        opCat = operationalCatMap[template.category];
        // Refining alcohol mapping
        if (template.category === 'alcohol') {
          const n = template.name.toLowerCase();
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
        price: template.price || 0,
        category: opCat,
        rank: template.sortOrder || index + 1,
        imageUrl: template.imageUrl || "", 
        isAvailable: true,
        availableOn: [mode],
        modifierGroupIds: Array.from(new Set(linkedIds)),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    logger.info(`[applyStarterItems] Successfully provisioned ${itemSnap.size} menu items for ${venueId}`);
    
    return { 
      totalCreated: itemSnap.size,
      status: 'success'
    };
  } catch (error: any) {
    logger.error("[applyStarterItems] Critical Failure:", error);
    throw new HttpsError('internal', `Failed to provision menu items: ${error.message}`);
  }
});

export const dailyOperationalReset = onSchedule({ schedule: "0 * * * *", timeZone: "America/New_York", region: 'us-central1' }, async () => {
  const configSnap = await db.collection('solution').doc('config').get();
  const resetHour = configSnap.exists ? (configSnap.data()?.dailyResetHour ?? 4) : 4;
  const nowInEst = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  if (nowInEst.getHours() !== resetHour) return;

  const sellers = await db.collection('sellers').where('status', '==', 'Active').get();
  if (sellers.empty) return;

  const batch = db.batch();
  sellers.docs.forEach(doc => {
    batch.update(doc.ref, { bevcartActive: false, clubhouseActive: false, lanedeliveryActive: false, takeoutActive: false, lastActive: FieldValue.serverTimestamp() });
  });
  await batch.commit();
});

export const onGuestOrderStatusUpdate = onDocumentWritten({ document: "orders/{orderId}", secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], region: 'us-central1' }, async (event) => {
  const after = event.data?.after;
  if (!after || !after.exists) return;
  const configSnap = await db.collection('solution').doc('config').get();
  if (!(configSnap.data()?.smsNotificationsEnabled ?? true)) return;

  const data = after.data();
  if (!data?.customerPhone) return;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  let body = "";
  const link = `https://koop.app/orders/${event.params.orderId}`;

  if (!event.data?.before.exists) {
    if (data.status === 'Placed') body = `Order received! Track live: ${link}`;
  } else if (data.status !== event.data.before.data()?.status && data.status === 'Out for Delivery') {
    body = `Order out for delivery! Track live: ${link}`;
  }

  if (body) {
    const to = data.customerPhone.length === 10 ? `+1${data.customerPhone}` : `+${data.customerPhone}`;
    await client.messages.create({ body, from: process.env.TWILIO_FROM_NUMBER!, to }).catch(e => logger.error("Twilio fail", e));
  }
});

export const handleStripeWebhook = onRequest({ secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], region: 'us-central1' }, async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata || {};
      await db.collection('orders').add({
        customerName: meta.customerName || 'Guest', customerPhone: meta.customerPhone, customerEmail: meta.customerEmail,
        status: "received", sellerId: meta.sellerId, buyerProfileId: meta.buyerUid,
        stripePaymentIntentId: pi.id, total: pi.amount / 100, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
    }
    res.status(200).send({ received: true });
  } catch (err: any) { res.status(400).send(`Webhook Error: ${err.message}`); }
});
