// Which refund text applies, and the amount it names. The wording itself is in sms-templates.ts.
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// "Refunded in full" with everything refunded so far when the order is now fully refunded, otherwise the partial
// message with just this refund's amount.
export function refundSmsParts(opts: { refundedNowCents: number; totalRefundedCents: number; orderTotalCents: number }): { key: 'refundFull' | 'refundPartial'; amount: string } {
  const fully = opts.orderTotalCents > 0 && opts.totalRefundedCents >= opts.orderTotalCents;
  return fully ? { key: 'refundFull', amount: usd(opts.totalRefundedCents) } : { key: 'refundPartial', amount: usd(opts.refundedNowCents) };
}
