/**
 * Centralized configuration for platform convenience fee disclosures.
 * These statements are rendered based on the venue type (Golf vs. Bowling).
 */

export type DisclosureContext = 'menu' | 'checkout' | 'status';

export const FEE_DISCLOSURES = {
  golf: {
    menu: "Order from anywhere on the course — a small convenience fee applies at checkout.",
    checkout: "A small convenience fee has been added to support mobile ordering on the course.",
    status: "A convenience fee was applied to this order for mobile ordering on the course.",
  },
  bowling: {
    menu: "Order from your lane and stay in the game — a small convenience fee applies at checkout.",
    checkout: "A small convenience fee has been added so you can order without leaving your lane.",
    status: "A convenience fee was applied to this order for lane-side mobile ordering.",
  }
};

/**
 * Normalizes the SellerType string from Firestore into a disclosure category.
 */
export function getDisclosureCategory(sellerType: string | undefined): 'golf' | 'bowling' {
  const type = sellerType?.toLowerCase() || '';
  if (type.includes('bowling')) return 'bowling';
  return 'golf'; // Default to golf-style messaging for courses and others
}
