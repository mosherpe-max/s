import type { Venue } from '@/lib/types';

type StripeFields = Pick<Venue, 'stripeAccountId' | 'payoutsEnabled' | 'stripeRequirementsDue' | 'stripePastDue' | 'stripeDisabledReason'>;

// Patrons can pay by card only once Stripe has approved the venue's account (payouts enabled).
// The server enforces the same rule when it creates the payment.
export const isCardReady = (venue: StripeFields | null | undefined): boolean =>
  !!venue?.stripeAccountId && venue.payoutsEnabled === true;

export type StripeAttentionKind = 'not-started' | 'incomplete' | 'info-needed' | 'paused';

export interface StripeAttention {
  kind: StripeAttentionKind;
  label: string;
  detail: string;
}

const DISABLED_REASONS: Record<string, string> = {
  'requirements.past_due': 'Stripe is waiting on information that is overdue.',
  'requirements.pending_verification': 'Stripe is verifying the information the venue gave.',
  'under_review': 'Stripe is reviewing the account.',
  'listed': 'Stripe flagged the account for review.',
  'platform_paused': 'The account is paused on the platform.',
};

export function describeDisabledReason(reason: string | null | undefined): string {
  if (!reason) return 'Stripe has paused payouts for this account.';
  if (reason.startsWith('rejected.')) return 'Stripe rejected the account.';
  return DISABLED_REASONS[reason] || `Stripe has paused payouts (${reason.replace(/_/g, ' ')}).`;
}

// What, if anything, needs a person's attention about this venue's Stripe account. Venues that are
// Inactive or demo venues are not expected to be connected, so they are only flagged once they have started.
export function stripeAttention(
  venue: StripeFields | null | undefined,
  context: { isActive?: boolean; isDemo?: boolean } = {},
): StripeAttention | null {
  if (!venue?.stripeAccountId) {
    return context.isActive && !context.isDemo
      ? { kind: 'not-started', label: 'Stripe not started', detail: 'The venue is Active but has not connected Stripe, so patrons cannot pay by card.' }
      : null;
  }
  if (venue.payoutsEnabled === true) {
    const due = venue.stripeRequirementsDue ?? 0;
    const pastDue = venue.stripePastDue ?? 0;
    if (pastDue > 0) return { kind: 'info-needed', label: 'Stripe needs information (overdue)', detail: `Stripe is waiting on ${pastDue} overdue item${pastDue === 1 ? '' : 's'}. Payouts may stop soon.` };
    if (due > 0) return { kind: 'info-needed', label: 'Stripe needs information', detail: `Stripe is asking for ${due} more item${due === 1 ? '' : 's'}.` };
    return null;
  }
  if (venue.stripeDisabledReason && venue.stripeDisabledReason !== 'requirements.pending_verification') {
    return { kind: 'paused', label: 'Payouts paused', detail: describeDisabledReason(venue.stripeDisabledReason) };
  }
  return { kind: 'incomplete', label: 'Stripe setup unfinished', detail: venue.stripeDisabledReason ? describeDisabledReason(venue.stripeDisabledReason) : 'The venue has started Stripe setup but is not approved to take card payments yet.' };
}
