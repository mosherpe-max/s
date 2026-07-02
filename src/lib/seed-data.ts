
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
  // --- UNIVERSAL ---
  {
    name: "Special Instructions",
    venueType: ["golf", "bowling"],
    category: "universal",
    selectionType: "single",
    required: false,
    sortOrder: 5,
    options: [
      { label: "Add Note to Order", priceModifier: 0 }
    ]
  },
  {
    name: "Allergy Flag",
    venueType: ["golf", "bowling"],
    category: "universal",
    selectionType: "multi",
    required: false,
    sortOrder: 6,
    options: [
      { label: "Nut Allergy", priceModifier: 0 },
      { label: "Gluten Sensitivity", priceModifier: 0 },
      { label: "Dairy-Free", priceModifier: 0 },
      { label: "Vegetarian", priceModifier: 0 },
      { label: "Vegan", priceModifier: 0 }
    ]
  },

  // --- FOOD: BURGER/SANDWICH ---
  {
    name: "Doneness",
    venueType: ["golf", "bowling"],
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
    name: "Cheese",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 11,
    options: [
      { label: "American", priceModifier: 0 },
      { label: "Cheddar", priceModifier: 0 },
      { label: "Swiss", priceModifier: 0 },
      { label: "Pepper Jack", priceModifier: 0 },
      { label: "Provolone", priceModifier: 0 },
      { label: "No Cheese", priceModifier: 0 }
    ]
  },
  {
    name: "Toppings",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 12,
    options: [
      { label: "Lettuce", priceModifier: 0 },
      { label: "Tomato", priceModifier: 0 },
      { label: "Onion", priceModifier: 0 },
      { label: "Pickles", priceModifier: 0 },
      { label: "Jalapeños", priceModifier: 0 },
      { label: "Mushrooms", priceModifier: 0 },
      { label: "Banana Peppers", priceModifier: 0 },
      { label: "Avocado", priceModifier: 1.50 }
    ]
  },
  {
    name: "Sauces",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 13,
    options: [
      { label: "Ketchup", priceModifier: 0 },
      { label: "Mustard", priceModifier: 0 },
      { label: "Mayo", priceModifier: 0 },
      { label: "Ranch", priceModifier: 0 },
      { label: "BBQ", priceModifier: 0 },
      { label: "Buffalo", priceModifier: 0 },
      { label: "Honey Mustard", priceModifier: 0 },
      { label: "Hot Sauce", priceModifier: 0 },
      { label: "No Sauce", priceModifier: 0 }
    ]
  },
  {
    name: "Bun",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 14,
    options: [
      { label: "Regular Bun", priceModifier: 0 },
      { label: "Pretzel Bun", priceModifier: 0 },
      { label: "Lettuce Wrap", priceModifier: 0 },
      { label: "Gluten-Free Bun", priceModifier: 2.00 },
      { label: "No Bun", priceModifier: 0 }
    ]
  },
  {
    name: "Side Swap",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 15,
    options: [
      { label: "Fries", priceModifier: 0 },
      { label: "Onion Rings", priceModifier: 1.50 },
      { label: "Side Salad", priceModifier: 0 },
      { label: "Coleslaw", priceModifier: 0 },
      { label: "Fruit Cup", priceModifier: 0 },
      { label: "Chips", priceModifier: 0 },
      { label: "No Side", priceModifier: 0 }
    ]
  },

  // --- FOOD: WINGS ---
  {
    name: "Wing Style",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 20,
    options: [
      { label: "Bone-In", priceModifier: 0 },
      { label: "Boneless", priceModifier: 0 }
    ]
  },
  {
    name: "Wing Sauce",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 21,
    options: [
      { label: "Buffalo Mild", priceModifier: 0 },
      { label: "Buffalo Medium", priceModifier: 0 },
      { label: "Buffalo Hot", priceModifier: 0 },
      { label: "BBQ", priceModifier: 0 },
      { label: "Honey BBQ", priceModifier: 0 },
      { label: "Honey Mustard", priceModifier: 0 },
      { label: "Garlic Parmesan", priceModifier: 0 },
      { label: "Dry Rub", priceModifier: 0 },
      { label: "Plain/Naked", priceModifier: 0 }
    ]
  },

  // --- FOOD: PIZZA ---
  {
    name: "Crust",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 30,
    options: [
      { label: "Thin", priceModifier: 0 },
      { label: "Regular", priceModifier: 0 },
      { label: "Deep Dish", priceModifier: 0 }
    ]
  },
  {
    name: "Pizza Size",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "single",
    required: true,
    sortOrder: 31,
    options: [
      { label: "Personal", priceModifier: 0 },
      { label: "Medium", priceModifier: 0 },
      { label: "Large", priceModifier: 0 }
    ]
  },
  {
    name: "Pizza Sauce",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 32,
    options: [
      { label: "Marinara", priceModifier: 0 },
      { label: "White", priceModifier: 0 },
      { label: "BBQ", priceModifier: 0 },
      { label: "No Sauce", priceModifier: 0 }
    ]
  },
  {
    name: "Pizza Toppings",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 33,
    options: [
      { label: "Pepperoni", priceModifier: 0 },
      { label: "Sausage", priceModifier: 0 },
      { label: "Mushrooms", priceModifier: 0 },
      { label: "Peppers", priceModifier: 0 },
      { label: "Onions", priceModifier: 0 },
      { label: "Black Olives", priceModifier: 0 },
      { label: "Extra Cheese", priceModifier: 2.00 },
      { label: "Jalapeños", priceModifier: 0 }
    ]
  },

  // --- FOOD: HOT DOGS ---
  {
    name: "Hot Dog Style",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 40,
    options: [
      { label: "Grilled", priceModifier: 0 },
      { label: "Steamed", priceModifier: 0 }
    ]
  },
  {
    name: "Hot Dog Toppings",
    venueType: ["bowling", "golf"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 41,
    options: [
      { label: "Ketchup", priceModifier: 0 },
      { label: "Mustard", priceModifier: 0 },
      { label: "Relish", priceModifier: 0 },
      { label: "Onions", priceModifier: 0 },
      { label: "Sport Peppers", priceModifier: 0 },
      { label: "Sauerkraut", priceModifier: 0 },
      { label: "Cheese Sauce", priceModifier: 1.00 }
    ]
  },

  // --- FOOD: SALADS ---
  {
    name: "Dressing",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 50,
    options: [
      { label: "Ranch", priceModifier: 0 },
      { label: "Italian", priceModifier: 0 },
      { label: "Balsamic Vinaigrette", priceModifier: 0 },
      { label: "Caesar", priceModifier: 0 },
      { label: "Thousand Island", priceModifier: 0 },
      { label: "On the Side", priceModifier: 0 }
    ]
  },
  {
    name: "Salad Add-ons",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 51,
    options: [
      { label: "Add Chicken", priceModifier: 3.00 },
      { label: "Add Bacon", priceModifier: 2.00 },
      { label: "Add Avocado", priceModifier: 1.50 },
      { label: "Croutons", priceModifier: 0 },
      { label: "No Croutons", priceModifier: 0 }
    ]
  },

  // --- FOOD: NACHOS ---
  {
    name: "Nacho Protein",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 60,
    options: [
      { label: "Chicken", priceModifier: 3.00 },
      { label: "Beef", priceModifier: 3.00 },
      { label: "No Meat", priceModifier: 0 }
    ]
  },
  {
    name: "Nacho Toppings",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 61,
    options: [
      { label: "Jalapeños", priceModifier: 0 },
      { label: "Black Olives", priceModifier: 0 },
      { label: "Pico de Gallo", priceModifier: 0 },
      { label: "Sour Cream", priceModifier: 0 },
      { label: "Guacamole", priceModifier: 1.50 }
    ]
  },
  {
    name: "Cheese Amount",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 62,
    options: [
      { label: "Regular Cheese", priceModifier: 0 },
      { label: "Extra Cheese", priceModifier: 1.00 },
      { label: "Light Cheese", priceModifier: 0 }
    ]
  },

  // --- BEVERAGE: COFFEE ---
  {
    name: "Coffee Size",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: true,
    sortOrder: 70,
    options: [
      { label: "Small", priceModifier: 0 },
      { label: "Medium", priceModifier: 0 },
      { label: "Large", priceModifier: 0 }
    ]
  },
  {
    name: "Milk Type",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 71,
    options: [
      { label: "Whole", priceModifier: 0 },
      { label: "2%", priceModifier: 0 },
      { label: "Skim", priceModifier: 0 },
      { label: "Oat", priceModifier: 0.75 },
      { label: "Almond", priceModifier: 0.75 }
    ]
  },
  {
    name: "Sweetener",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 72,
    options: [
      { label: "Sugar", priceModifier: 0 },
      { label: "Splenda", priceModifier: 0 },
      { label: "Stevia", priceModifier: 0 },
      { label: "None", priceModifier: 0 }
    ]
  },
  {
    name: "Coffee Extras",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "multi",
    required: false,
    sortOrder: 73,
    options: [
      { label: "Extra Shot", priceModifier: 1.00 },
      { label: "Whipped Cream", priceModifier: 0 },
      { label: "Iced", priceModifier: 0 }
    ]
  },

  // --- BEVERAGE: SOFT DRINKS ---
  {
    name: "Drink Size",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 80,
    options: [
      { label: "Small", priceModifier: 0 },
      { label: "Medium", priceModifier: 0 },
      { label: "Large", priceModifier: 0 }
    ]
  },

  // --- BEVERAGE: COCKTAILS ---
  {
    name: "Ice Preference",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 90,
    options: [
      { label: "On the Rocks", priceModifier: 0 },
      { label: "Neat", priceModifier: 0 },
      { label: "Blended", priceModifier: 0 },
      { label: "No Ice", priceModifier: 0 }
    ]
  },
  {
    name: "Mixer",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 91,
    options: [
      { label: "Club Soda", priceModifier: 0 },
      { label: "Tonic", priceModifier: 0 },
      { label: "Cranberry", priceModifier: 0 },
      { label: "OJ", priceModifier: 0 },
      { label: "Coke", priceModifier: 0 },
      { label: "Water", priceModifier: 0 }
    ]
  },
  {
    name: "Pour Size",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: false,
    sortOrder: 92,
    options: [
      { label: "Single", priceModifier: 0 },
      { label: "Double", priceModifier: 4.00 }
    ]
  }
];

/**
 * Seeds the global starter library collection.
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

  // 3. Link cloned groups to existing Menu Items based on intelligent keyword matching
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  const itemsSnap = await getDocs(menuItemsRef);
  
  itemsSnap.forEach(itemDoc => {
    const item = itemDoc.data() as MenuItem;
    const currentGroups = item.modifierGroupIds || [];
    let updated = false;

    const name = item.name.toLowerCase();
    const cat = (item.category || '').toLowerCase();
    
    // --- UNIVERSAL LINKING ---
    if (groupIdsMap['Special Instructions']) { currentGroups.push(groupIdsMap['Special Instructions']); updated = true; }
    if (groupIdsMap['Allergy Flag']) { currentGroups.push(groupIdsMap['Allergy Flag']); updated = true; }

    // --- KEYWORD LINKING ---
    if (name.includes('burger') || name.includes('sandwich') || name.includes('club') || name.includes('wrap')) {
      if (groupIdsMap['Doneness'] && name.includes('burger')) { currentGroups.push(groupIdsMap['Doneness']); updated = true; }
      if (groupIdsMap['Cheese']) { currentGroups.push(groupIdsMap['Cheese']); updated = true; }
      if (groupIdsMap['Toppings']) { currentGroups.push(groupIdsMap['Toppings']); updated = true; }
      if (groupIdsMap['Sauces']) { currentGroups.push(groupIdsMap['Sauces']); updated = true; }
      if (groupIdsMap['Bun']) { currentGroups.push(groupIdsMap['Bun']); updated = true; }
      if (groupIdsMap['Side Swap']) { currentGroups.push(groupIdsMap['Side Swap']); updated = true; }
    }
    
    if (name.includes('wings') || name.includes('wing')) {
      if (groupIdsMap['Wing Style']) { currentGroups.push(groupIdsMap['Wing Style']); updated = true; }
      if (groupIdsMap['Wing Sauce']) { currentGroups.push(groupIdsMap['Wing Sauce']); updated = true; }
    }

    if (name.includes('pizza')) {
      if (groupIdsMap['Crust']) { currentGroups.push(groupIdsMap['Crust']); updated = true; }
      if (groupIdsMap['Pizza Size']) { currentGroups.push(groupIdsMap['Pizza Size']); updated = true; }
      if (groupIdsMap['Pizza Sauce']) { currentGroups.push(groupIdsMap['Pizza Sauce']); updated = true; }
      if (groupIdsMap['Pizza Toppings']) { currentGroups.push(groupIdsMap['Pizza Toppings']); updated = true; }
    }

    if (name.includes('hot dog') || name.includes('brat') || name.includes('dog')) {
      if (groupIdsMap['Hot Dog Style']) { currentGroups.push(groupIdsMap['Hot Dog Style']); updated = true; }
      if (groupIdsMap['Hot Dog Toppings']) { currentGroups.push(groupIdsMap['Hot Dog Toppings']); updated = true; }
    }

    if (name.includes('salad') || name.includes('caesar')) {
      if (groupIdsMap['Dressing']) { currentGroups.push(groupIdsMap['Dressing']); updated = true; }
      if (groupIdsMap['Salad Add-ons']) { currentGroups.push(groupIdsMap['Salad Add-ons']); updated = true; }
    }

    if (name.includes('nachos') || name.includes('nacho')) {
      if (groupIdsMap['Nacho Protein']) { currentGroups.push(groupIdsMap['Nacho Protein']); updated = true; }
      if (groupIdsMap['Nacho Toppings']) { currentGroups.push(groupIdsMap['Nacho Toppings']); updated = true; }
      if (groupIdsMap['Cheese Amount']) { currentGroups.push(groupIdsMap['Cheese Amount']); updated = true; }
    }

    if (name.includes('coffee') || name.includes('espresso') || name.includes('latte')) {
      if (groupIdsMap['Coffee Size']) { currentGroups.push(groupIdsMap['Coffee Size']); updated = true; }
      if (groupIdsMap['Milk Type']) { currentGroups.push(groupIdsMap['Milk Type']); updated = true; }
      if (groupIdsMap['Sweetener']) { currentGroups.push(groupIdsMap['Sweetener']); updated = true; }
      if (groupIdsMap['Coffee Extras']) { currentGroups.push(groupIdsMap['Coffee Extras']); updated = true; }
    }

    if (cat.includes('soft drinks') || name.includes('fountain') || name.includes('soda')) {
      if (groupIdsMap['Drink Size']) { currentGroups.push(groupIdsMap['Drink Size']); updated = true; }
    }

    if (cat.includes('spirits') || name.includes('cocktail') || name.includes('margarita') || name.includes('transfusion') || name.includes('whiskey') || name.includes('vodka')) {
      if (groupIdsMap['Ice Preference']) { currentGroups.push(groupIdsMap['Ice Preference']); updated = true; }
      if (groupIdsMap['Mixer']) { currentGroups.push(groupIdsMap['Mixer']); updated = true; }
      if (groupIdsMap['Pour Size']) { currentGroups.push(groupIdsMap['Pour Size']); updated = true; }
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
