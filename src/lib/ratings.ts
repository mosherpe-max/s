// Patron ratings as the screens use them: the shared lists, and the summaries the venue admin sees (percent positive,
// by staff member, by service mode, by reason, and the thumbs-down ratings that still need a follow-up).
// The lists are copied in functions/src/ratings.ts, which is what saves a rating. Keep the two in step (a test compares).

import type { Order } from '@/lib/types';

export const RATING_REASONS = ['Wrong or missing item', 'Quality problem', 'Took too long', 'Staff service', 'Other'] as const;
export type RatingScore = 'up' | 'down';
export const RATING_COMMENT_MAX = 300;

export const isRatingReason = (v: unknown): v is (typeof RATING_REASONS)[number] => typeof v === 'string' && (RATING_REASONS as readonly string[]).includes(v);

const DAY_MS = 86_400_000;
export type RatingRange = '7d' | '30d' | 'all';
export const RATING_RANGES: { id: RatingRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];
export const rangeStartMs = (range: RatingRange, now: number): number => (range === 'all' ? 0 : now - (range === '7d' ? 7 : 30) * DAY_MS);

type RateableOrder = Pick<Order, 'status' | 'menuType' | 'assignedStaffId' | 'assignedStaffName'> & {
  createdAt?: { toMillis: () => number } | null;
  rating?: (Omit<NonNullable<Order['rating']>, 'ratedAt' | 'handledAt'> & { ratedAt?: { toMillis: () => number } | null; handledAt?: { toMillis: () => number } | null }) | null;
};

const createdMs = (o: RateableOrder) => o.createdAt?.toMillis?.() ?? 0;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

export interface RatingSummary { delivered: number; rated: number; ups: number; downs: number; percentPositive: number | null; responseRate: number | null }

// Delivered orders placed since sinceMs, and how they were rated.
export function summarizeRatings(orders: RateableOrder[], sinceMs: number): RatingSummary {
  const delivered = orders.filter(o => o.status === 'Delivered' && createdMs(o) >= sinceMs);
  const rated = delivered.filter(o => o.rating?.score);
  const ups = rated.filter(o => o.rating!.score === 'up').length;
  const downs = rated.length - ups;
  return { delivered: delivered.length, rated: rated.length, ups, downs, percentPositive: pct(ups, rated.length), responseRate: pct(rated.length, delivered.length) };
}

export interface RatingGroupRow { key: string; name: string; ups: number; downs: number; rated: number; percentPositive: number | null }

function groupRatings(orders: RateableOrder[], sinceMs: number, keyOf: (o: RateableOrder) => { key: string; name: string }): RatingGroupRow[] {
  const map = new Map<string, RatingGroupRow>();
  for (const o of orders) {
    if (o.status !== 'Delivered' || createdMs(o) < sinceMs || !o.rating?.score) continue;
    const { key, name } = keyOf(o);
    const row = map.get(key) || { key, name, ups: 0, downs: 0, rated: 0, percentPositive: null };
    if (o.rating.score === 'up') row.ups += 1; else row.downs += 1;
    row.rated += 1;
    map.set(key, row);
  }
  return Array.from(map.values())
    .map(r => ({ ...r, percentPositive: pct(r.ups, r.rated) }))
    .sort((a, b) => b.rated - a.rated || a.name.localeCompare(b.name));
}

export const ratingsByStaff = (orders: RateableOrder[], sinceMs: number) =>
  groupRatings(orders, sinceMs, o => (o.assignedStaffId ? { key: o.assignedStaffId, name: o.assignedStaffName || 'Staff' } : { key: '__none', name: 'Unassigned' }));

export const ratingsByMode = (orders: RateableOrder[], sinceMs: number) =>
  groupRatings(orders, sinceMs, o => ({ key: o.menuType, name: o.menuType }));

export function downReasons(orders: RateableOrder[], sinceMs: number): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'Delivered' || createdMs(o) < sinceMs || o.rating?.score !== 'down') continue;
    const r = o.rating.reason || 'Other';
    counts.set(r, (counts.get(r) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

// Thumbs-down ratings nobody has marked handled yet, newest first.
export function needsAttention<T extends RateableOrder>(orders: T[]): T[] {
  return orders
    .filter(o => o.status === 'Delivered' && o.rating?.score === 'down' && !o.rating.handledAt)
    .sort((a, b) => (b.rating?.ratedAt?.toMillis?.() ?? 0) - (a.rating?.ratedAt?.toMillis?.() ?? 0));
}

// A staff member's thumbs up on orders they delivered since the start of today.
export function thumbsUpSince(orders: RateableOrder[], staffId: string | undefined, sinceMs: number): number {
  if (!staffId) return 0;
  return orders.filter(o => o.status === 'Delivered' && o.assignedStaffId === staffId && o.rating?.score === 'up' && (o.rating.ratedAt?.toMillis?.() ?? createdMs(o)) >= sinceMs).length;
}
