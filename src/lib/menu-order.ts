// The Koop admin's product list: grouped by category (A to Z), and A to Z by name inside each category, so the whole
// list for a category is in one place. Case and accents are ignored; items with no category go last.

export interface CategoryGroup<T> { category: string; items: T[] }

const NO_CATEGORY = 'Uncategorized';
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function groupByCategory<T extends { name?: string; category?: string }>(items: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.category || '').trim() || NO_CATEGORY;
    const list = groups.get(key);
    if (list) list.push(item); else groups.set(key, [item]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : collator.compare(a, b)))
    .map(([category, list]) => ({ category, items: [...list].sort((a, b) => collator.compare(a.name || '', b.name || '')) }));
}
