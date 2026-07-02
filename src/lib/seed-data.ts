
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
import type { ModifierGroup, MenuItem, StarterModifierGroup, StarterMenuItem } from './types';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from './data';

/**
 * Master library definition for the starter modifier system.
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
    name: "Dipping Sauce",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 16,
    options: [
      { label: "Marinara", priceModifier: 0 },
      { label: "Ranch", priceModifier: 0 },
      { label: "Cheese Sauce", priceModifier: 0 },
      { label: "Honey Mustard", priceModifier: 0 },
      { label: "BBQ", priceModifier: 0 },
      { label: "No Sauce", priceModifier: 0 }
    ]
  },
  {
    name: "Wrap Sauce",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 17,
    options: [
      { label: "Caesar Dressing", priceModifier: 0 },
      { label: "Buffalo", priceModifier: 0 },
      { label: "Ranch", priceModifier: 0 },
      { label: "Chipotle Mayo", priceModifier: 0 },
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
  {
    name: "Pretzel Sauce",
    venueType: ["bowling"],
    category: "food",
    selectionType: "single",
    required: false,
    sortOrder: 45,
    options: [
      { label: "Cheese Sauce", priceModifier: 0 },
      { label: "Mustard", priceModifier: 0 },
      { label: "Marinara", priceModifier: 0 },
      { label: "No Sauce", priceModifier: 0 }
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

  // --- FOOD: NACHOS / MEXICAN ---
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
    name: "Mexican Add-ons",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 63,
    options: [
      { label: "Salsa", priceModifier: 0 },
      { label: "Sour Cream", priceModifier: 0 },
      { label: "Guacamole", priceModifier: 1.50 },
      { label: "Pico de Gallo", priceModifier: 0 },
      { label: "Jalapeños", priceModifier: 0 }
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
  {
    name: "Soup/Chili Add-ons",
    venueType: ["golf", "bowling"],
    category: "food",
    selectionType: "multi",
    required: false,
    sortOrder: 64,
    options: [
      { label: "Shredded Cheese", priceModifier: 0 },
      { label: "Sour Cream", priceModifier: 0 },
      { label: "Crackers", priceModifier: 0 },
      { label: "Green Onion", priceModifier: 0 }
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

  // --- BEVERAGE: BEER ---
  {
    name: "Beer Bucket Quantity",
    venueType: ["golf", "bowling"],
    category: "beverage",
    selectionType: "single",
    required: true,
    sortOrder: 100,
    options: [
      { label: "3-pack", priceModifier: 0 },
      { label: "5-pack", priceModifier: 0 },
      { label: "6-pack", priceModifier: 0 }
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
  },

  // --- KIDS ---
  {
    name: "Kids Sauce",
    venueType: ["golf", "bowling"],
    category: "universal",
    selectionType: "single",
    required: false,
    sortOrder: 95,
    options: [
      { label: "Ketchup", priceModifier: 0 },
      { label: "Ranch", priceModifier: 0 },
      { label: "BBQ", priceModifier: 0 },
      { label: "No Sauce", priceModifier: 0 }
    ]
  }
];

/**
 * Master library definition for the starter menu item system.
 */
const GLOBAL_STARTER_MENU_ITEMS: Omit<StarterMenuItem, 'id'>[] = [
  // --- GOLF EXCLUSIVES ---
  {
    name: "Signature Transfusion",
    description: "Vodka, grape juice, ginger ale, lime.",
    price: 11.00,
    category: "Spirits",
    venueType: ["golf"],
    modifierKeywords: ["cocktail", "specialty"]
  },
  {
    name: "Beer Bucket Bundle",
    description: "Your choice of standard domestic cans.",
    price: 24.00,
    category: "Beer",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["beer bucket"]
  },
  {
    name: "Turn Dog Combo",
    description: "Quarter pound all-beef dog with chips.",
    price: 9.50,
    category: "Handhelds",
    venueType: ["golf"],
    modifierKeywords: ["hot dog"]
  },
  {
    name: "Arnold Palmer",
    description: "Half iced tea, half lemonade.",
    price: 4.50,
    category: "Soft Drinks",
    venueType: ["golf"],
    modifierKeywords: ["drink size"]
  },

  // --- BOWLING EXCLUSIVES ---
  {
    name: "16\" Pepperoni Pizza",
    description: "Stone fired with classic pepperoni.",
    price: 22.00,
    category: "Pizza",
    venueType: ["bowling"],
    modifierKeywords: ["pizza", "crust"]
  },
  {
    name: "Giant Soft Pretzel",
    description: "Warm, salted, and served with dipping sauce.",
    price: 8.50,
    category: "Appetizers",
    venueType: ["bowling"],
    modifierKeywords: ["pretzel sauce"]
  },
  {
    name: "Pitcher of Domestic Beer",
    description: "64oz cold draft for the lane.",
    price: 18.00,
    category: "Beer",
    venueType: ["bowling"],
    modifierKeywords: []
  },

  // --- UNIVERSAL ---
  {
    name: "Angus Cheeseburger",
    description: "Half pound premium beef with fries.",
    price: 14.50,
    category: "Handhelds",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["burger", "doneness", "cheese", "toppings", "sauces", "side swap"]
  },
  {
    name: "Jumbo Buffalo Wings",
    description: "10 count, served with ranch or blue cheese.",
    price: 16.00,
    category: "Appetizers",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["wing style", "wing sauce"]
  },
  {
    name: "Chicken Quesadilla",
    description: "Grilled chicken, melted jack, side of salsa.",
    price: 13.00,
    category: "Appetizers",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["quesadilla", "mexican add-ons"]
  },
  {
    name: "Crispy Chicken Tenders",
    description: "Served with fries and dipping sauce.",
    price: 12.50,
    category: "Handhelds",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["dipping sauce", "side swap"]
  },
  {
    name: "Buffalo Chicken Wrap",
    description: "Crispy chicken, buffalo sauce, lettuce, tomato.",
    price: 13.50,
    category: "Handhelds",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["wrap sauce", "side swap"]
  },
  {
    name: "House Chili",
    description: "Slow simmered with beef and beans.",
    price: 7.00,
    category: "Entrees",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["soup/chili add-ons"]
  },
  {
    name: "Kids Chicken Strip Meal",
    description: "2 strips, fries, and a small drink.",
    price: 8.00,
    category: "Kids",
    venueType: ["golf", "bowling"],
    modifierKeywords: ["kids sauce"]
  }
];

const generateId = (name: string) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Seeds the global starter modifier library collection.
 */
export async function seedGlobalStarterLibrary(db: Firestore) {
  const batch = writeBatch(db);
  const libraryRef = collection(db, 'starter_modifier_library');

  GLOBAL_STARTER_LIBRARY.forEach(template => {
    const id = generateId(template.name);
    const docRef = doc(libraryRef, id);
    batch.set(docRef, template);
  });

  await batch.commit();
}

/**
 * Seeds the global starter menu item library collection.
 */
export async function seedGlobalStarterMenuLibrary(db: Firestore) {
  const batch = writeBatch(db);
  const libraryRef = collection(db, 'starter_menu_item_library');

  GLOBAL_STARTER_MENU_ITEMS.forEach(item => {
    const id = generateId(item.name);
    const docRef = doc(libraryRef, id);
    batch.set(docRef, item);
  });

  await batch.commit();
}

/**
 * Seeds a venue with typical modifiers by pulling from the Global Starter Library.
 */
export async function seedVenueModifiers(db: Firestore, sellerId: string, venueType: string) {
  const typeKey = venueType.toLowerCase().includes('golf') ? 'golf' : (venueType.toLowerCase().includes('bowling') ? 'bowling' : null);
  if (!typeKey) return;

  const libraryRef = collection(db, 'starter_modifier_library');
  const q = query(libraryRef, where('venueType', 'array-contains', typeKey));
  const librarySnap = await getDocs(q);

  if (librarySnap.empty) {
    await seedGlobalStarterLibrary(db);
    return seedVenueModifiers(db, sellerId, venueType);
  }

  const batch = writeBatch(db);
  const groupIdsMap: Record<string, string> = {};

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

  // Re-link modifiers to existing items
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  const itemsSnap = await getDocs(menuItemsRef);
  
  itemsSnap.forEach(itemDoc => {
    const item = itemDoc.data() as MenuItem;
    const currentGroups = item.modifierGroupIds || [];
    let updated = false;

    const name = item.name.toLowerCase();
    
    if (groupIdsMap['Special Instructions']) { currentGroups.push(groupIdsMap['Special Instructions']); updated = true; }
    if (groupIdsMap['Allergy Flag']) { currentGroups.push(groupIdsMap['Allergy Flag']); updated = true; }

    if (name.includes('burger') || name.includes('sandwich') || name.includes('club')) {
      if (groupIdsMap['Doneness'] && name.includes('burger')) { currentGroups.push(groupIdsMap['Doneness']); updated = true; }
      if (groupIdsMap['Cheese']) { currentGroups.push(groupIdsMap['Cheese']); updated = true; }
      if (groupIdsMap['Toppings']) { currentGroups.push(groupIdsMap['Toppings']); updated = true; }
      if (groupIdsMap['Sauces']) { currentGroups.push(groupIdsMap['Sauces']); updated = true; }
      if (groupIdsMap['Bun']) { currentGroups.push(groupIdsMap['Bun']); updated = true; }
      if (groupIdsMap['Side Swap']) { currentGroups.push(groupIdsMap['Side Swap']); updated = true; }
    }

    if (name.includes('wrap')) {
      if (groupIdsMap['Wrap Sauce']) { currentGroups.push(groupIdsMap['Wrap Sauce']); updated = true; }
      if (groupIdsMap['Side Swap']) { currentGroups.push(groupIdsMap['Side Swap']); updated = true; }
    }

    if (name.includes('pretzel')) {
      if (groupIdsMap['Pretzel Sauce']) { currentGroups.push(groupIdsMap['Pretzel Sauce']); updated = true; }
    }

    if (name.includes('bucket')) {
      if (groupIdsMap['Beer Bucket Quantity']) { currentGroups.push(groupIdsMap['Beer Bucket Quantity']); updated = true; }
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
  await seedGlobalStarterLibrary(db);
  await seedGlobalStarterMenuLibrary(db);
  
  await seedVenueItems(db, 'demo-course', publicGolfItems);
  await seedVenueModifiers(db, 'demo-course', 'Public Golf Course');
  
  await seedVenueItems(db, 'demo-private-course', privateGolfItems);
  await seedVenueModifiers(db, 'demo-private-course', 'Private Golf Course');
  
  await seedVenueItems(db, 'demo-bowling-alley', bowlingAlleyItems);
  await seedVenueModifiers(db, 'demo-bowling-alley', 'Bowling Center');
}

/**
 * Deep operational reset for the entire platform.
 */
export async function resetAllVenueOperationalStatus(db: Firestore) {
  const sellersRef = collection(db, 'sellers');
  const snapshot = await getDocs(sellersRef);
  const batch = writeBatch(db);

  for (const sellerDoc of snapshot.docs) {
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
