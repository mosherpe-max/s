import type { Order, Category, OrderItem, MenuItem, Seller } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImg = (hint: string) => PlaceHolderImages.find(i => i.imageHint === hint || i.id === hint)?.imageUrl || '';

// --- COMMON ITEMS ---
export const commonMenuItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { name: 'Classic Cola', description: 'Chilled 12oz can.', price: 3.50, category: 'Soft Drinks', imageUrl: getImg('cola can') },
  { name: 'Bottled Water', description: 'Purified spring water.', price: 2.50, category: 'Soft Drinks', imageUrl: getImg('water bottle') },
  { name: 'Potato Chips', description: 'Sea salt kettle cooked.', price: 3.00, category: 'Snacks', imageUrl: getImg('potato chips') },
];

// --- PUBLIC GOLF (demo-course) ---
export const publicGolfItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { name: 'Transfusion', description: 'Vodka, grape juice, ginger ale.', price: 11.00, category: 'Spirits', imageUrl: getImg('vodka bottle'), availableOn: ['Beverage Cart', 'Clubhouse'] },
  { name: 'Light Lager', description: 'Crisp and refreshing.', price: 6.00, category: 'Beer', imageUrl: getImg('lager can'), availableOn: ['Beverage Cart', 'Clubhouse'] },
  { name: 'Draft IPA', description: 'Local craft brew.', price: 8.00, category: 'Beer', imageUrl: getImg('craft beer'), availableOn: ['Beverage Cart', 'Clubhouse'] },
  { name: 'Quarter Pound Dog', description: 'All-beef hot dog with chips.', price: 9.00, category: 'Handhelds', imageUrl: getImg('hot dog'), availableOn: ['Beverage Cart', 'Clubhouse', 'Take Out'] },
  { name: 'Arnold Palmer', description: 'Half tea, half lemonade.', price: 4.50, category: 'Soft Drinks', imageUrl: getImg('soft-drink-1'), availableOn: ['Beverage Cart', 'Clubhouse'] },
  ...commonMenuItems.map(i => ({ ...i, availableOn: ['Beverage Cart', 'Clubhouse', 'Take Out'] }))
];

// --- PRIVATE GOLF (demo-private-course) ---
export const privateGolfItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { name: 'Grilled Salmon', description: 'Wild-caught with asparagus.', price: 26.00, category: 'Entrees', imageUrl: getImg('grilled salmon'), availableOn: ['Clubhouse'] },
  { name: 'Shrimp Cocktail', description: 'Chilled jumbo shrimp.', price: 18.00, category: 'Appetizers', imageUrl: getImg('cocktail-blue'), availableOn: ['Clubhouse', 'Pool'] },
  { name: 'Turkey Club', description: 'Triple-decker classic.', price: 15.00, category: 'Handhelds', imageUrl: getImg('burger meal'), availableOn: ['Clubhouse', 'Pool', 'Take Out'] },
  { name: 'Premium Whiskey', description: 'Neat or on the rocks.', price: 14.00, category: 'Spirits', imageUrl: getImg('whiskey glass'), availableOn: ['Clubhouse'] },
  { name: 'Caesar Salad', description: 'Romaine, croutons, parmesan.', price: 12.00, category: 'Salad', imageUrl: getImg('grilled salmon'), availableOn: ['Clubhouse', 'Pool'] },
  ...commonMenuItems.map(i => ({ ...i, availableOn: ['Clubhouse', 'Pool', 'Take Out'] }))
];

// --- BOWLING ALLEY (demo-bowling-alley) ---
export const bowlingAlleyItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { name: 'Pepperoni Pizza', description: '12-inch stone fired.', price: 18.00, category: 'Pizza', imageUrl: getImg('pepperoni pizza'), availableOn: ['Lane Delivery', 'Take Out'] },
  { name: 'Loaded Nachos', description: 'Beef, cheese, jalapenos.', price: 14.00, category: 'Appetizers', imageUrl: getImg('loaded nachos'), availableOn: ['Lane Delivery'] },
  { name: 'Buffalo Wings', description: '8 wings with ranch.', price: 15.00, category: 'Appetizers', imageUrl: getImg('chicken wings'), availableOn: ['Lane Delivery'] },
  { name: 'Pitcher of Lager', description: '64oz sharing pitcher.', price: 22.00, category: 'Beer', imageUrl: getImg('craft beer'), availableOn: ['Lane Delivery'] },
  { name: 'Classic Burger', description: 'Angus beef with fries.', price: 14.50, category: 'Handhelds', imageUrl: getImg('burger meal'), availableOn: ['Lane Delivery', 'Take Out'] },
  ...commonMenuItems.map(i => ({ ...i, availableOn: ['Lane Delivery', 'Take Out'] }))
];

export const mockSellerLocation = {
  latitude: 42.7748,
  longitude: -83.2139
};

export const mockBuyerLocation = {
    latitude: 42.770,
    longitude: -83.220
};
