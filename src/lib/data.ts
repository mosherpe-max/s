
import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';
import type { Order, Category, OrderItem, MenuItem, Seller } from './types';


export const menuItems: (Omit<MenuItem, 'id' | 'rank'> & { id?: string, rank?: number })[] = [
  {
    name: 'Craft IPA',
    description: 'A hoppy and refreshing India Pale Ale.',
    price: 8.50,
    category: 'Beer',
  },
  {
    name: 'Light Lager',
    description: 'Crisp, clean, and easy-drinking.',
    price: 6.50,
    category: 'Beer',
  },
  {
    name: 'Golfers\' Gin & Tonic',
    description: 'A classic G&T with a slice of lime.',
    price: 12.00,
    category: 'Spirits',
  },
  {
    name: 'Fairway Vodka Soda',
    description: 'Premium vodka mixed with sparkling soda.',
    price: 11.50,
    category: 'Spirits',
  },
  {
    name: 'Classic Cola',
    description: 'An ice-cold can of your favorite cola.',
    price: 3.50,
    category: 'Soft Drinks',
  },
  {
    name: 'Spring Water',
    description: 'Pure, natural spring water.',
    price: 2.50,
    category: 'Soft Drinks',
  },
  {
    name: 'Kettle-Cooked Chips',
    description: 'Salty and crunchy, the perfect snack.',
    price: 4.00,
    category: 'Snacks',
  },
  {
    name: 'Energy Bar',
    description: 'Fuel your back nine with this tasty bar.',
    price: 5.00,
    category: 'Snacks',
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
