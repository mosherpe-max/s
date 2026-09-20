
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
  staffIdleTimeoutMinutes?: number; // Backgrounded staff terminal auto-signout threshold; defaults to 30
  smsNotificationsEnabled?: boolean;
  patronGpsRefreshIntervalSeconds?: number; // Frequency of location broadcasts from the patron's own device (order tracking map)
  driverGpsPollIntervalSeconds?: number; // Frequency staff/driver devices poll and broadcast their own position
  patronGpsStaleThresholdSeconds?: number;
  gpsFreshnessThresholds?: {
    hot: number;
    warm: number;
    cold: number;
  };
  venueHealthSettings?: VenueHealthSettings;
  orderThresholds?: Record<string, OrderFulfillmentThresholds>; // Master defaults by Mode
  enabledModes?: string[]; // Globally authorized modes by Koop Admin
  stripeFeePercent?: number; // Estimated Stripe processing fee %, deducted from Koop's application fee
  stripeFeeFixed?: number; // Estimated Stripe fixed fee in cents, deducted from Koop's application fee
  updatedAt: Timestamp;
}

export interface Venue {
  venueId: string;
  name: string;
  ownerUid: string;
  stripeAccountId?: string;
  stripeConnectId?: string;
  solutionFeeFixed?: number; // Cents of the Stripe processing fee Koop covers per transaction; the rest is charged to the venue's Stripe balance via on_behalf_of
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
  activeSessionId?: string; // Set fresh on every shift login; a mismatch on a driver device means another device has since signed in with this PIN, so that device signs itself out
  isAvailable?: boolean; // Personal "stepping away" toggle during a shift - undefined/true means available. Distinct from the venue-wide mode open/closed flag on Seller, which only the venue admin can change.
  createdAt: Timestamp;
  latitude?: number;
  longitude?: number;
  lastActive?: Timestamp;
  // Set fresh on every PIN login to whichever device the login happened on
  // (see PushDevice) - a shared terminal always pushes to whoever is
  // currently signed in on it, and a staff member who logs in from a
  // different device gets it moved there too. The push subscription itself
  // lives on the device doc, not here - it's set up once in Safari before
  // the app is ever added to the Home Screen (see push-notifications.ts).
  currentDeviceId?: string;
}

// A browser/device's Web Push subscription, set up once from Safari before
// the PWA is added to the Home Screen - calling Notification.requestPermission()
// from inside the already-installed standalone app ejects it into Safari
// chrome on this iOS build, confirmed on-device, regardless of gesture
// gating. Keyed by a random id generated client-side and cached in
// localStorage, independent of any specific staff member, so a shared
// terminal's subscription survives across every staff member who logs
// into it (see StaffMember.currentDeviceId).
export interface PushDevice {
  id: string;
  sellerId: string;
  subscription: PushSubscriptionJSON;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  qrActive?: boolean;
  qrSecret?: string;
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

// Coarse food/beverage grouping per category, used to pick a complementary
// upsell suggestion (e.g. offer food when the cart is all drinks). 'other'
// categories don't participate in that matching either direction - they're
// still eligible items, just not used to judge cart composition.
export const CATEGORY_SUPERTYPE: Record<Category, 'food' | 'beverage' | 'other'> = {
  'Featured': 'other',
  'Beer': 'beverage',
  'Spirits': 'beverage',
  'Soft Drinks': 'beverage',
  'Snacks': 'food',
  'Other': 'other',
  'Handhelds': 'food',
  'Appetizers': 'food',
  'Entrees': 'food',
  'Pizza': 'food',
  'Salad': 'food',
  'Dessert': 'food',
  'Kids': 'food',
};

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
    upsellEligible?: string[]; // Mode-specific flag - candidate for the Review-screen upsell rail, same shape as featuredOn so it can never dangle on a deleted/renamed item
    menuRanks?: Record<string, number>; // Mode-specific sort ranking within category
    featuredRanks?: Record<string, number>; // Mode-specific sort ranking within Featured category
    isAvailable?: boolean; // Permanent, admin-only, global on/off switch
    outOfStockModes?: string[]; // Modes where staff have temporarily 86'd this item (out of stock right now on that cart/station), independent of isAvailable
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
  refreshRequestedAt?: Timestamp;
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
  // Set once the "running late" staff push fires, so the scheduled check
  // never re-sends it on every pass for the same order.
  lateAlertSentAt?: Timestamp;
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
