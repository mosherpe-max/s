
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  Firestore
} from 'firebase/firestore';
import type { MenuItem, StarterModifierGroup, StarterMenuItem, Seller } from './types';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from './data';
import { PlaceHolderImages } from './placeholder-images';

const getImg = (hint: string) => {
  if (!PlaceHolderImages || !PlaceHolderImages.length) return '';
  const search = hint.toLowerCase();
  const found = PlaceHolderImages.find(i => 
    i.imageHint.toLowerCase() === search || 
    i.id.toLowerCase() === search ||
    i.description.toLowerCase().includes(search)
  );
  if (found) return found.imageUrl;

  if (search.includes('beer') || search.includes('lager') || search.includes('ipa')) 
    return PlaceHolderImages.find(i => i.id === 'beer-1')?.imageUrl || '';
  if (search.includes('cocktail') || search.includes('spirit') || search.includes('vodka') || search.includes('whiskey')) 
    return PlaceHolderImages.find(i => i.id === 'cocktail-blue')?.imageUrl || '';
  if (search.includes('soda') || search.includes('cola') || search.includes('water')) 
    return PlaceHolderImages.find(i => i.id === 'soft-drink-1')?.imageUrl || '';
  if (search.includes('burger') || search.includes('sandwich')) 
    return PlaceHolderImages.find(i => i.id === 'burger')?.imageUrl || '';
  if (search.includes('pizza')) 
    return PlaceHolderImages.find(i => i.id === 'pizza')?.imageUrl || '';
  
  return PlaceHolderImages[0]?.imageUrl || '';
};

const generateSlug = (name: string) => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const GLOBAL_STARTER_LIBRARY: Omit<StarterModifierGroup, 'id'>[] = [
  { name: "Special Instructions", venueType: ["golf", "bowling"], category: "universal", selectionType: "single", required: false, sortOrder: 5, options: [{ label: "Add Note to Order", priceModifier: 0 }] },
  { name: "Allergy Flag", venueType: ["golf", "bowling"], category: "universal", selectionType: "multi", required: false, sortOrder: 6, options: [{ label: "Nut Allergy", priceModifier: 0 }, { label: "Gluten Sensitivity", priceModifier: 0 }, { label: "Dairy-Free", priceModifier: 0 }] },
  { name: "Doneness", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: true, sortOrder: 10, options: [{ label: "Rare", priceModifier: 0 }, { label: "Medium Rare", priceModifier: 0 }, { label: "Medium", priceModifier: 0 }, { label: "Medium Well", priceModifier: 0 }, { label: "Well Done", priceModifier: 0 }] },
  { name: "Cheese", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 11, options: [{ label: "American", priceModifier: 0 }, { label: "Cheddar", priceModifier: 0 }, { label: "Swiss", priceModifier: 0 }, { label: "No Cheese", priceModifier: 0 }] },
  { name: "Mixer", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 91, options: [{ label: "Club Soda", priceModifier: 0 }, { label: "Tonic", priceModifier: 0 }, { label: "Coke", priceModifier: 0 }, { label: "Water", priceModifier: 0 }] }
];

export const getGlobalStarterMenuItems = (): Omit<StarterMenuItem, 'id'>[] => [
  { name: "Bud Light (canned)", description: "Chilled 12oz can.", price: 6.00, category: "Beer", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 1 },
  { name: "Stone Fired Pizza", description: "16-inch jumbo family size.", price: 22.00, category: "Pizza", venueType: ["bowling"], serviceMode: "laneService", imageUrl: getImg('pepperoni pizza'), sortOrder: 2 }
];

export async function seedDemoSellers(db: Firestore) {
  const batch = writeBatch(db);
  const sellersRef = collection(db, 'sellers');

  const demoSellers: Partial<Seller>[] = [
    {
      id: 'demo-course',
      courseName: 'The Koop National (Public)',
      type: 'Golf Course',
      menuTypes: ['Beverage Cart', 'Clubhouse'],
      streetAddress: '123 Fairway Drive',
      city: 'Bloomfield',
      state: 'MI',
      zip: '48301',
      latitude: 42.5833,
      longitude: -83.2458,
      contactName: 'General Manager',
      contactEmail: 'gm@koop-demo.com',
      serviceFee: 1.50,
      taxRate: 6.0,
      status: 'Active',
      bevcartActive: true,
      clubhouseActive: true,
      qrActive: true,
      qrSecret: 'public-golf-demo',
      enabledPaymentMethods: ['Pay at Delivery', 'Digital Payment']
    },
    {
      id: 'demo-private-course',
      courseName: 'Orchard Lake CC (Private)',
      type: 'Golf Course',
      menuTypes: ['Clubhouse'],
      streetAddress: '5000 West Shore Dr',
      city: 'Orchard Lake',
      state: 'MI',
      latitude: 42.5719,
      longitude: -83.3552,
      contactName: 'Club Manager',
      contactEmail: 'club@koop-demo.com',
      serviceFee: 2.00,
      taxRate: 6.0,
      status: 'Active',
      clubhouseActive: true,
      qrActive: true,
      qrSecret: 'private-golf-demo',
      enabledPaymentMethods: ['Pay at Delivery', 'Digital Payment', 'Member Account']
    },
    {
      id: 'demo-bowling-alley',
      courseName: 'Strike City Lanes',
      type: 'Bowling Center',
      menuTypes: ['Lane Delivery'],
      laneCount: 24,
      streetAddress: '888 Spare Ave',
      city: 'Rochester',
      state: 'MI',
      latitude: 42.6808,
      longitude: -83.1338,
      contactName: 'Floor Manager',
      contactEmail: 'manager@strikecity.com',
      serviceFee: 1.00,
      taxRate: 6.0,
      status: 'Active',
      lanedeliveryActive: true,
      qrActive: true,
      qrSecret: 'bowling-demo',
      enabledPaymentMethods: ['Pay at Delivery', 'Digital Payment']
    }
  ];

  demoSellers.forEach(s => {
    batch.set(doc(sellersRef, s.id!), { ...s, updatedAt: serverTimestamp() }, { merge: true });
  });

  await batch.commit();
}

export async function seedVenueModifiers(db: Firestore, sellerId: string, venueType: 'golf' | 'bowling') {
  const batch = writeBatch(db);
  const modRef = collection(db, 'modifier_groups');
  const relevantTemplates = GLOBAL_STARTER_LIBRARY.filter(t => t.venueType.includes(venueType));
  
  relevantTemplates.forEach(template => {
    const groupId = `${sellerId}-${generateSlug(template.name)}`;
    batch.set(doc(modRef, groupId), {
      id: groupId,
      sellerId: sellerId,
      name: template.name,
      minSelection: template.required ? 1 : 0,
      maxSelection: template.selectionType === 'single' ? 1 : 99,
      options: template.options.map(opt => ({
        id: generateSlug(opt.label),
        name: opt.label,
        priceAdjustment: opt.priceModifier,
        isAvailable: true
      })),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function seedVenueItems(db: Firestore, sellerId: string, items: any[]) {
  const batch = writeBatch(db);
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  
  items.forEach((item, index) => {
    const itemId = item.id || `${sellerId}-item-${index}`;
    const linkedIds: string[] = [];
    
    if (item.suggestedModifierGroups) {
      item.suggestedModifierGroups.forEach((name: string) => {
        linkedIds.push(`${sellerId}-${generateSlug(name)}`);
      });
    }

    batch.set(doc(menuItemsRef, itemId), { 
      ...item, 
      id: itemId, 
      rank: index + 1, 
      modifierGroupIds: Array.from(new Set(linkedIds)),
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    });
  });
  await batch.commit();
}

export async function seedGlobalStarterLibrary(db: Firestore) {
  const batch = writeBatch(db);
  const libraryRef = collection(db, 'starter_modifier_library');
  GLOBAL_STARTER_LIBRARY.forEach(template => {
    const id = generateSlug(template.name);
    batch.set(doc(libraryRef, id), template);
  });
  await batch.commit();
}

export async function seedGlobalStarterMenuLibrary(db: Firestore) {
  const batch = writeBatch(db);
  const libraryRef = collection(db, 'starter_menu_item_library');
  getGlobalStarterMenuItems().forEach(item => {
    const id = generateSlug(`${item.name}-${item.serviceMode}`);
    batch.set(doc(libraryRef, id), item);
  });
  await batch.commit();
}

export async function seedAllDemoData(db: Firestore) {
  await seedGlobalStarterLibrary(db);
  await seedGlobalStarterMenuLibrary(db);
  await seedDemoSellers(db);
  await seedVenueModifiers(db, 'demo-course', 'golf');
  await seedVenueModifiers(db, 'demo-private-course', 'golf');
  await seedVenueModifiers(db, 'demo-bowling-alley', 'bowling');
  await seedVenueItems(db, 'demo-course', publicGolfItems);
  await seedVenueItems(db, 'demo-private-course', privateGolfItems);
  await seedVenueItems(db, 'demo-bowling-alley', bowlingAlleyItems);
}
