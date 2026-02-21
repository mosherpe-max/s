
import { Timestamp } from "firebase/firestore";

export type SellerType = 'Private Golf Course' | 'Semi Private Golf Course' | 'Public Golf Course' | 'Bowling Alley' | 'Brewery' | 'Restaurant';

export const sellerTypes: readonly SellerType[] = [
  'Private Golf Course',
  'Semi Private Golf Course',
  'Public Golf Course',
  'Bowling Alley',
  'Brewery',
  'Restaurant'
];

export interface Seller {
  id: string;
  ownerId?: string;
  courseName: string;
  type: SellerType;
  menuTypes: string[];
  halfwayHouseCount?: number;
  halfwayHouseNames?: string[];
  laneCount?: number;
  tableCount?: number;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  serviceFee: number;
  status: 'Active' | 'Inactive';
  bevcartActive?: boolean;
  clubhouseActive?: boolean;
  brandColor?: string;
  headerColor?: string;
  bottomBarColor?: string;
  bodyBackgroundColor?: string;
  logoUrl?: string;
  lastActive?: Timestamp;
  // Category visibility per menu type: { 'Beverage Cart': ['Beer', 'Snacks'], 'Clubhouse': [...] }
  categoryVisibility?: Record<string, Category[]>;
}

export type Category = 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks' | 'Other' | 'Handhelds' | 'Appetizers' | 'Entrees' | 'Pizza' | 'Salad' | 'Dessert';

export const categories: readonly Category[] = [
  'Beer', 
  'Spirits', 
  'Soft Drinks', 
  'Snacks', 
  'Other', 
  'Handhelds', 
  'Appetizers', 
  'Entrees', 
  'Pizza', 
  'Salad', 
  'Dessert'
];

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Category;
    rank: number;
    imageUrl?: string;
    availableOn?: string[];
    menuRanks?: Record<string, number>;
}

export interface Member {
  id: string;
  name: string;
  memberNumber: string;
  status: 'Active' | 'Inactive';
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export type PaymentMethod = 'Credit Card' | 'Member Account' | 'Pay at Delivery' | 'Pay with Cash or Credit Card to Beverage Cart Operator';

export interface Order {
  id: string;
  sellerId: string;
  customerId: string;
  customerName: string;
  menuType: string;
  menuTypeLocation?: string;
  paymentMethod?: PaymentMethod;
  memberId?: string;
  memberLastName?: string;
  assignedDriverId?: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  status: 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
}
