// Turns a Stripe connected account into the handful of facts the app shows and acts on: can this venue
// take card payments and receive payouts, and is Stripe asking it for anything? Kept free of Stripe and
// Firebase so it can be tested directly. Used by the account.updated webhook and the refresh function.

export interface StripeAccountLike {
  payouts_enabled?: boolean;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    disabled_reason?: string | null;
  } | null;
}

export interface StripeStatusFields {
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  stripeRequirementsDue: number;   // items Stripe still wants from the venue
  stripePastDue: number;           // of those, items that are overdue
  stripeDisabledReason: string | null;
}

export function stripeStatusFromAccount(account: StripeAccountLike): StripeStatusFields {
  return {
    payoutsEnabled: !!account.payouts_enabled,
    chargesEnabled: !!account.charges_enabled,
    stripeDetailsSubmitted: !!account.details_submitted,
    stripeRequirementsDue: account.requirements?.currently_due?.length ?? 0,
    stripePastDue: account.requirements?.past_due?.length ?? 0,
    stripeDisabledReason: account.requirements?.disabled_reason ?? null,
  };
}

// A venue can take card payments only once Stripe says payouts are enabled for its account.
export const canTakeCardPayments = (venue: { stripeAccountId?: string; payoutsEnabled?: boolean } | undefined | null): boolean =>
  !!venue?.stripeAccountId && venue.payoutsEnabled === true;
