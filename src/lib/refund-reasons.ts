// Why a card order is being refunded. A staff member picks one when asking for a refund, and the venue admin picks
// one when refunding. The same list is checked by the refund functions (functions/src/refund-reasons.ts) and by the
// Firestore rules for a staff refund request, so a change here has to be made in all three.
export const REFUND_REASONS = [
  'Wrong or missing item',
  'Quality problem',
  'Never delivered or patron not found',
  'Took too long',
  'Ordered by mistake',
  'Other',
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

export const isRefundReason = (value: unknown): value is RefundReason =>
  typeof value === 'string' && (REFUND_REASONS as readonly string[]).includes(value);
