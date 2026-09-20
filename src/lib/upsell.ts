import type { MenuItem, OrderItem } from './types';
import { CATEGORY_SUPERTYPE } from './types';

const MAX_UPSELL_ITEMS = 2;

/**
 * Picks which items to offer on the Review screen's upsell rail, for the
 * given cart and mode. Items opt in via the upsellEligible flag (same shape
 * as featuredOn, so a deleted/renamed item can never leave a dangling
 * reference the way a hand-picked item ID on the seller doc could).
 *
 * When the cart is purely food or purely beverage, prefers eligible items
 * from the complementary bucket (offer a drink to a food-only cart and vice
 * versa). A mixed cart, or a complementary bucket with no eligible items,
 * falls back to the top-ranked eligible items regardless of category.
 */
export function pickUpsellItemIds(cartItems: OrderItem[], menuItems: MenuItem[], mode: string): string[] {
  if (!mode) return [];

  const cartItemIds = new Set(cartItems.map(item => item.id));
  const byRank = (a: MenuItem, b: MenuItem) => (a.menuRanks?.[mode] ?? 999) - (b.menuRanks?.[mode] ?? 999);

  const eligible = menuItems
    .filter(item =>
      item.upsellEligible?.includes(mode) &&
      item.availableOn?.includes(mode) &&
      item.isAvailable !== false &&
      !item.outOfStockModes?.includes(mode) &&
      !(item.modifierGroupIds && item.modifierGroupIds.length > 0) &&
      !cartItemIds.has(item.id)
    )
    .sort(byRank);

  if (eligible.length === 0) return [];

  const cartSupertypes = new Set(
    cartItems
      .map(item => CATEGORY_SUPERTYPE[item.category])
      .filter((supertype): supertype is 'food' | 'beverage' => supertype === 'food' || supertype === 'beverage')
  );

  if (cartSupertypes.size === 1) {
    const complementary = cartSupertypes.has('food') ? 'beverage' : 'food';
    const complementaryMatches = eligible.filter(item => CATEGORY_SUPERTYPE[item.category] === complementary);
    if (complementaryMatches.length > 0) {
      return complementaryMatches.slice(0, MAX_UPSELL_ITEMS).map(item => item.id);
    }
  }

  return eligible.slice(0, MAX_UPSELL_ITEMS).map(item => item.id);
}
