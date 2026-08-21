
import { Timestamp } from "firebase/firestore";

export type SellerType = 'Golf Course' | 'Bowling Center';

export const sellerTypes: readonly SellerType[] = [
  'Golf Course',
  'Bowling Center'
];

export type PaymentMethodType = 'Pay at Delivery' | 'Digital Payment' | 'Member Account';

export interface MapUpdateSettings {
  frequencySeconds: number;
  activeStages: string[];
}

export interface OrderFulfillmentThresholds {
  maxOrderAcknowledgeSeconds: number;
  warningOrderProcessingMinutes: number;
  maxOrderProcessingMinutes: number;
}

export interface VenueHealthSettings {
  warningManagerInactivityDays: number;
  warningVenueInactivityDays: number;
}

export interface SolutionConfig {
  supportEmail: string;
  logoUrl?: string;
  mapUpdateSettings?: Record<string, MapUpdateSettings>;
  dailyResetHour?: number; // 0-23
  smsNotificationsEnabled?: boolean;
  gpsRefreshIntervalSeconds?: number;
  gpsFreshnessThresholds?: {
    hot: number;
    warm: number;
    cold: number;
  };
  venueHealthSettings?: VenueHealthSettings;
  orderThresholds?: Record<string, OrderFulfillmentThresholds>; // Master defaults by Mode
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
  isDemo?: boolean;
  enabledPaymentMethods?: PaymentMethodType[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Staff' | 'Manager';
  pin: string;
  isActive: boolean;
  activeMode?: string; // Current shift assignment (Bevcart, Clubhouse, etc)
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
  lastActive?: Timestamp;
  healthSettings?: VenueHealthSettings;
  orderThresholds?: Record<string, OrderFulfillmentThresholds>; // Venue overrides by Mode
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  categoryVisibility?: Record<string, string[]>; // Map of Mode -> Array of Enabled Category Names
  enabledPaymentMethods?: PaymentMethodType[];
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

export interface StarterModifierGroup {
  id?: string;
  name: string;
  venueType: string[]; // ['golf', 'bowling']
  category: string; // 'food', 'beverage', 'universal'
  selectionType: 'single' | 'multi';
  required: boolean;
  options: { label: string; priceModifier: number }[];
  sortOrder: number;
}

export interface StarterMenuItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: 'food' | 'beverage' | 'alcohol' | string;
  venueType: string[]; // ['golf', 'bowling']
  serviceMode: 'beverageCart' | 'clubhouse' | 'laneService';
  suggestedModifierGroups?: string[];
  sortOrder: number;
  imageUrl?: string;
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
  acknowledgedAt?: Timestamp;
  deliveredAt?: Timestamp;
  assignedStaffId?: string;
  assignedStaffName?: string;
  paymentMethod?: PaymentMethodType;
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

export type LeadStage = 'Cold Lead' | 'On-Site Meeting' | 'Demo' | 'Offer' | 'Closed' | 'Dead';

export interface Lead {
  id: string;
  venueName: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  contactName: string;
  phone: string;
  email: string;
  venueType: 'Golf Course' | 'Bowling Center';
  stage: LeadStage;
  marketFitData: {
    golf?: {
      hasBevCart: boolean;
      hasClubhouseKitchen: boolean;
      roundsAnnually: number;
      bevCartAnnualRevenue: number;
    };
    bowling?: {
      hasBar: boolean;
      hasKitchen: boolean;
      lanesCount: number;
      fbAnnualRevenue: number;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
