// The reasons a card order can be refunded for. Keep in step with src/lib/refund-reasons.ts and the staff refund
// request rule in firestore.rules.
export const REFUND_REASONS = [
  'Wrong or missing item',
  'Quality problem',
  'Never delivered or patron not found',
  'Took too long',
  'Ordered by mistake',
  'Other',
] as const;

export const isRefundReason = (value: unknown): value is string =>
  typeof value === 'string' && (REFUND_REASONS as readonly string[]).includes(value);
