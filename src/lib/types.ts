
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

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
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
  serviceFee: number;
  taxRate: number;
  koopFeeOffsetCents?: number;
  menuServiceFees?: Record<string, number>;
  monthlyPlatformFee?: number;
  launchFee?: number;
  status: 'Active' | 'Inactive';
  bevcartActive?: boolean;
  clubhouseActive?: boolean;
  lanedeliveryActive?: boolean;
  takeoutActive?: boolean;
  brandColor?: string;
  headerColor?: string;
  bottomBarColor?: string;
  bodyBackgroundColor?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  lastActive?: Timestamp;
  categoryVisibility?: Record<string, Category[]>;
  categoryImageVisibility?: Record<string, Category[]>;
  categoryModifierEnabled?: Record<string, Category[]>;
  orderThresholds?: Record<string, { warning: number; max: number }>;
  poolMapUrl?: string;
  // Stripe Connect
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
}

export type Category = 'Beer' | 'Spirits' | 'Soft Drinks' | 'Snacks' | 'Other' | 'Handhelds' | 'Appetizers' | 'Entrees' | 'Pizza' | 'Salad' | 'Dessert' | 'Kids';

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
    modifierGroups?: ModifierGroup[];
}

export interface Member {
  id: string;
  name: string;
  memberNumber: string;
  status: 'Active' | 'Inactive';
}

export interface OrderItem extends MenuItem {
  quantity: number;
  cartId: string;
  selectedModifiers?: Record<string, ModifierOption[]>;
}

export type PaymentMethod = 'Credit Card' | 'Member Account' | 'Pay at Delivery' | 'Pay with Cash or Credit Card to Beverage Cart Operator';

export interface Order {
  id: string;
  sellerId: string;
  buyerProfileId: string;
  customerName: string;
  menuType: string;
  menuTypeLocation?: string;
  paymentMethod?: PaymentMethod;
  memberId?: string;
  memberLastName?: string;
  assignedDriverId?: string;
  specialInstructions?: string;
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
  status: 'Pending Payment' | 'Placed' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
  lastGpsUpdate?: Timestamp;
  buyerDeviceStatus?: 'ios-browser' | 'standalone' | 'android' | 'standard';
  isGuestOrder?: boolean;
  deviceMetadata?: any;
  // Stripe
  stripeSessionId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paidAt?: Timestamp;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'KOOP Platform Admin' | 'Seller Admin' | 'Sales Rep';
  sellerId?: string;
  courseName?: string;
  createdAt: Timestamp;
}

export type ProspectStage = 'Contacted' | 'Demo Scheduled' | 'Proposal Sent' | 'Closed' | 'Lost';
export type CRMVenueType = 'Golf Course' | 'Bowling Alley' | 'Brewery/Restaurant';

export interface Prospect {
  id: string;
  venueName: string;
  venueType: CRMVenueType;
  stage: ProspectStage;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  launchFeeQuoted: number;
  monthlyFee: number;
  estVolume: number;
  assignedRepId: string;
  assignedRepName: string;
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
