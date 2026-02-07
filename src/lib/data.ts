import type { Order, Category, OrderItem, MenuItem, Seller } from './types';

export const menuItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  // BEER
  {
    name: 'Craft IPA',
    description: 'A hoppy and refreshing India Pale Ale with citrus notes.',
    price: 8.50,
    category: 'Beer',
  },
  {
    name: 'Light Lager',
    description: 'Crisp, clean, and easy-drinking lager.',
    price: 6.50,
    category: 'Beer',
  },
  
  // SPIRITS
  {
    name: "Golfers' Gin & Tonic",
    description: 'Premium botanical gin mixed with crisp tonic and lime.',
    price: 12.00,
    category: 'Spirits',
  },
  {
    name: 'Transfusion',
    description: 'The golfer\'s classic: Vodka, grape juice, and ginger ale.',
    price: 12.00,
    category: 'Spirits',
  },

  // SOFT DRINKS
  {
    name: 'Classic Cola',
    description: 'Chilled 12oz can of classic cola.',
    price: 3.50,
    category: 'Soft Drinks',
  },
  {
    name: 'Arnold Palmer',
    description: 'The perfect 50/50 blend of iced tea and lemonade.',
    price: 4.50,
    category: 'Soft Drinks',
  },

  // SNACKS
  {
    name: 'Kettle-Cooked Chips',
    description: 'Hand-cooked sea salt potato chips.',
    price: 4.00,
    category: 'Snacks',
  },
  {
    name: 'Energy Bar',
    description: 'High-protein chocolate peanut butter fuel bar.',
    price: 5.00,
    category: 'Snacks',
  },

  // ENTREES
  {
    name: 'Grilled Salmon',
    description: 'Atlantic salmon with wild rice and seasonal vegetables.',
    price: 24.00,
    category: 'Entrees',
  },
  {
    name: 'Filet Mignon',
    description: '8oz center-cut filet with garlic mashed potatoes.',
    price: 38.00,
    category: 'Entrees',
  },

  // PIZZA & SALAD (New)
  {
    name: 'Pepperoni Pizza',
    description: 'Classic 12-inch pepperoni pizza with mozzarella.',
    price: 18.00,
    category: 'Pizza',
  },
  {
    name: 'Caesar Salad',
    description: 'Romaine lettuce, croutons, parmesan cheese, and Caesar dressing.',
    price: 12.00,
    category: 'Salad',
  },

  // HANDHELDS (Renamed from Sandwiches)
  {
    name: 'Turkey Club',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, and tomato.',
    price: 15.00,
    category: 'Handhelds',
  },
  {
    name: 'Classic Burger',
    description: 'Half-pound Angus beef on a brioche bun with fries.',
    price: 16.50,
    category: 'Handhelds',
  },

  // APPETIZERS
  {
    name: 'Jumbo Shrimp Cocktail',
    description: 'Five chilled jumbo shrimp with zesty cocktail sauce.',
    price: 16.00,
    category: 'Appetizers',
  },
  
  // DESSERT
  {
    name: 'NY Cheesecake',
    description: 'Classic creamy cheesecake with strawberry drizzle.',
    price: 9.00,
    category: 'Dessert',
  },

  // OTHER
  {
    name: 'Logo Golf Balls (3-pack)',
    description: 'Sleeve of premium golf balls.',
    price: 15.00,
    category: 'Other',
  }
];

export const mockSellerLocation = {
  latitude: 42.7748,
  longitude: -83.2139
};

export const mockBuyerLocation = {
    latitude: 42.770,
    longitude: -83.220
};
