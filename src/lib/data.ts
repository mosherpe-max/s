
import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
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
  },
  {
    id: 'item-2',
    name: 'Light Lager',
    description: 'Crisp, clean, and easy-drinking.',
    price: 6.50,
    category: 'Beer',
  },
  {
    id: 'item-3',
    name: 'Golfers\' Gin & Tonic',
    description: 'A classic G&T with a slice of lime.',
    price: 12.00,
    category: 'Spirits',
  },
  {
    id: 'item-4',
    name: 'Fairway Vodka Soda',
    description: 'Premium vodka mixed with sparkling soda.',
    price: 11.50,
    category: 'Spirits',
  },
  {
    id: 'item-5',
    name: 'Classic Cola',
    description: 'An ice-cold can of your favorite cola.',
    price: 3.50,
    category: 'Soft Drinks',
  },
  {
    id: 'item-6',
    name: 'Spring Water',
    description: 'Pure, natural spring water.',
    price: 2.50,
    category: 'Soft Drinks',
  },
  {
    id: 'item-7',
    name: 'Kettle-Cooked Chips',
    description: 'Salty and crunchy, the perfect snack.',
    price: 4.00,
    category: 'Snacks',
  },
  {
    id: 'item-8',
    name: 'Energy Bar',
    description: 'Fuel your back nine with this tasty bar.',
    price: 5.00,
    category: 'Snacks',
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
    deliveryLocation: { latitude: 42.7758, longitude: -83.2119 },
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
    deliveryLocation: { latitude: 42.7788, longitude: -83.2159 },
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
    deliveryLocation: { latitude: 42.7728, longitude: -83.2089 },
    items: [
        { ...menuItems.find(i => i.id === 'item-3')!, quantity: 1 }
    ],
    total: 12,
    avatar: PlaceHolderImages.find(img => img.id === 'avatar-3')!,
  },
];

export const mockSellerLocation = {
  latitude: 42.7748,
  longitude: -83.2139
};

export interface Seller {
  id: string;
  courseName: string;
  courseAddress: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceFee: number;
  status: 'Active' | 'Inactive';
}

export const mockSellers: Seller[] = [
  {
    id: 'seller-1',
    courseName: 'Oakland Hills Country Club',
    courseAddress: '3951 W Maple Rd, Bloomfield Hills, MI 48301',
    latitude: 42.5516,
    longitude: -83.2562,
    contactName: 'Mike Johnson',
    contactEmail: 'mike.j@ohcc.com',
    contactPhone: '(248) 555-1234',
    serviceFee: 5.00,
    status: 'Active',
  },
  {
    id: 'seller-2',
    courseName: 'The Wyndgate',
    courseAddress: '1975 Gunn Rd, Rochester Hills, MI 48306',
    latitude: 42.7107,
    longitude: -83.1837,
    contactName: 'Jane Smith',
    contactEmail: 'jane.s@thewyndgate.com',
    contactPhone: '(248) 555-5678',
    serviceFee: 4.50,
    status: 'Inactive',
  },
];
