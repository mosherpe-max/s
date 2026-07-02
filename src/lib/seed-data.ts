
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  Firestore,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import type { ModifierGroup, MenuItem, ModifierOption, SellerType, StarterModifierGroup } from './types';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from './data';

/**
 * Master library definition for the starter system.
 */
const GLOBAL_STARTER_LIBRARY: Omit<StarterModifierGroup, 'id'>[] = [
  {
    name: "Burger Temperature",
    venueType: ["golf"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 10,
    options: [
      { label: "Rare", priceModifier: 0 },
      { label: "Medium Rare", priceModifier: 0 },
      { label: "Medium", priceModifier: 0 },
      { label: "Medium Well", priceModifier: 0 },
      { label: "Well Done", priceModifier: 0 }
    ]
  },
  {
    name: "Side Selection",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 20,
    options: [
      { label: "Kettle Chips", priceModifier: 0 },
      { label: "French Fries", priceModifier: 1.50 },
      { label: "Fresh Fruit Cup", priceModifier: 2.00 },
      { label: "Cole Slaw", priceModifier: 0 }
    ]
  },
  {
    name: "Pizza Toppings",
    venueType: ["bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 30,
    options: [
      { label: "Pepperoni", priceModifier: 2.00 },
      { label: "Italian Sausage", priceModifier: 2.00 },
      { label: "Mushrooms", priceModifier: 1.50 },
      { label: "Onions", priceModifier: 1.00 },
      { label: "Green Peppers", priceModifier: 1.00 },
      { label: "Extra Cheese", priceModifier: 2.50 }
    ]
  },
  {
    name: "Wing Sauce",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 40,
    options: [
      { label: "Buffalo (Hot)", priceModifier: 0 },
      { label: "Honey BBQ", priceModifier: 0 },
      { label: "Garlic Parmesan", priceModifier: 0 },
      { label: "Dry Rub", priceModifier: 0 }
    ]
  }
];

/**
 * Seeds the global starter library collection.
 * Restricted to Solution Admins in rules.
 */
export async function seedGlobalStarterLibrary(db: Firestore) {
  const batch = writeBatch(db);
  const libraryRef = collection(db, 'starter_modifier_library');

  GLOBAL_STARTER_LIBRARY.forEach(template => {
    const id = template.name.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(libraryRef, id);
    batch.set(docRef, template);
  });

  await batch.commit();
}

/**
 * Seeds a venue with typical modifiers by pulling from the Global Starter Library.
 * Maps template fields to operational ModifierGroup schema.
 */
export async function seedVenueModifiers(db: Firestore, sellerId: string, venueType: string) {
  const typeKey = venueType.toLowerCase().includes('golf') ? 'golf' : (venueType.toLowerCase().includes('bowling') ? 'bowling' : null);
  if (!typeKey) return;

  // 1. Fetch relevant templates from Global Library
  const libraryRef = collection(db, 'starter_modifier_library');
  const q = query(libraryRef, where('venueType', 'array-contains', typeKey));
  const librarySnap = await getDocs(q);

  if (librarySnap.empty) {
    // If library is empty, seed it first then retry
    await seedGlobalStarterLibrary(db);
    return seedVenueModifiers(db, sellerId, venueType);
  }

  const batch = writeBatch(db);
  const groupIdsMap: Record<string, string> = {};

  // 2. Clone Templates into Venue Collection
  librarySnap.forEach(templateDoc => {
    const template = templateDoc.data() as StarterModifierGroup;
    const groupId = `${sellerId}-${templateDoc.id}`;
    const groupRef = doc(db, 'modifier_groups', groupId);
    
    const operationalGroup: ModifierGroup = {
      id: groupId,
      sellerId,
      name: template.name,
      minSelection: template.required ? 1 : 0,
      maxSelection: template.selectionType === 'single' ? 1 : 99,
      options: template.options.map(opt => ({
        id: opt.label.toLowerCase().replace(/\s+/g, '-'),
        name: opt.label,
        priceAdjustment: opt.priceModifier,
        isAvailable: true
      })),
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    };

    batch.set(groupRef, operationalGroup);
    groupIdsMap[template.name] = groupId;
  });

  // 3. Link cloned groups to existing Menu Items
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  const itemsSnap = await getDocs(menuItemsRef);
  
  itemsSnap.forEach(itemDoc => {
    const item = itemDoc.data() as MenuItem;
    const currentGroups = item.modifierGroupIds || [];
    let updated = false;

    const name = item.name.toLowerCase();
    
    // Auto-link logic based on keyword matching
    if (name.includes('burger')) {
      if (groupIdsMap['Burger Temperature']) { currentGroups.push(groupIdsMap['Burger Temperature']); updated = true; }
      if (groupIdsMap['Side Selection']) { currentGroups.push(groupIdsMap['Side Selection']); updated = true; }
    }
    if (name.includes('pizza')) {
      if (groupIdsMap['Pizza Toppings']) { currentGroups.push(groupIdsMap['Pizza Toppings']); updated = true; }
    }
    if (name.includes('wings')) {
      if (groupIdsMap['Wing Sauce']) { currentGroups.push(groupIdsMap['Wing Sauce']); updated = true; }
    }

    if (updated) {
      const uniqueGroups = Array.from(new Set(currentGroups));
      batch.update(itemDoc.ref, { modifierGroupIds: uniqueGroups });
    }
  });

  await batch.commit();
}

/**
 * Seeds base menu items for a specific venue.
 */
export async function seedVenueItems(db: Firestore, sellerId: string, items: any[]) {
  const batch = writeBatch(db);
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  
  items.forEach((item, index) => {
    const itemId = item.id || `${sellerId}-item-${index}`;
    const itemRef = doc(menuItemsRef, itemId);
    batch.set(itemRef, {
      ...item,
      id: itemId,
      rank: index + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

/**
 * Global function to reset all demo venues to their ideal states.
 */
export async function seedAllDemoData(db: Firestore) {
  // Ensure the library is populated first
  await seedGlobalStarterLibrary(db);
  
  await seedVenueItems(db, 'demo-course', publicGolfItems);
  await seedVenueModifiers(db, 'demo-course', 'Public Golf Course');
  
  await seedVenueItems(db, 'demo-private-course', privateGolfItems);
  await seedVenueModifiers(db, 'demo-private-course', 'Private Golf Course');
  
  await seedVenueItems(db, 'demo-bowling-alley', bowlingAlleyItems);
  await seedVenueModifiers(db, 'demo-bowling-alley', 'Bowling Center');
}

/**
 * Deep operational reset for the entire platform.
 * Returns all venues to a fresh offline baseline.
 */
export async function resetAllVenueOperationalStatus(db: Firestore) {
  const sellersRef = collection(db, 'sellers');
  const snapshot = await getDocs(sellersRef);
  const batch = writeBatch(db);

  for (const sellerDoc of snapshot.docs) {
    // 1. Clear Seller Operational Flags
    batch.update(sellerDoc.ref, {
      bevcartActive: false,
      clubhouseActive: false,
      lanedeliveryActive: false,
      takeoutActive: false,
      latitude: 0,
      longitude: 0,
      lastActive: null,
      updatedAt: serverTimestamp()
    });

    // 2. Purge Live Staff Signals
    const staffRef = collection(db, 'sellers', sellerDoc.id, 'staff');
    const staffSnap = await getDocs(staffRef);
    staffSnap.forEach(sDoc => {
      batch.update(sDoc.ref, {
        latitude: null,
        longitude: null,
        lastActive: null
      });
    });
  }

  await batch.commit();
}
