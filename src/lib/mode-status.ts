import type { Seller } from '@/lib/types';

const PAUSED_BY_STAFF = {
  'Beverage Cart': 'bevcartPausedByStaff',
  'Clubhouse': 'clubhousePausedByStaff',
  'Lane Delivery': 'lanedeliveryPausedByStaff',
} as const;

const AUTO_THROTTLED = {
  'Beverage Cart': 'bevcartAutoThrottled',
  'Clubhouse': 'clubhouseAutoThrottled',
  'Lane Delivery': 'lanedeliveryAutoThrottled',
} as const;

// Whether new orders are currently stopped for a service mode: paused by staff or the
// venue admin, or auto-paused because the queue is full. A pause someone chose is honored
// everywhere, demo venues included. The automatic queue-full pause is not applied to
// demo venues: it is cleared by a staff screen watching the queue, and a demo usually
// has none open, so it could otherwise get stuck on.
export function isModePaused(seller: Seller | null | undefined, mode: string | null | undefined, sellerId: string): boolean {
  if (!seller || !mode) return false;
  const pausedField = PAUSED_BY_STAFF[mode as keyof typeof PAUSED_BY_STAFF];
  if (!pausedField) return false;
  if (seller[pausedField]) return true;
  if (sellerId.startsWith('demo-')) return false;
  return !!seller[AUTO_THROTTLED[mode as keyof typeof AUTO_THROTTLED]];
}
