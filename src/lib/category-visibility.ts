// Which menu categories patrons see on each service mode. A venue stores an optional list
// of visible categories per mode (seller.categoryVisibility[mode]); with no list for a mode,
// every category is visible. 'Featured' is not a real category (it's built from featured
// items), so it is never part of this list.

interface VisibilitySettings {
  categoryVisibility?: Record<string, string[]>;
}

export function isCategoryVisible(seller: VisibilitySettings | null | undefined, mode: string | null | undefined, category: string): boolean {
  if (!mode) return true;
  return seller?.categoryVisibility?.[mode]?.includes(category) ?? true;
}

// The list to store after turning one category on or off. Returns:
//  - null: nothing to write (already visible, and the mode has no list)
//  - 'reset': every category is visible again, so remove the list and go back to the default
//  - string[]: the new list of visible categories
export function nextCategoryList(
  current: string[] | undefined,
  allCategories: string[],
  category: string,
  visible: boolean
): string[] | 'reset' | null {
  if (visible) {
    if (current === undefined) return null;
    const next = Array.from(new Set([...current, category]));
    return allCategories.every(c => next.includes(c)) ? 'reset' : next;
  }
  const base = current ?? allCategories;
  return base.filter(c => c !== category);
}
