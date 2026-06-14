
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

export interface PlatformConfig {
  supportEmail: string;
  logoUrl?: string;
  defaultThresholds?: Record<string, { warning: number; max: number }>;
  updatedAt: Timestamp;
}

export interface Venue {
  venueId: string;
  name: string;
  ownerUid: string;
  stripeAccountId?: string;
  stripeConnectId?: string;
  platformFeeFixed?: number;
  platformFeePercent?: number;
  patronConvenienceFee?: number; // Master fee in cents
  serviceFees?: Record<string, number>; // Individual overrides in cents
  payoutsEnabled?: boolean;
  monthlyPlatformFee?: number;
  serviceStartDate?: Timestamp;
  isFoundingPartner?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Driver' | 'Server' | 'Manager';
  pin: string;
  isActive: boolean;
  createdAt: Timestamp;
}

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
  serviceFee: number; // Legacy/Master fee in dollars
  serviceFees?: Record<string, number>; // Individual overrides in dollars
  taxRate: number;
  status: 'Active' | 'Inactive';
  isFoundingPartner?: boolean;
  bevcartActive?: boolean;
  clubhouseActive?: boolean;
  lanedeliveryActive?: boolean;
  takeoutActive?: boolean;
  lastActive?: Timestamp;
  orderThresholds?: Record<string, { warning: number; max: number }>;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
}

export type Category = 'Featured' | 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks' | 'Other' | 'Handhelds' | 'Appetizers' | 'Entrees' | 'Pizza' | 'Salad' | 'Dessert' | 'Kids';

export const categories: readonly Category[] = [
  'Featured',
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
  'Dessert',
  'Kids'
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
    isAvailable?: boolean; // 86'd feature
}

export interface OrderItem extends MenuItem {
  quantity: number;
  cartId: string;
}

export interface Order {
  id: string;
  sellerId: string;
  buyerProfileId: string;
  customerName: string;
  menuType: string;
  menuTypeLocation?: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  };
  lastGpsUpdate?: Timestamp;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  status: 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
  assignedStaffId?: string;
  assignedStaffName?: string;
}

export interface Prospect {
  id: string;
  venueName: string;
  venueType: string;
  stage: 'Contacted' | 'Demo Scheduled' | 'Proposal Sent' | 'Closed' | 'Lost';
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
  assignedRepId: string;
  assignedRepName: string;
  launchFeeQuoted: number;
  monthlyFee: number;
  estVolume: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SalesActivity {
  id: string;
  prospectId: string;
  venueName: string;
  type: 'Call' | 'Email' | 'Visit' | 'Meeting';
  notes: string;
  date: Timestamp;
  repId: string;
  repName: string;
}

export type ProspectStage = Prospect['stage'];
