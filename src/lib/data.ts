import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: ImagePlaceholder;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export type Category = 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks';

export const categories: Category[] = ['Beer', 'Spirits', 'Soft Drinks', 'Snacks'];

export const menuItems: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Craft IPA',
    description: 'A hoppy and refreshing India Pale Ale.',
    price: 8.50,
    category: 'Beer',
    image: PlaceHolderImages.find(img => img.id === 'beer-1')!,
  },
  {
    id: 'item-2',
    name: 'Light Lager',
    description: 'Crisp, clean, and easy-drinking.',
    price: 6.50,
    category: 'Beer',
    image: PlaceHolderImages.find(img => img.id === 'beer-2')!,
  },
  {
    id: 'item-3',
    name: 'Golfers\' Gin & Tonic',
    description: 'A classic G&T with a slice of lime.',
    price: 12.00,
    category: 'Spirits',
    image: PlaceHolderImages.find(img => img.id === 'spirits-1')!,
  },
  {
    id: 'item-4',
    name: 'Fairway Vodka Soda',
    description: 'Premium vodka mixed with sparkling soda.',
    price: 11.50,
    category: 'Spirits',
    image: PlaceHolderImages.find(img => img.id === 'spirits-2')!,
  },
  {
    id: 'item-5',
    name: 'Classic Cola',
    description: 'An ice-cold can of your favorite cola.',
    price: 3.50,
    category: 'Soft Drinks',
    image: PlaceHolderImages.find(img => img.id === 'soft-drink-1')!,
  },
  {
    id: 'item-6',
    name: 'Spring Water',
    description: 'Pure, natural spring water.',
    price: 2.50,
    category: 'Soft Drinks',
    image: PlaceHolderImages.find(img => img.id === 'soft-drink-2')!,
  },
  {
    id: 'item-7',
    name: 'Kettle-Cooked Chips',
    description: 'Salty and crunchy, the perfect snack.',
    price: 4.00,
    category: 'Snacks',
    image: PlaceHolderImages.find(img => img.id === 'snack-1')!,
  },
  {
    id: 'item-8',
    name: 'Energy Bar',
    description: 'Fuel your back nine with this tasty bar.',
    price: 5.00,
    category: 'Snacks',
    image: PlaceHolderImages.find(img => img.id === 'snack-2')!,
  },
];


export interface Order {
  orderId: string;
  customerName: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  items: OrderItem[];
  total: number;
  avatar: ImagePlaceholder;
}

export const mockOrders: Order[] = [
  {
    orderId: 'ORD-001',
    customerName: 'Alice',
    deliveryLocation: { latitude: 34.0522, longitude: -118.2437 },
    items: [
        { ...menuItems.find(i => i.id === 'item-1')!, quantity: 2 },
        { ...menuItems.find(i => i.id === 'item-7')!, quantity: 1 }
    ],
    total: 21,
    avatar: PlaceHolderImages.find(img => img.id === 'avatar-1')!,
  },
  {
    orderId: 'ORD-002',
    customerName: 'Bob',
    deliveryLocation: { latitude: 34.055, longitude: -118.248 },
    items: [
        { ...menuItems.find(i => i.id === 'item-5')!, quantity: 1 },
        { ...menuItems.find(i => i.id === 'item-6')!, quantity: 1 }
    ],
    total: 6,
    avatar: PlaceHolderImages.find(img => img.id === 'avatar-2')!,
  },
  {
    orderId: 'ORD-003',
    customerName: 'Charlie',
    deliveryLocation: { latitude: 34.049, longitude: -118.245 },
    items: [
        { ...menuItems.find(i => i.id === 'item-3')!, quantity: 1 }
    ],
    total: 12,
    avatar: PlaceHolderImages.find(img => img.id === 'avatar-3')!,
  },
];

export const mockSellerLocation = {
  latitude: 34.050,
  longitude: -118.250
};
