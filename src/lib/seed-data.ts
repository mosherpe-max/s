
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  getDocs, 
  query, 
  where,
  Firestore,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import type { ModifierGroup, MenuItem, StarterModifierGroup, StarterMenuItem, VenueHealthSettings, Seller } from './types';
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

  if (search.includes('beer') || search.includes('lager') || search.includes('ipa') || search.includes('bud') || search.includes('miller') || search.includes('coors') || search.includes('modelo') || search.includes('heineken')) 
    return PlaceHolderImages.find(i => i.id === 'beer-1')?.imageUrl || '';
  if (search.includes('cocktail') || search.includes('spirit') || search.includes('vodka') || search.includes('whiskey') || search.includes('wine') || search.includes('transfusion') || search.includes('margarita')) 
    return PlaceHolderImages.find(i => i.id === 'cocktail-blue')?.imageUrl || '';
  if (search.includes('soda') || search.includes('cola') || search.includes('water') || search.includes('drink') || search.includes('tea') || search.includes('lemonade') || search.includes('gatorade') || search.includes('palmer') || search.includes('coffee')) 
    return PlaceHolderImages.find(i => i.id === 'soft-drink-1')?.imageUrl || '';
  if (search.includes('burger') || search.includes('sandwich') || search.includes('wrap') || search.includes('tender') || search.includes('tenders')) 
    return PlaceHolderImages.find(i => i.id === 'burger')?.imageUrl || '';
  if (search.includes('pizza')) 
    return PlaceHolderImages.find(i => i.id === 'pizza')?.imageUrl || '';
  if (search.includes('hot dog') || search.includes('dog')) 
    return PlaceHolderImages.find(i => i.id === 'hotdog')?.imageUrl || '';
  if (search.includes('wings') || search.includes('wing')) 
    return PlaceHolderImages.find(i => i.id === 'wings')?.imageUrl || '';
  if (search.includes('nacho') || search.includes('nachos') || search.includes('quesadilla')) 
    return PlaceHolderImages.find(i => i.id === 'nachos')?.imageUrl || '';
  if (search.includes('chips') || search.includes('snack') || search.includes('candy') || search.includes('pretzel')) 
    return PlaceHolderImages.find(i => i.id === 'snack-1')?.imageUrl || '';
  if (search.includes('salad') || search.includes('fruit') || search.includes('salmon')) 
    return PlaceHolderImages.find(i => i.id === 'salmon')?.imageUrl || '';
  
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
  { name: "Allergy Flag", venueType: ["golf", "bowling"], category: "universal", selectionType: "multi", required: false, sortOrder: 6, options: [{ label: "Nut Allergy", priceModifier: 0 }, { label: "Gluten Sensitivity", priceModifier: 0 }, { label: "Dairy-Free", priceModifier: 0 }, { label: "Vegetarian", priceModifier: 0 }, { label: "Vegan", priceModifier: 0 }] },
  { name: "Doneness", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: true, sortOrder: 10, options: [{ label: "Rare", priceModifier: 0 }, { label: "Medium Rare", priceModifier: 0 }, { label: "Medium", priceModifier: 0 }, { label: "Medium Well", priceModifier: 0 }, { label: "Well Done", priceModifier: 0 }] },
  { name: "Cheese", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 11, options: [{ label: "American", priceModifier: 0 }, { label: "Cheddar", priceModifier: 0 }, { label: "Swiss", priceModifier: 0 }, { label: "Pepper Jack", priceModifier: 0 }, { label: "Provolone", priceModifier: 0 }, { label: "No Cheese", priceModifier: 0 }] },
  { name: "Toppings", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 12, options: [{ label: "Lettuce", priceModifier: 0 }, { label: "Tomato", priceModifier: 0 }, { label: "Onion", priceModifier: 0 }, { label: "Pickles", priceModifier: 0 }, { label: "Jalapeños", priceModifier: 0 }, { label: "Mushrooms", priceModifier: 0 }, { label: "Banana Peppers", priceModifier: 0 }, { label: "Avocado", priceModifier: 1.50 }] },
  { name: "Sauces", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 13, options: [{ label: "Ketchup", priceModifier: 0 }, { label: "Mustard", priceModifier: 0 }, { label: "Mayo", priceModifier: 0 }, { label: "Ranch", priceModifier: 0 }, { label: "BBQ", priceModifier: 0 }, { label: "Buffalo", priceModifier: 0 }, { label: "Honey Mustard", priceModifier: 0 }, { label: "Hot Sauce", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] },
  { name: "Bun", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 14, options: [{ label: "Regular Bun", priceModifier: 0 }, { label: "Pretzel Bun", priceModifier: 0 }, { label: "Lettuce Wrap", priceModifier: 0 }, { label: "Gluten-Free Bun", priceModifier: 2.00 }, { label: "No Bun", priceModifier: 0 }] },
  { name: "Side Swap", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 15, options: [{ label: "Fries", priceModifier: 0 }, { label: "Onion Rings", priceModifier: 1.50 }, { label: "Side Salad", priceModifier: 0 }, { label: "Coleslaw", priceModifier: 0 }, { label: "Fruit Cup", priceModifier: 0 }, { label: "Chips", priceModifier: 0 }, { label: "No Side", priceModifier: 0 }] },
  { name: "Dipping Sauce", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 16, options: [{ label: "Marinara", priceModifier: 0 }, { label: "Ranch", priceModifier: 0 }, { label: "Cheese Sauce", priceModifier: 0 }, { label: "Honey Mustard", priceModifier: 0 }, { label: "BBQ", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] },
  { name: "Wrap Sauce", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 17, options: [{ label: "Caesar Dressing", priceModifier: 0 }, { label: "Buffalo", priceModifier: 0 }, { label: "Ranch", priceModifier: 0 }, { label: "Chipotle Mayo", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] },
  { name: "Wing Style", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: true, sortOrder: 20, options: [{ label: "Bone-In", priceModifier: 0 }, { label: "Boneless", priceModifier: 0 }] },
  { name: "Wing Sauce", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: true, sortOrder: 21, options: [{ label: "Buffalo Mild", priceModifier: 0 }, { label: "Buffalo Medium", priceModifier: 0 }, { label: "Buffalo Hot", priceModifier: 0 }, { label: "BBQ", priceModifier: 0 }, { label: "Honey BBQ", priceModifier: 0 }, { label: "Honey Mustard", priceModifier: 0 }, { label: "Garlic Parmesan", priceModifier: 0 }, { label: "Dry Rub", priceModifier: 0 }, { label: "Plain/Naked", priceModifier: 0 }] },
  { name: "Crust", venueType: ["bowling", "golf"], category: "food", selectionType: "single", required: true, sortOrder: 30, options: [{ label: "Thin", priceModifier: 0 }, { label: "Regular", priceModifier: 0 }, { label: "Deep Dish", priceModifier: 0 }] },
  { name: "Pizza Size", venueType: ["bowling", "golf"], category: "food", selectionType: "single", required: true, sortOrder: 31, options: [{ label: "Personal", priceModifier: 0 }, { label: "Medium", priceModifier: 0 }, { label: "Large", priceModifier: 0 }] },
  { name: "Pizza Sauce", venueType: ["bowling", "golf"], category: "food", selectionType: "single", required: false, sortOrder: 32, options: [{ label: "Marinara", priceModifier: 0 }, { label: "White", priceModifier: 0 }, { label: "BBQ", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] },
  { name: "Pizza Toppings", venueType: ["bowling", "golf"], category: "food", selectionType: "multi", required: false, sortOrder: 33, options: [{ label: "Pepperoni", priceModifier: 0 }, { label: "Sausage", priceModifier: 0 }, { label: "Mushrooms", priceModifier: 0 }, { label: "Peppers", priceModifier: 0 }, { label: "Onions", priceModifier: 0 }, { label: "Black Olives", priceModifier: 0 }, { label: "Extra Cheese", priceModifier: 2.00 }, { label: "Jalapeños", priceModifier: 0 }] },
  { name: "Hot Dog Style", venueType: ["bowling", "golf"], category: "food", selectionType: "single", required: false, sortOrder: 40, options: [{ label: "Grilled", priceModifier: 0 }, { label: "Steamed", priceModifier: 0 }] },
  { name: "Hot Dog Toppings", venueType: ["bowling", "golf"], category: "food", selectionType: "multi", required: false, sortOrder: 41, options: [{ label: "Ketchup", priceModifier: 0 }, { label: "Mustard", priceModifier: 0 }, { label: "Relish", priceModifier: 0 }, { label: "Onions", priceModifier: 0 }, { label: "Sport Peppers", priceModifier: 0 }, { label: "Sauerkraut", priceModifier: 0 }, { label: "Cheese Sauce", priceModifier: 1.00 }] },
  { name: "Pretzel Sauce", venueType: ["bowling"], category: "food", selectionType: "single", required: false, sortOrder: 45, options: [{ label: "Cheese Sauce", priceModifier: 0 }, { label: "Mustard", priceModifier: 0 }, { label: "Marinara", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] },
  { name: "Dressing", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 50, options: [{ label: "Ranch", priceModifier: 0 }, { label: "Italian", priceModifier: 0 }, { label: "Balsamic Vinaigrette", priceModifier: 0 }, { label: "Caesar", priceModifier: 0 }, { label: "Thousand Island", priceModifier: 0 }, { label: "On the Side", priceModifier: 0 }] },
  { name: "Salad Add-ons", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 51, options: [{ label: "Add Chicken", priceModifier: 3.00 }, { label: "Add Bacon", priceModifier: 2.00 }, { label: "Add Avocado", priceModifier: 1.50 }, { label: "Croutons", priceModifier: 0 }, { label: "No Croutons", priceModifier: 0 }] },
  { name: "Nacho Protein", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 60, options: [{ label: "Chicken", priceModifier: 3.00 }, { label: "Beef", priceModifier: 3.00 }, { label: "No Meat", priceModifier: 0 }] },
  { name: "Nacho Toppings", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 61, options: [{ label: "Jalapeños", priceModifier: 0 }, { label: "Black Olives", priceModifier: 0 }, { label: "Pico de Gallo", priceModifier: 0 }, { label: "Sour Cream", priceModifier: 0 }, { label: "Guacamole", priceModifier: 1.50 }] },
  { name: "Mexican Add-ons", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 63, options: [{ label: "Salsa", priceModifier: 0 }, { label: "Sour Cream", priceModifier: 0 }, { label: "Guacamole", priceModifier: 1.50 }, { label: "Pico de Gallo", priceModifier: 0 }, { label: "Jalapeños", priceModifier: 0 }] },
  { name: "Cheese Amount", venueType: ["golf", "bowling"], category: "food", selectionType: "single", required: false, sortOrder: 62, options: [{ label: "Regular Cheese", priceModifier: 0 }, { label: "Extra Cheese", priceModifier: 1.00 }, { label: "Light Cheese", priceModifier: 0 }] },
  { name: "Soup/Chili Add-ons", venueType: ["golf", "bowling"], category: "food", selectionType: "multi", required: false, sortOrder: 64, options: [{ label: "Shredded Cheese", priceModifier: 0 }, { label: "Sour Cream", priceModifier: 0 }, { label: "Crackers", priceModifier: 0 }, { label: "Green Onion", priceModifier: 0 }] },
  { name: "Coffee Size", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: true, sortOrder: 70, options: [{ label: "Small", priceModifier: 0 }, { label: "Medium", priceModifier: 0 }, { label: "Large", priceModifier: 0 }] },
  { name: "Milk Type", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 71, options: [{ label: "Whole", priceModifier: 0 }, { label: "2%", priceModifier: 0 }, { label: "Skim", priceModifier: 0 }, { label: "Oat", priceModifier: 0.75 }, { label: "Almond", priceModifier: 0.75 }] },
  { name: "Sweetener", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 72, options: [{ label: "Sugar", priceModifier: 0 }, { label: "Splenda", priceModifier: 0 }, { label: "Stevia", priceModifier: 0 }, { label: "None", priceModifier: 0 }] },
  { name: "Coffee Extras", venueType: ["golf", "bowling"], category: "beverage", selectionType: "multi", required: false, sortOrder: 73, options: [{ label: "Extra Shot", priceModifier: 1.00 }, { label: "Whipped Cream", priceModifier: 0 }, { label: "Iced", priceModifier: 0 }] },
  { name: "Drink Size", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 80, options: [{ label: "Small", priceModifier: 0 }, { label: "Medium", priceModifier: 0 }, { label: "Large", priceModifier: 0 }] },
  { name: "Beer Bucket Quantity", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: true, sortOrder: 100, options: [{ label: "3-pack", priceModifier: 0 }, { label: "5-pack", priceModifier: 0 }, { label: "6-pack", priceModifier: 0 }] },
  { name: "Ice Preference", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 90, options: [{ label: "On the Rocks", priceModifier: 0 }, { label: "Neat", priceModifier: 0 }, { label: "Blended", priceModifier: 0 }, { label: "No Ice", priceModifier: 0 }] },
  { name: "Mixer", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 91, options: [{ label: "Club Soda", priceModifier: 0 }, { label: "Tonic", priceModifier: 0 }, { label: "Cranberry", priceModifier: 0 }, { label: "OJ", priceModifier: 0 }, { label: "Coke", priceModifier: 0 }, { label: "Water", priceModifier: 0 }] },
  { name: "Pour Size", venueType: ["golf", "bowling"], category: "beverage", selectionType: "single", required: false, sortOrder: 92, options: [{ label: "Single", priceModifier: 0 }, { label: "Double", priceModifier: 4.00 }] },
  { name: "Kids Sauce", venueType: ["golf", "bowling"], category: "universal", selectionType: "single", required: false, sortOrder: 95, options: [{ label: "Ketchup", priceModifier: 0 }, { label: "Ranch", priceModifier: 0 }, { label: "BBQ", priceModifier: 0 }, { label: "No Sauce", priceModifier: 0 }] }
];

export const getGlobalStarterMenuItems = (): Omit<StarterMenuItem, 'id'>[] => [
  { name: "Bud Light (canned)", description: "Chilled 12oz can.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 1 },
  { name: "Miller Lite (canned)", description: "Chilled 12oz can.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 2 },
  { name: "Coors Light (canned)", description: "Chilled 12oz can.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 3 },
  { name: "Modelo Especial (canned)", description: "Chilled 12oz can.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 4 },
  { name: "Heineken (canned)", description: "Chilled 12oz can.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 5 },
  { name: "Craft/Local Beer (canned)", description: "Rotating seasonal selection.", price: 8.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('craft beer'), sortOrder: 6 },
  { name: "White Claw (canned)", description: "Black Cherry or Mango.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 7 },
  { name: "Truly (canned)", description: "Wild Berry or Pineapple.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('lager can'), sortOrder: 8 },
  { name: "Beer Bucket", description: "Choice of domestic cans on ice.", price: 24.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('craft beer'), suggestedModifierGroups: ["Beer Bucket Quantity"], sortOrder: 9 },
  { name: "Cocktail", description: "Premium spirit with your choice of mixer.", price: 11.00, category: "alcohol", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('blue cocktail'), suggestedModifierGroups: ["Ice Preference", "Mixer", "Pour Size"], sortOrder: 10 },
  { name: "Gatorade", description: "Fruit Punch or Orange.", price: 4.50, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('cola can'), sortOrder: 11 },
  { name: "Bottled Water", description: "Purified spring water.", price: 3.00, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('water bottle'), sortOrder: 12 },
  { name: "Soda (can)", description: "Classic cola, diet, or lemon-lime.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('cola can'), sortOrder: 13 },
  { name: "Hot Dog", description: "All-beef dog on a toasted bun.", price: 8.50, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('hot dog'), suggestedModifierGroups: ["Hot Dog Style", "Hot Dog Toppings"], sortOrder: 14 },
  { name: "Chips", description: "Kettle cooked sea salt.", price: 3.00, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('potato chips'), sortOrder: 15 },
  { name: "Candy Bar", description: "Snickers, Hershey's, or KitKat.", price: 2.50, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('chocolate bar'), sortOrder: 16 },
  { name: "Burger", description: "Angus beef on brioche.", price: 14.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Doneness", "Cheese", "Toppings", "Sauces", "Bun", "Side Swap", "Allergy Flag"], sortOrder: 100 },
  { name: "Cheeseburger", description: "Angus beef with American cheese.", price: 15.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Doneness", "Cheese", "Toppings", "Sauces", "Bun", "Side Swap", "Allergy Flag"], sortOrder: 101 },
  { name: "Chicken Sandwich", description: "Grilled or crispy breast.", price: 13.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Cheese", "Toppings", "Sauces", "Bun", "Side Swap"], sortOrder: 102 },
  { name: "Wings", description: "Jumbo wings with your choice of sauce.", price: 16.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('chicken wings'), suggestedModifierGroups: ["Wing Style", "Wing Sauce", "Dipping Sauce"], sortOrder: 106 },
  { name: "Nachos", description: "Loaded with cheese and jalapenos.", price: 14.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('loaded nachos'), suggestedModifierGroups: ["Nacho Protein", "Nacho Toppings", "Mexican Add-ons", "Cheese Amount"], sortOrder: 107 },
  { name: "Fountain Drink", description: "20oz bottomless refill.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('soft-drink-1'), suggestedModifierGroups: ["Drink Size"], sortOrder: 119 },
  { name: "Pitcher of Beer", description: "64oz cold draft for the lane.", price: 20.00, category: "alcohol", venueType: ["bowling"], serviceMode: "laneService", imageUrl: getImg('craft beer'), sortOrder: 1 },
  { name: "Stone Fired Pizza", description: "16-inch jumbo family size.", price: 22.00, category: "food", venueType: ["bowling"], serviceMode: "laneService", imageUrl: getImg('pepperoni pizza'), suggestedModifierGroups: ["Crust", "Pizza Sauce", "Pizza Toppings"], sortOrder: 2 }
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
      contactPhone: '5551234567',
      serviceFee: 1.50,
      taxRate: 6.0,
      status: 'Active',
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
      zip: '48324',
      latitude: 42.5719,
      longitude: -83.3552,
      contactName: 'Club Manager',
      contactEmail: 'club@koop-demo.com',
      contactPhone: '5559876543',
      serviceFee: 2.00,
      taxRate: 6.0,
      status: 'Active',
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
      zip: '48307',
      latitude: 42.6808,
      longitude: -83.1338,
      contactName: 'Floor Manager',
      contactEmail: 'manager@strikecity.com',
      contactPhone: '5554443333',
      serviceFee: 1.00,
      taxRate: 6.0,
      status: 'Active',
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

export async function resetAllVenueOperationalStatus(db: Firestore) {
  const sellersRef = collection(db, 'sellers');
  const snapshot = await getDocs(sellersRef);
  
  for (const sellerDoc of snapshot.docs) {
    const batch = db.batch();
    const staffRef = collection(db, 'sellers', sellerDoc.id, 'staff');
    const staffSnap = await getDocs(staffRef);
    staffSnap.forEach(sDoc => batch.update(sDoc.ref, { 
      latitude: null, 
      longitude: null, 
      lastActive: null,
      activeMode: null
    }));

    await batch.commit();
  }
}

export async function wipeAllPatronData(db: Firestore) {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(uDoc => {
    batch.delete(uDoc.ref);
  });
  
  await batch.commit();
}
