
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  Firestore
} from 'firebase/firestore';
import type { ModifierGroup, MenuItem, ModifierOption } from './types';

/**
 * Industry-standard modifier presets for different venue types.
 */
const MODIFIER_PRESETS: Record<string, Omit<ModifierGroup, 'id' | 'sellerId' | 'createdAt' | 'updatedAt'>[]> = {
  golf: [
    {
      name: "Burger Temperature",
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: "rare", name: "Rare", priceAdjustment: 0, isAvailable: true },
        { id: "med-rare", name: "Medium Rare", priceAdjustment: 0, isAvailable: true },
        { id: "medium", name: "Medium", priceAdjustment: 0, isAvailable: true },
        { id: "med-well", name: "Medium Well", priceAdjustment: 0, isAvailable: true },
        { id: "well", name: "Well Done", priceAdjustment: 0, isAvailable: true }
      ]
    },
    {
      name: "Side Selection",
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: "chips", name: "Kettle Chips", priceAdjustment: 0, isAvailable: true },
        { id: "fries", name: "French Fries", priceAdjustment: 1.50, isAvailable: true },
        { id: "fruit", name: "Fresh Fruit Cup", priceAdjustment: 2.00, isAvailable: true },
        { id: "coleslaw", name: "Cole Slaw", priceAdjustment: 0, isAvailable: true }
      ]
    },
    {
      name: "Transfusion Style",
      minSelection: 0,
      maxSelection: 3,
      options: [
        { id: "extra-grape", name: "Extra Grape Juice", priceAdjustment: 0, isAvailable: true },
        { id: "extra-ginger", name: "Extra Ginger Ale", priceAdjustment: 0, isAvailable: true },
        { id: "lemon-lime", name: "Add Lemon & Lime", priceAdjustment: 0, isAvailable: true },
        { id: "double", name: "Make it a Double", priceAdjustment: 5.00, isAvailable: true }
      ]
    },
    {
      name: "Hot Dog Toppings",
      minSelection: 0,
      maxSelection: 5,
      options: [
        { id: "mustard", name: "Yellow Mustard", priceAdjustment: 0, isAvailable: true },
        { id: "ketchup", name: "Ketchup", priceAdjustment: 0, isAvailable: true },
        { id: "relish", name: "Sweet Relish", priceAdjustment: 0, isAvailable: true },
        { id: "onions", name: "Diced Onions", priceAdjustment: 0, isAvailable: true },
        { id: "sauerkraut", name: "Sauerkraut", priceAdjustment: 0.50, isAvailable: true }
      ]
    }
  ],
  bowling: [
    {
      name: "Pizza Toppings",
      minSelection: 0,
      maxSelection: 5,
      options: [
        { id: "pepperoni", name: "Pepperoni", priceAdjustment: 1.50, isAvailable: true },
        { id: "sausage", name: "Italian Sausage", priceAdjustment: 1.50, isAvailable: true },
        { id: "mushrooms", name: "Mushrooms", priceAdjustment: 1.00, isAvailable: true },
        { id: "onions", name: "Onions", priceAdjustment: 1.00, isAvailable: true },
        { id: "peppers", name: "Green Peppers", priceAdjustment: 1.00, isAvailable: true },
        { id: "extra-cheese", name: "Extra Cheese", priceAdjustment: 2.00, isAvailable: true }
      ]
    },
    {
      name: "Wing Sauce",
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: "buffalo", name: "Classic Buffalo", priceAdjustment: 0, isAvailable: true },
        { id: "bbq", name: "Honey BBQ", priceAdjustment: 0, isAvailable: true },
        { id: "garlic-parm", name: "Garlic Parmesan", priceAdjustment: 0, isAvailable: true },
        { id: "dry-rub", name: "Lemon Pepper Dry Rub", priceAdjustment: 0, isAvailable: true },
        { id: "naked", name: "Plain / Naked", priceAdjustment: 0, isAvailable: true }
      ]
    },
    {
      name: "Draft Size",
      minSelection: 1,
      maxSelection: 1,
      options: [
        { id: "pint", name: "16oz Pint", priceAdjustment: 0, isAvailable: true },
        { id: "tall", name: "22oz Tall", priceAdjustment: 2.00, isAvailable: true },
        { id: "pitcher", name: "64oz Pitcher", priceAdjustment: 12.00, isAvailable: true }
      ]
    },
    {
      name: "Nacho Add-ons",
      minSelection: 0,
      maxSelection: 4,
      options: [
        { id: "extra-beef", name: "Seasoned Beef", priceAdjustment: 3.00, isAvailable: true },
        { id: "guac", name: "Guacamole", priceAdjustment: 2.00, isAvailable: true },
        { id: "jalapenos", name: "Extra Jalapenos", priceAdjustment: 0.50, isAvailable: true },
        { id: "sour-cream", name: "Extra Sour Cream", priceAdjustment: 0.50, isAvailable: true }
      ]
    }
  ]
};

/**
 * Seeds a venue with typical modifiers based on its type.
 */
export async function seedVenueModifiers(db: Firestore, sellerId: string, venueType: string) {
  const batch = writeBatch(db);
  const typeKey = venueType.toLowerCase().includes('golf') ? 'golf' : (venueType.toLowerCase().includes('bowling') ? 'bowling' : null);
  
  if (!typeKey) return;

  const presets = MODIFIER_PRESETS[typeKey];
  const groupIdsMap: Record<string, string> = {};

  // 1. Create Modifier Groups
  presets.forEach(preset => {
    const groupId = `${sellerId}-${preset.name.toLowerCase().replace(/\s+/g, '-')}`;
    const groupRef = doc(db, 'modifier_groups', groupId);
    
    batch.set(groupRef, {
      ...preset,
      id: groupId,
      sellerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    groupIdsMap[preset.name] = groupId;
  });

  // 2. Fetch current Menu Items to link them
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  const itemsSnap = await getDocs(menuItemsRef);
  
  itemsSnap.forEach(itemDoc => {
    const item = itemDoc.data() as MenuItem;
    const currentGroups = item.modifierGroupIds || [];
    let updated = false;

    // Link logic based on naming conventions
    if (item.name.toLowerCase().includes('burger')) {
      if (groupIdsMap['Burger Temperature']) { currentGroups.push(groupIdsMap['Burger Temperature']); updated = true; }
      if (groupIdsMap['Side Selection']) { currentGroups.push(groupIdsMap['Side Selection']); updated = true; }
    }
    if (item.name.toLowerCase().includes('dog')) {
      if (groupIdsMap['Hot Dog Toppings']) { currentGroups.push(groupIdsMap['Hot Dog Toppings']); updated = true; }
      if (groupIdsMap['Side Selection']) { currentGroups.push(groupIdsMap['Side Selection']); updated = true; }
    }
    if (item.name.toLowerCase().includes('sandwich') || item.name.toLowerCase().includes('club')) {
      if (groupIdsMap['Side Selection']) { currentGroups.push(groupIdsMap['Side Selection']); updated = true; }
    }
    if (item.name.toLowerCase().includes('transfusion')) {
      if (groupIdsMap['Transfusion Style']) { currentGroups.push(groupIdsMap['Transfusion Style']); updated = true; }
    }
    if (item.name.toLowerCase().includes('pizza')) {
      if (groupIdsMap['Pizza Toppings']) { currentGroups.push(groupIdsMap['Pizza Toppings']); updated = true; }
    }
    if (item.name.toLowerCase().includes('wing')) {
      if (groupIdsMap['Wing Sauce']) { currentGroups.push(groupIdsMap['Wing Sauce']); updated = true; }
    }
    if (item.name.toLowerCase().includes('nacho')) {
      if (groupIdsMap['Nacho Add-ons']) { currentGroups.push(groupIdsMap['Nacho Add-ons']); updated = true; }
    }
    if (item.category === 'Beer' && item.name.toLowerCase().includes('draft')) {
      if (groupIdsMap['Draft Size']) { currentGroups.push(groupIdsMap['Draft Size']); updated = true; }
    }

    if (updated) {
      // Deduplicate
      const uniqueGroups = Array.from(new Set(currentGroups));
      batch.update(itemDoc.ref, { modifierGroupIds: uniqueGroups });
    }
  });

  await batch.commit();
}
