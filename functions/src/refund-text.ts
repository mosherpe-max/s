// The text message a patron gets when part or all of their card payment is refunded.
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function refundSmsBody(opts: { orderNumber: string; refundedNowCents: number; totalRefundedCents: number; orderTotalCents: number }): string {
  const { orderNumber, refundedNowCents, totalRefundedCents, orderTotalCents } = opts;
  const timing = 'It usually takes 5 to 10 business days to show on your card.';
  const fullyRefunded = orderTotalCents > 0 && totalRefundedCents >= orderTotalCents;
  return fullyRefunded
    ? `Koop: your order #${orderNumber} was refunded in full (${usd(totalRefundedCents)}). ${timing}`
    : `Koop: ${usd(refundedNowCents)} of your order #${orderNumber} was refunded. ${timing}`;
}
