
import type { Order, Category, OrderItem, MenuItem, Seller } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const menuItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  // BEER
  {
    name: 'Craft IPA',
    description: 'A hoppy and refreshing India Pale Ale with citrus notes.',
    price: 8.50,
    category: 'Beer',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'craft beer')?.imageUrl,
  },
  {
    name: 'Light Lager',
    description: 'Crisp, clean, and easy-drinking lager.',
    price: 6.50,
    category: 'Beer',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'lager can')?.imageUrl,
  },
  
  // SPIRITS
  {
    name: "Golfers' Gin & Tonic",
    description: 'Premium botanical gin mixed with crisp tonic and lime.',
    price: 12.00,
    category: 'Spirits',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'whiskey glass')?.imageUrl,
  },
  {
    name: 'Transfusion',
    description: 'The golfer\'s classic: Vodka, grape juice, and ginger ale.',
    price: 12.00,
    category: 'Spirits',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'vodka bottle')?.imageUrl,
  },

  // SOFT DRINK
  {
    name: 'Classic Cola',
    description: 'Chilled 12oz can of classic cola.',
    price: 3.50,
    category: 'Soft Drinks',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'cola can')?.imageUrl,
  },
  {
    name: 'Arnold Palmer',
    description: 'The perfect 50/50 blend of iced tea and lemonade.',
    price: 4.50,
    category: 'Soft Drinks',
    imageUrl: PlaceHolderImages.find(i => i.id === 'soft-drink-1')?.imageUrl,
  },

  // SNACK
  {
    name: 'Kettle-Cooked Chips',
    description: 'Hand-cooked sea salt potato chips.',
    price: 4.00,
    category: 'Snacks',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'potato chips')?.imageUrl,
  },
  {
    name: 'Energy Bar',
    description: 'High-protein chocolate peanut butter fuel bar.',
    price: 5.00,
    category: 'Snacks',
    imageUrl: PlaceHolderImages.find(i => i.imageHint === 'chocolate bar')?.imageUrl,
  },

  // HANDHELDS
  {
    name: 'Turkey Club',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, and tomato.',
    price: 15.00,
    category: 'Handhelds',
    imageUrl: 'https://images.unsplash.com/photo-1524397057410-1e775ed476f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxzYW5kd2ljaHxlbnwwfHx8fDE3NjM5NDIyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    name: 'Classic Burger',
    description: 'Half-pound Angus beef on a brioche bun with fries.',
    price: 16.50,
    category: 'Handhelds',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxidXJnZXJ8ZW58MHx8fHwxNzYzOTQyMjExfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },

  // APPETIZERS
  {
    name: 'Jumbo Shrimp Cocktail',
    description: 'Five chilled jumbo shrimp with zesty cocktail sauce.',
    price: 16.00,
    category: 'Appetizers',
    imageUrl: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxzaHJpbXAlMjBjb2NrdGFpbHxlbnwwfHx8fDE3NjM5NDIyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },

  // PIZZA
  {
    name: 'Pepperoni Pizza',
    description: 'Classic 12-inch pepperoni pizza with mozzarella.',
    price: 18.00,
    category: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwZXBwZXJvbmklMjBwaXp6YXxlbnwwfHx8fDE3NjM5NDIyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },

  // SALAD
  {
    name: 'Caesar Salad',
    description: 'Romaine lettuce, croutons, parmesan cheese, and Caesar dressing.',
    price: 12.00,
    category: 'Salad',
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxzYWxhZHxlbnwwfHx8fDE3NjM5NDIyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },

  // ENTREES
  {
    name: 'Grilled Salmon',
    description: 'Atlantic salmon with wild rice and seasonal vegetables.',
    price: 24.00,
    category: 'Entrees',
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxncmlsbGVkJTIwc2FsbW9ufGVufDB8fHx8MTc2Mzk0MjIxMXww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  
  // DESSERT
  {
    name: 'NY Cheesecake',
    description: 'Classic creamy cheesecake with strawberry drizzle.',
    price: 9.00,
    category: 'Dessert',
    imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjaGVlc2VjYWtlfGVufDB8fHx8MTc2Mzk0MjIxMXww&ixlib=rb-4.1.0&q=80&w=1080',
  },

  // OTHER
  {
    name: 'Logo Golf Balls (3-pack)',
    description: 'Sleeve of premium golf balls.',
    price: 15.00,
    category: 'Other',
    imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxnb2xmJTIwYmFsbHxlbnwwfHx8fDE3NjM5NDIyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
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
