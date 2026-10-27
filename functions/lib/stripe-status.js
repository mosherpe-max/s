// Turns a Stripe connected account into the handful of facts the app shows and acts on: can this venue
// take card payments and receive payouts, and is Stripe asking it for anything? Kept free of Stripe and
// Firebase so it can be tested directly. Used by the account.updated webhook and the refresh function.
export function stripeStatusFromAccount(account) {
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
export const canTakeCardPayments = (venue) => !!venue?.stripeAccountId && venue.payoutsEnabled === true;
//# sourceMappingURL=stripe-status.js.map