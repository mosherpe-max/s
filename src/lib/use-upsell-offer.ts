'use client';

import { useEffect, useState } from 'react';
import type { MenuItem, OrderItem } from '@/lib/types';
import { pickUpsellItemIds } from '@/lib/upsell';

const storageKey = (sellerId: string, mode: string) => `koop_upsell_offer_${sellerId}_${mode}`;

// The upsell picks for one checkout. They are chosen once, from the cart as it is
// when the patron first reaches the Review screen, then kept: adding one or both of
// the offered items never brings in a replacement, so a patron is shown at most two
// suggestions per checkout. The picks are also remembered for the tab (so going back
// from checkout to Review doesn't offer a fresh pair) until the order is placed or the
// cart is emptied.
export function useUpsellOffer(
  sellerId: string,
  mode: string,
  cartItems: OrderItem[],
  menuItems: MenuItem[] | null | undefined
): string[] {
  const [offer, setOffer] = useState<string[] | null>(null);

  useEffect(() => {
    if (!mode) return;
    if (cartItems.length === 0) {
      // An empty cart means a new checkout is coming: forget the old picks.
      try { sessionStorage.removeItem(storageKey(sellerId, mode)); } catch { /* storage unavailable */ }
      return;
    }
    if (offer !== null || !menuItems) return;

    let stored: string[] | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey(sellerId, mode));
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) stored = parsed;
    } catch { /* ignore: fall back to picking fresh */ }

    const picked = stored ?? pickUpsellItemIds(cartItems, menuItems, mode);
    if (!stored) {
      try { sessionStorage.setItem(storageKey(sellerId, mode), JSON.stringify(picked)); } catch { /* storage unavailable */ }
    }
    setOffer(picked);
  }, [sellerId, mode, cartItems, menuItems, offer]);

  return offer ?? [];
}

// Call once the order is placed so the next checkout gets a fresh pair.
export function clearUpsellOffer(sellerId: string, mode: string) {
  try { sessionStorage.removeItem(storageKey(sellerId, mode)); } catch { /* storage unavailable */ }
}
