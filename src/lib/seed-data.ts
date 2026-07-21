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
import type { ModifierGroup, MenuItem, StarterModifierGroup, StarterMenuItem, VenueHealthSettings } from './types';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from './data';
import { PlaceHolderImages } from './placeholder-images';

/**
 * Robust image retrieval helper.
 * Searches by both explicit ID and descriptive imageHint.
 */
const getImg = (hint: string) => {
  if (!PlaceHolderImages || !PlaceHolderImages.length) return '';
  const search = hint.toLowerCase();
  const found = PlaceHolderImages.find(i => 
    i.imageHint.toLowerCase() === search || 
    i.id.toLowerCase() === search
  );
  return found?.imageUrl || '';
};

const DEFAULT_HEALTH_SETTINGS: VenueHealthSettings = {
  maxOrderAcknowledgeSeconds: 120,
  warningOrderProcessingMinutes: 15,
  maxOrderProcessingMinutes: 25,
  warningManagerInactivityDays: 3,
  warningVenueInactivityDays: 7
};

/**
 * Master library definition for the starter modifier system.
 */
const GLOBAL_STARTER_LIBRARY: Omit<StarterModifierGroup, 'id'>[] = [
  // --- UNIVERSAL ---
  { name: "Special Instructions", venueType: ["golf", "bowling"], category: "universal", selectionType: "single", required: false, sortOrder: 5, options: [{ label: "Add Note to Order", priceModifier: 0 }] },
  { name: "Allergy Flag", venueType: ["golf", "bowling"], category: "universal", selectionType: "multi", required: false, sortOrder: 6, options: [{ label: "Nut Allergy", priceModifier: 0 }, { label: "Gluten Sensitivity", priceModifier: 0 }, { label: "Dairy-Free", priceModifier: 0 }, { label: "Vegetarian", priceModifier: 0 }, { label: "Vegan", priceModifier: 0 }] },
  
  // --- FOOD ---
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

  // --- BEVERAGE ---
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

/**
 * Master library definition for the starter menu item system.
 */
const GLOBAL_STARTER_MENU_ITEMS: Omit<StarterMenuItem, 'id'>[] = [
  // --- GOLF: BEVERAGE CART ---
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
  { name: "Gatorade", description: "Fruit Punch or Orange.", price: 4.50, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('soft-drink-1'), sortOrder: 11 },
  { name: "Bottled Water", description: "Purified spring water.", price: 3.00, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('water bottle'), sortOrder: 12 },
  { name: "Soda (can)", description: "Classic cola, diet, or lemon-lime.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('cola can'), sortOrder: 13 },
  { name: "Hot Dog", description: "All-beef dog on a toasted bun.", price: 8.50, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('hot dog'), suggestedModifierGroups: ["Hot Dog Style", "Hot Dog Toppings"], sortOrder: 14 },
  { name: "Chips", description: "Kettle cooked sea salt.", price: 3.00, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('potato chips'), sortOrder: 15 },
  { name: "Candy Bar", description: "Snickers, Hershey's, or KitKat.", price: 2.50, category: "food", venueType: ["golf"], serviceMode: "beverageCart", imageUrl: getImg('chocolate bar'), sortOrder: 16 },

  // --- GOLF: CLUBHOUSE ---
  { name: "Burger", description: "Angus beef on brioche.", price: 14.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Doneness", "Cheese", "Toppings", "Sauces", "Bun", "Side Swap", "Allergy Flag"], sortOrder: 100 },
  { name: "Cheeseburger", description: "Angus beef with American cheese.", price: 15.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Doneness", "Cheese", "Toppings", "Sauces", "Bun", "Side Swap", "Allergy Flag"], sortOrder: 101 },
  { name: "Chicken Sandwich", description: "Grilled or crispy breast.", price: 13.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Cheese", "Toppings", "Sauces", "Bun", "Side Swap"], sortOrder: 102 },
  { name: "Club Sandwich", description: "Turkey, bacon, lettuce, tomato.", price: 14.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Bun", "Side Swap", "Allergy Flag"], sortOrder: 103 },
  { name: "Caesar Wrap", description: "Romaine, parm, caesar dressing.", price: 12.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Wrap Sauce", "Side Swap"], sortOrder: 104 },
  { name: "Buffalo Chicken Wrap", description: "Crispy chicken in spicy sauce.", price: 13.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Wrap Sauce", "Side Swap"], sortOrder: 105 },
  { name: "Wings", description: "Jumbo wings with your choice of sauce.", price: 16.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('chicken wings'), suggestedModifierGroups: ["Wing Style", "Wing Sauce", "Dipping Sauce"], sortOrder: 106 },
  { name: "Nachos", description: "Loaded with cheese and jalapenos.", price: 14.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('loaded nachos'), suggestedModifierGroups: ["Nacho Protein", "Nacho Toppings", "Mexican Add-ons", "Cheese Amount"], sortOrder: 107 },
  { name: "Quesadilla", description: "Grilled flour tortilla with jack cheese.", price: 11.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('loaded nachos'), suggestedModifierGroups: ["Mexican Add-ons"], sortOrder: 108 },
  { name: "French Fries", description: "Crispy golden shoestring.", price: 6.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('potato chips'), suggestedModifierGroups: ["Dipping Sauce"], sortOrder: 109 },
  { name: "Onion Rings", description: "Beer-battered thick cut.", price: 8.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('potato chips'), suggestedModifierGroups: ["Dipping Sauce"], sortOrder: 110 },
  { name: "Side Salad", description: "Mixed greens and seasonal veg.", price: 7.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('grilled salmon'), suggestedModifierGroups: ["Dressing"], sortOrder: 111 },
  { name: "Caesar Salad", description: "Classic house-made dressing.", price: 11.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('grilled salmon'), suggestedModifierGroups: ["Dressing", "Salad Add-ons"], sortOrder: 112 },
  { name: "Cobb Salad", description: "Avocado, egg, bacon, and blue cheese.", price: 14.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('grilled salmon'), suggestedModifierGroups: ["Dressing", "Salad Add-ons"], sortOrder: 113 },
  { name: "Soup of the Day", description: "Chef's daily rotation.", price: 7.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('loaded nachos'), suggestedModifierGroups: ["Soup/Chili Add-ons"], sortOrder: 114 },
  { name: "Pizza", description: "12-inch personal stone fired.", price: 16.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('pepperoni pizza'), suggestedModifierGroups: ["Crust", "Pizza Size", "Pizza Sauce", "Pizza Toppings"], sortOrder: 115 },
  { name: "Kids Cheeseburger", description: "Plain with American cheese.", price: 9.00, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Kids Sauce"], sortOrder: 116 },
  { name: "Kids Chicken Tenders", description: "2 strips served with fries.", price: 8.50, category: "food", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('chicken wings'), suggestedModifierGroups: ["Kids Sauce"], sortOrder: 117 },
  { name: "Coffee", description: "House roasted dark blend.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('soft-drink-1'), suggestedModifierGroups: ["Coffee Size", "Milk Type", "Sweetener", "Coffee Extras"], sortOrder: 118 },
  { name: "Fountain Drink", description: "20oz bottomless refill.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('soft-drink-1'), suggestedModifierGroups: ["Drink Size"], sortOrder: 119 },
  { name: "Iced Tea", description: "Freshly brewed unsweetened.", price: 3.50, category: "beverage", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('soft-drink-1'), suggestedModifierGroups: ["Drink Size"], sortOrder: 120 },
  { name: "Lemonade", description: "Classic hand-squeezed.", price: 4.00, category: "beverage", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('soft-drink-1'), suggestedModifierGroups: ["Drink Size"], sortOrder: 121 },
  { name: "Bud Light", description: "Draft 16oz.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('lager can'), sortOrder: 122 },
  { name: "Miller Lite", description: "Draft 16oz.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('lager can'), sortOrder: 123 },
  { name: "Coors Light", description: "Draft 16oz.", price: 6.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('lager can'), sortOrder: 124 },
  { name: "Modelo Especial", description: "Draft 16oz.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('lager can'), sortOrder: 125 },
  { name: "Heineken", description: "Draft 16oz.", price: 7.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('lager can'), sortOrder: 126 },
  { name: "Wine by the Glass", description: "House Chardonnay or Cab.", price: 10.00, category: "alcohol", venueType: ["golf"], serviceMode: "clubhouse", imageUrl: getImg('blue cocktail'), sortOrder: 127 },

  // --- GOLF: POOL ---
  { name: "Burger", description: "Grilled poolside Angus.", price: 14.00, category: "food", venueType: ["golf"], serviceMode: "pool", imageUrl: getImg('burger meal'), suggestedModifierGroups: ["Doneness", "Cheese", "Toppings", "Sauces"], sortOrder: 200 },
  { name: "Hot Dog", description: "Classic jumbo dog.", price: 8.50, category: "food", venueType: ["golf"], serviceMode: "pool", imageUrl: getImg('hot dog'), suggestedModifierGroups: ["Hot Dog Toppings"], sortOrder: 201 },
  { name: "Fruit Cup", description: "Fresh seasonal melon and berries.", price: 7.00, category: "food", venueType: ["golf"], serviceMode: "pool", imageUrl: getImg('grilled salmon'), sortOrder: 202 },
  { name: "Frozen Cocktail", description: "Margarita or Pina Colada.", price: 12.00, category: "alcohol", venueType: ["golf"], serviceMode: "pool", imageUrl: getImg('blue cocktail'), sortOrder: 203 },

  // --- BOWLING: LANESIDE ---
  { name: "Pitcher of Beer", description: "64oz cold draft for the lane.", price: 20.00, category: "alcohol", venueType: ["bowling"], serviceMode: "laneService", imageUrl: getImg('craft beer'), sortOrder: 1 },
  { name: "Stone Fired Pizza", description: "16-inch jumbo family size.", price: 22.00, category: "food", venueType: ["bowling"], serviceMode: "laneService", imageUrl: getImg('pepperoni pizza'), suggestedModifierGroups: ["Crust", "Pizza Sauce", "Pizza Toppings"], sortOrder: 2 }
];

const generateSlug = (name: string) => {
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
    const id = generateSlug(template.name);
    batch.set(doc(libraryRef, id), template);
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
    const id = generateSlug(`${item.name}-${item.serviceMode}`);
    batch.set(doc(libraryRef, id), item);
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
  await seedVenueItems(db, 'demo-private-course', privateGolfItems);
  await seedVenueItems(db, 'demo-bowling-alley', bowlingAlleyItems);
}

/**
 * Seeds base menu items for a specific venue (legacy helper).
 */
export async function seedVenueItems(db: Firestore, sellerId: string, items: any[]) {
  const batch = writeBatch(db);
  const menuItemsRef = collection(db, 'sellers', sellerId, 'menuItems');
  items.forEach((item, index) => {
    const itemId = item.id || `${sellerId}-item-${index}`;
    batch.set(doc(menuItemsRef, itemId), { ...item, id: itemId, rank: index + 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
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
      latitude: 0, 
      longitude: 0, 
      lastActive: null, 
      healthSettings: DEFAULT_HEALTH_SETTINGS,
      updatedAt: serverTimestamp() 
    });
    const staffRef = collection(db, 'sellers', sellerDoc.id, 'staff');
    const staffSnap = await getDocs(staffRef);
    staffSnap.forEach(sDoc => batch.update(sDoc.ref, { latitude: null, longitude: null, lastActive: null }));
  }
  await batch.commit();
}
