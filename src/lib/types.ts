
import { Timestamp } from "firebase/firestore";

export type SellerType = 'Private Golf Course' | 'Semi Private Golf Course' | 'Public Golf Course' | 'Bowling Center' | 'Brewery' | 'Restaurant';

export const sellerTypes: readonly SellerType[] = [
  'Private Golf Course',
  'Semi Private Golf Course',
  'Public Golf Course',
  'Bowling Center',
  'Brewery',
  'Restaurant'
];

export interface MapUpdateSettings {
  frequencySeconds: number;
  activeStages: string[];
}

export interface SolutionConfig {
  supportEmail: string;
  logoUrl?: string;
  defaultThresholds?: Record<string, { warning: number; max: number }>;
  mapUpdateSettings?: Record<string, MapUpdateSettings>;
  dailyResetHour?: number; // 0-23
  smsNotificationsEnabled?: boolean;
  gpsFreshnessThresholds?: {
    hot: number;
    warm: number;
    cold: number;
  };
  enabledModes?: string[]; // Globally authorized modes by Koop Admin
  updatedAt: Timestamp;
}

export interface Venue {
  venueId: string;
  name: string;
  ownerUid: string;
  stripeAccountId?: string;
  stripeConnectId?: string;
  solutionFeeFixed?: number;
  solutionFeePercent?: number;
  patronConvenienceFee?: number; // Master fee in cents
  serviceFees?: Record<string, number>; // Individual overrides in cents
  payoutsEnabled?: boolean;
  monthlySolutionFee?: number;
  serviceStartDate?: Timestamp;
  isFoundingPartner?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Staff' | 'Manager';
  pin: string;
  isActive: boolean;
  createdAt: Timestamp;
  latitude?: number;
  longitude?: number;
  lastActive?: Timestamp;
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
  categoryVisibility?: Record<string, string[]>; // Map of Mode -> Array of Enabled Category Names
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

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: string;
  sellerId: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: Category;
    rank: number;
    imageUrl?: string;
    availableOn?: string[];
    featuredOn?: string[]; // Mode-specific featured flag
    menuRanks?: Record<string, number>; // Mode-specific sort ranking within category
    featuredRanks?: Record<string, number>; // Mode-specific sort ranking within Featured category
    isAvailable?: boolean; // 86'd feature
    modifierGroupIds?: string[]; // References to ModifierGroup IDs
}

export interface OrderItem extends MenuItem {
  quantity: number;
  cartId: string;
  selectedModifiers?: Record<string, ModifierOption[]>;
}

export interface Order {
  id: string;
  sellerId: string;
  buyerProfileId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
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

export interface SellerAdminRole {
  userName: string;
  email: string;
  sellerId: string;
  courseName: string;
  assignedAt: Timestamp;
}
