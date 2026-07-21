
import type { MenuItem } from './types';
import { PlaceHolderImages } from './placeholder-images';

/**
 * Robust image retrieval helper.
 * Searches by both explicit ID and descriptive imageHint.
 * Includes a keyword-based fallback system.
 */
const getImg = (hint: string) => {
  if (!PlaceHolderImages || !PlaceHolderImages.length) return '';
  const search = hint.toLowerCase();
  const found = PlaceHolderImages.find(i => 
    i.imageHint.toLowerCase() === search || 
    i.id.toLowerCase() === search
  );
  if (found) return found.imageUrl;

  // Keyword-based fallback
  if (search.includes('beer') || search.includes('lager') || search.includes('ipa')) 
    return PlaceHolderImages.find(i => i.id === 'beer-1')?.imageUrl || '';
  if (search.includes('cocktail') || search.includes('spirit') || search.includes('vodka') || search.includes('whiskey') || search.includes('wine')) 
    return PlaceHolderImages.find(i => i.id === 'cocktail-blue')?.imageUrl || '';
  if (search.includes('soda') || search.includes('cola') || search.includes('water') || search.includes('drink')) 
    return PlaceHolderImages.find(i => i.id === 'soft-drink-1')?.imageUrl || '';
  if (search.includes('burger') || search.includes('sandwich') || search.includes('wrap') || search.includes('hot dog') || search.includes('dog')) 
    return PlaceHolderImages.find(i => i.id === 'burger')?.imageUrl || '';
  if (search.includes('snack') || search.includes('chips') || search.includes('candy')) 
    return PlaceHolderImages.find(i => i.id === 'snack-1')?.imageUrl || '';
  if (search.includes('pizza')) 
    return PlaceHolderImages.find(i => i.id === 'pizza')?.imageUrl || '';
  if (search.includes('wing') || search.includes('tender')) 
    return PlaceHolderImages.find(i => i.id === 'wings')?.imageUrl || '';
  if (search.includes('nacho') || search.includes('quesadilla')) 
    return PlaceHolderImages.find(i => i.id === 'nachos')?.imageUrl || '';

  return PlaceHolderImages[0]?.imageUrl || '';
};

// --- COMMON ITEMS ---
export const commonMenuItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { 
    name: 'Classic Cola', 
    description: 'Chilled 12oz can.', 
    price: 3.50, 
    category: 'Soft Drinks', 
    imageUrl: getImg('cola can'),
    isAvailable: true
  },
  { 
    name: 'Bottled Water', 
    description: 'Purified spring water.', 
    price: 2.50, 
    category: 'Soft Drinks', 
    imageUrl: getImg('water bottle'),
    isAvailable: true
  },
  { 
    name: 'Potato Chips', 
    description: 'Sea salt kettle cooked.', 
    price: 3.00, 
    category: 'Snacks', 
    imageUrl: getImg('potato chips'),
    isAvailable: true
  },
];

// --- PUBLIC GOLF (demo-course) ---
export const publicGolfItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { 
    name: 'Transfusion', 
    description: 'Signature Drink! Vodka, grape juice, ginger ale.', 
    price: 11.00, 
    category: 'Spirits', 
    imageUrl: getImg('vodka bottle'), 
    availableOn: ['Beverage Cart', 'Clubhouse'],
    featuredOn: ['Beverage Cart'],
    isAvailable: true
  },
  { 
    name: 'Light Lager', 
    description: 'Crisp and refreshing.', 
    price: 6.00, 
    category: 'Beer', 
    imageUrl: getImg('lager can'), 
    availableOn: ['Beverage Cart', 'Clubhouse'],
    isAvailable: true
  },
  { 
    name: 'Draft Local IPA', 
    description: 'Local craft brew selection.', 
    price: 8.00, 
    category: 'Beer', 
    imageUrl: getImg('craft beer'), 
    availableOn: ['Beverage Cart', 'Clubhouse'],
    isAvailable: true
  },
  { 
    name: 'Quarter Pound Dog', 
    description: 'All-beef hot dog with side chips.', 
    price: 9.00, 
    category: 'Handhelds', 
    imageUrl: getImg('hot dog'), 
    availableOn: ['Beverage Cart', 'Clubhouse', 'Take Out'],
    featuredOn: ['Beverage Cart'],
    isAvailable: true
  },
  { 
    name: 'Classic Burger', 
    description: 'Angus beef on brioche.', 
    price: 13.00, 
    category: 'Handhelds', 
    imageUrl: getImg('burger meal'), 
    availableOn: ['Clubhouse', 'Take Out'],
    featuredOn: ['Clubhouse'],
    isAvailable: true
  },
  { 
    name: 'Arnold Palmer', 
    description: 'Half tea, half lemonade.', 
    price: 4.50, 
    category: 'Soft Drinks', 
    imageUrl: getImg('soft-drink-1'), 
    availableOn: ['Beverage Cart', 'Clubhouse'],
    isAvailable: true
  },
  ...commonMenuItems.map(i => ({ 
    ...i, 
    availableOn: ['Beverage Cart', 'Clubhouse', 'Take Out'] 
  }))
];

// --- PRIVATE GOLF (demo-private-course) ---
export const privateGolfItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { 
    name: 'Grilled Salmon', 
    description: 'Wild-caught with seasonal asparagus.', 
    price: 26.00, 
    category: 'Entrees', 
    imageUrl: getImg('grilled salmon'), 
    availableOn: ['Clubhouse'],
    featuredOn: ['Clubhouse'],
    isAvailable: true
  },
  { 
    name: 'Shrimp Cocktail', 
    description: 'Chilled jumbo shrimp with house sauce.', 
    price: 18.00, 
    category: 'Appetizers', 
    imageUrl: getImg('blue cocktail'), 
    availableOn: ['Clubhouse', 'Pool'],
    isAvailable: true
  },
  { 
    name: 'Artisan Turkey Club', 
    description: 'Triple-decker with house-smoked turkey.', 
    price: 15.00, 
    category: 'Handhelds', 
    imageUrl: getImg('burger meal'), 
    availableOn: ['Clubhouse', 'Pool', 'Take Out'],
    featuredOn: ['Pool'],
    isAvailable: true
  },
  { 
    name: 'Premium Whiskey', 
    description: 'Neat or on the rocks selection.', 
    price: 14.00, 
    category: 'Spirits', 
    imageUrl: getImg('whiskey glass'), 
    availableOn: ['Clubhouse'],
    isAvailable: true
  },
  { 
    name: 'Classic Caesar Salad', 
    description: 'Romaine, artisan croutons, parmesan.', 
    price: 12.00, 
    category: 'Salad', 
    imageUrl: getImg('grilled salmon'), 
    availableOn: ['Clubhouse', 'Pool'],
    isAvailable: true
  },
  ...commonMenuItems.map(i => ({ 
    ...i, 
    availableOn: ['Clubhouse', 'Pool', 'Take Out'] 
  }))
];

// --- BOWLING ALLEY (demo-bowling-alley) ---
export const bowlingAlleyItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  { 
    name: 'Stone Fired Pepperoni Pizza', 
    description: '12-inch classic stone fired.', 
    price: 18.00, 
    category: 'Pizza', 
    imageUrl: getImg('pepperoni pizza'), 
    availableOn: ['Lane Delivery', 'Take Out'], 
    featuredOn: ['Lane Delivery'],
    isAvailable: true
  },
  { 
    name: 'Ultimate Loaded Nachos', 
    description: 'Beef, melted cheese, fresh jalapenos.', 
    price: 14.00, 
    category: 'Appetizers', 
    imageUrl: getImg('loaded nachos'), 
    availableOn: ['Lane Delivery'],
    featuredOn: ['Lane Delivery'],
    isAvailable: true
  },
  { 
    name: 'Jumbo Buffalo Wings', 
    description: '8 piece with house-made ranch.', 
    price: 15.00, 
    category: 'Appetizers', 
    imageUrl: getImg('chicken wings'), 
    availableOn: ['Lane Delivery'],
    isAvailable: true
  },
  { 
    name: 'Draft Lager Pitcher', 
    description: '64oz sharing pitcher selection.', 
    price: 22.00, 
    category: 'Beer', 
    imageUrl: getImg('craft beer'), 
    availableOn: ['Lane Delivery'],
    isAvailable: true
  },
  { 
    name: 'Angus Classic Burger', 
    description: 'Premium beef with house fries.', 
    price: 14.50, 
    category: 'Handhelds', 
    imageUrl: getImg('burger meal'), 
    availableOn: ['Lane Delivery', 'Take Out'],
    isAvailable: true
  },
  ...commonMenuItems.map(i => ({ 
    ...i, 
    availableOn: ['Lane Delivery', 'Take Out'] 
  }))
];

export const mockSellerLocation = {
  latitude: 42.7748,
  longitude: -83.2139
};

export const mockBuyerLocation = {
    latitude: 42.770,
    longitude: -83.220
};
