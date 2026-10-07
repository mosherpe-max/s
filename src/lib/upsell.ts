import type { MenuItem, OrderItem } from './types';
import { CATEGORY_SUPERTYPE } from './types';

const MAX_UPSELL_ITEMS = 2;

/**
 * Picks which items to offer on the Review screen's upsell rail, for the
 * given cart and mode. Items opt in via the upsellEligible flag (same shape
 * as featuredOn, so a deleted/renamed item can never leave a dangling
 * reference the way a hand-picked item ID on the seller doc could).
 *
 * The rail always aims for two offers, in this order of preference:
 *  - Mixed cart (food and beverage): one beverage and one food item, so the
 *    patron is shown both kinds.
 *  - Purely food or purely beverage cart: the complementary bucket first
 *    (a drink for a food-only cart and vice versa).
 *  - Anything else (empty, or only uncategorised items): top-ranked eligible.
 * Whenever that leaves a slot empty (e.g. the venue flagged no drinks, or the
 * patron already has them), it is filled with the next best eligible item, so a
 * single offer only appears when just one eligible item is left.
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

  const topOf = (supertype: 'food' | 'beverage') =>
    eligible.filter(item => CATEGORY_SUPERTYPE[item.category] === supertype);

  // What we'd like to offer first, best first.
  let preferred: MenuItem[] = [];
  if (cartSupertypes.size === 2) {
    // Mixed cart: the best drink and the best food item.
    preferred = [topOf('beverage')[0], topOf('food')[0]].filter((item): item is MenuItem => !!item).sort(byRank);
  } else if (cartSupertypes.size === 1) {
    preferred = topOf(cartSupertypes.has('food') ? 'beverage' : 'food');
  }

  // Fill any remaining slots with the next best eligible items.
  const picked: MenuItem[] = [];
  for (const item of [...preferred, ...eligible]) {
    if (picked.length >= MAX_UPSELL_ITEMS) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.map(item => item.id);
}
