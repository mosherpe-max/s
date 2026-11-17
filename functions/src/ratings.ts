// Patron ratings: after an order is Delivered the patron can give it a thumbs up or down (a down needs a reason and
// can have a comment). Saved on the order by the rateOrder function. Keep the lists in step with src/lib/ratings.ts.

export const RATING_REASONS = ['Wrong or missing item', 'Quality problem', 'Took too long', 'Staff service', 'Other'] as const;
export type RatingScore = 'up' | 'down';

export const RATING_COMMENT_MAX = 300;
// How long after delivery a rating is still accepted.
export const RATING_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface RatingInput { score: RatingScore; reason?: string; comment?: string }

export function validateRatingInput(raw: unknown): { ok: true; value: RatingInput } | { ok: false; message: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (r.score !== 'up' && r.score !== 'down') return { ok: false, message: 'Choose thumbs up or thumbs down.' };
  const comment = typeof r.comment === 'string' ? r.comment.trim() : '';
  if (comment.length > RATING_COMMENT_MAX) return { ok: false, message: `Keep the comment under ${RATING_COMMENT_MAX} characters.` };
  if (r.score === 'up') return { ok: true, value: { score: 'up', ...(comment ? { comment } : {}) } };
  if (typeof r.reason !== 'string' || !(RATING_REASONS as readonly string[]).includes(r.reason)) {
    return { ok: false, message: 'Tell us what went wrong.' };
  }
  return { ok: true, value: { score: 'down', reason: r.reason, ...(comment ? { comment } : {}) } };
}

export type RatingPlan =
  | { ok: true }
  | { ok: false; code: 'failed-precondition' | 'already-exists'; message: string };

// Whether this order can be rated now. deliveredAtMs is null when the order has no delivery time recorded (then the
// window is not enforced).
export function planRating(order: { status?: string; hasRating?: boolean; deliveredAtMs?: number | null }, nowMs: number): RatingPlan {
  if (order.hasRating) return { ok: false, code: 'already-exists', message: 'This order has already been rated.' };
  if (order.status !== 'Delivered') return { ok: false, code: 'failed-precondition', message: 'You can rate an order once it has been delivered.' };
  if (order.deliveredAtMs != null && nowMs - order.deliveredAtMs > RATING_WINDOW_MS) {
    return { ok: false, code: 'failed-precondition', message: 'The time to rate this order has passed.' };
  }
  return { ok: true };
}
