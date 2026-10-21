import type { Seller, Venue } from '@/lib/types';
import { AUTHORIZED_SERVICE_MODES } from '@/lib/utils';

export interface VenueChecklistItem {
  label: string;
  done: boolean;
  detail: string;
}

export interface VenueSetupInput {
  seller?: Seller | null;
  venue?: Venue | null;
  staffCount: number;
  menuItemCount: number;
  adminLoginCount: number;
}

// Checkout offers both when a venue has never chosen, so the setup screen and the checklist read it the same way.
export const DEFAULT_PAYMENT_METHODS = ['Digital Payment', 'Pay at Delivery'];

// Launch readiness: everything a Koop admin has to have set up before a venue takes real orders,
// in the order the Venue Controls screen walks through it (the sections there use the same order
// and numbering). Used by that screen and by the setup progress shown in the Venue Registry.
export function buildVenueChecklist({ seller, venue, staffCount, menuItemCount, adminLoginCount }: VenueSetupInput): VenueChecklistItem[] {
  const authorizedModes = (seller?.menuTypes || []).filter(m => AUTHORIZED_SERVICE_MODES.includes(m));
  const hasOpenMode = authorizedModes.some(mode => {
    if (mode === 'Beverage Cart') return !!seller?.bevcartActive;
    if (mode === 'Clubhouse') return !!seller?.clubhouseActive;
    if (mode === 'Lane Delivery') return !!seller?.lanedeliveryActive;
    return false;
  });

  return [
    {
      label: 'Manager Contact',
      done: !!(seller?.contactName && seller?.contactEmail && seller?.contactPhone),
      detail: 'Add the manager\'s name, email, and phone number.',
    },
    {
      label: 'Venue Address',
      done: !!(seller?.streetAddress && seller?.city && seller?.state && seller?.zip),
      detail: 'Add the street address, city, state, and zip.',
    },
    {
      label: 'Venue Admin Logins',
      done: adminLoginCount > 0,
      detail: 'Create a login for the venue admin so they can set up their own menu and staff.',
    },
    {
      label: 'Transaction Model',
      done: !!(venue && venue.monthlySolutionFee != null && venue.solutionFeePercent != null && venue.patronConvenienceFee != null),
      detail: 'Set the Koop fees for this venue. New venues start with the standard fees.',
    },
    {
      label: 'Operational Status',
      done: seller?.status === 'Active',
      detail: 'Switch the venue to Active when everything is ready for it to go live. New venues start Inactive.',
    },
    {
      label: 'Map Location',
      done: !!(seller?.latitude && seller?.longitude),
      detail: 'Set latitude/longitude. The venue's pin shows on the patron's map when staff location isn't available.',
    },
    {
      label: 'Service Mode Selected',
      done: authorizedModes.length > 0,
      detail: 'Choose at least one service mode (Beverage Cart, Clubhouse, Lane Delivery).',
    },
    {
      label: 'A Service Mode Is Open',
      done: hasOpenMode,
      detail: 'Open at least one service mode so patrons can actually order.',
    },
    {
      label: 'Stripe Connected',
      done: !!(venue?.stripeAccountId && venue?.payoutsEnabled),
      detail: 'Complete Stripe Connect onboarding so the venue can receive payouts.',
    },
    {
      label: 'Payment Methods Enabled',
      done: (seller?.enabledPaymentMethods ?? DEFAULT_PAYMENT_METHODS).length > 0,
      detail: 'Enable at least one patron payment method.',
    },
    {
      label: 'Staff Added',
      done: staffCount > 0,
      detail: 'Add at least one staff member so orders can be fulfilled.',
    },
    {
      label: 'Menu Items Added',
      done: menuItemCount > 0,
      detail: 'Add menu items, or clone starter templates below.',
    },
    {
      label: 'QR Access Active',
      done: !!(seller?.qrActive && seller?.qrSecret),
      detail: 'Generate a QR code so patrons can reach the ordering page.',
    },
    {
      label: 'Print Marketing Kit',
      done: !!(seller?.printAssets?.cartSticker && seller?.printAssets?.yardSign),
      detail: 'Generate the cart sticker and yard sign (needs the QR code above).',
    },
  ];
}

export function venueSetupProgress(input: VenueSetupInput): { ready: number; total: number } {
  const items = buildVenueChecklist(input);
  return { ready: items.filter(i => i.done).length, total: items.length };
}

// A venue's type (Golf Course or Bowling Center) decides which menu libraries it imports from, whether it has
// holes or lanes, and its patron wording, so it is only changeable while nothing is built on top of it.
export function venueTypeLockReason(menuItemCount: number, hasOrders: boolean): string | null {
  if (hasOrders) return 'This venue already has orders, so its type can no longer change.';
  if (menuItemCount > 0) return 'This venue already has menu items, so its type can no longer change.';
  return null;
}
