import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';
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
  {
    name: 'Amber Ale',
    description: 'Medium-bodied with a toasted malt character and low bitterness.',
    price: 7.50,
    category: 'Beer',
  },
  {
    name: 'Oatmeal Stout',
    description: 'Dark, smooth, and creamy with hints of chocolate and coffee.',
    price: 9.00,
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
    name: 'Fairway Vodka Soda',
    description: 'Triple-distilled vodka with sparkling club soda and lemon.',
    price: 11.50,
    category: 'Spirits',
  },
  {
    name: 'Classic Margarita',
    description: '100% blue agave tequila, fresh lime juice, and agave nectar.',
    price: 13.00,
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
    name: 'Spring Water',
    description: 'Pure, chilled natural spring water.',
    price: 2.50,
    category: 'Soft Drinks',
  },
  {
    name: 'Arnold Palmer',
    description: 'The perfect 50/50 blend of iced tea and lemonade.',
    price: 4.50,
    category: 'Soft Drinks',
  },
  {
    name: 'Ginger Beer',
    description: 'Extra spicy, non-alcoholic ginger brew.',
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
  {
    name: 'Honey Roasted Peanuts',
    description: 'Sweet and salty crunch for the back nine.',
    price: 4.50,
    category: 'Snacks',
  },
  {
    name: 'Beef Jerky',
    description: 'Original hickory smoked premium beef strips.',
    price: 7.00,
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
  {
    name: 'Chicken Marsala',
    description: 'Pan-seared chicken breast with mushroom marsala wine sauce.',
    price: 22.00,
    category: 'Entrees',
  },
  {
    name: 'Ribeye Steak',
    description: '12oz marble-rich cut, seasoned and grilled to perfection.',
    price: 36.00,
    category: 'Entrees',
  },

  // APPETIZERS
  {
    name: 'Jumbo Shrimp Cocktail',
    description: 'Five chilled jumbo shrimp with zesty cocktail sauce.',
    price: 16.00,
    category: 'Appetizers',
  },
  {
    name: 'Mozzarella Sticks',
    description: 'Six breaded sticks served with warm marinara.',
    price: 10.00,
    category: 'Appetizers',
  },
  {
    name: 'Spinach Artichoke Dip',
    description: 'Creamy blend of cheeses, served with warm tortilla chips.',
    price: 13.00,
    category: 'Appetizers',
  },
  {
    name: 'Crispy Calamari',
    description: 'Lightly breaded and served with spicy aioli.',
    price: 15.00,
    category: 'Appetizers',
  },

  // SANDWICHES
  {
    name: 'Turkey Club Sandwich',
    description: 'Triple-decker with roasted turkey, bacon, lettuce, and tomato.',
    price: 15.00,
    category: 'Sandwiches',
  },
  {
    name: 'Classic Burger',
    description: 'Half-pound Angus beef on a brioche bun with fries.',
    price: 16.50,
    category: 'Sandwiches',
  },
  {
    name: 'Grilled Chicken Panini',
    description: 'Pesto, mozzarella, and roasted peppers on sourdough.',
    price: 14.50,
    category: 'Sandwiches',
  },
  {
    name: 'Roast Beef Dip',
    description: 'Thinly sliced roast beef on a baguette with au jus.',
    price: 17.00,
    category: 'Sandwiches',
  },

  // DESSERT
  {
    name: 'NY Cheesecake',
    description: 'Classic creamy cheesecake with strawberry drizzle.',
    price: 9.00,
    category: 'Dessert',
  },
  {
    name: 'Chocolate Lava Cake',
    description: 'Warm dark chocolate cake with a molten center.',
    price: 11.00,
    category: 'Dessert',
  },
  {
    name: 'Apple Tart',
    description: 'Warm caramelized apples in a flaky crust with vanilla bean gelato.',
    price: 10.00,
    category: 'Dessert',
  },
  {
    name: 'Creme Brulee',
    description: 'Classic vanilla bean custard with a burnt sugar crust.',
    price: 12.00,
    category: 'Dessert',
  },
];


export const mockSellerLocation = {
  latitude: 42.7748,
  longitude: -83.2139
};

export const mockBuyerLocation = {
    latitude: 42.770,
    longitude: -83.220
};
