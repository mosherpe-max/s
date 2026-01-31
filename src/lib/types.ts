
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
  ownerId?: string; // Made optional for prototyping
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
  // Branding & Customization
  brandColor?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  welcomeMessage?: string;
}

export type Category = 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks';

export const categories: readonly Category[] = ['Beer', 'Spirits', 'Soft Drinks', 'Snacks'];

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Category;
    rank: number;
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

export interface Order {
  id: string;
  sellerId: string;
  customerId: string;
  customerName: string;
  paymentMethod?: 'Credit Card' | 'Member Account';
  memberId?: string;
  memberLastName?: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
}
