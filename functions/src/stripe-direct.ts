// Direct charges: a card payment is made on the venue's own Stripe account (so the venue is the merchant and pays
// Stripe's card processing fee, and refunds and disputes sit with the venue), with Koop's convenience fee taken as
// the application fee. These helpers hold the Stripe calls and the small rules around them so they can be tested
// with a stand-in for Stripe. See createPaymentIntent and initializeVenueStripeOnboarding in index.ts.

import type Stripe from 'stripe';

// Koop's cut of one order: the convenience fee minus the cents Koop covers for the venue, never below zero and never
// more than the order itself.
export function applicationFeeCents(convenienceFeeCents: number, koopCoverageCents: number, totalCents: number): number {
  return Math.min(Math.max(0, Math.round(convenienceFeeCents) - Math.round(koopCoverageCents)), Math.max(0, totalCents));
}

export type AccountAction = 'create' | 'reuse' | 'replace';

// What to do about a venue's Stripe account when it starts or resumes onboarding. New accounts are Standard: the
// venue owns it, pays Stripe's fees, handles its own refunds in its Stripe Dashboard, and Stripe carries any
// losses. An account that was created as Express or Custom and never finished onboarding is replaced; one that is
// already taking payments is left alone.
export function accountAction(existing: { type?: string | null; charges_enabled?: boolean } | null | undefined): AccountAction {
  if (!existing) return 'create';
  if (existing.type === 'standard') return 'reuse';
  return existing.charges_enabled ? 'reuse' : 'replace';
}

export interface CustomerProfile { email?: string; name?: string; phone?: string; buyerUid?: string }

// A patron's saved-card customer lives on the venue's account, so it is only good at that venue. Reuse the first
// candidate that still exists on this account; otherwise make a new one there.
export async function resolveVenueCustomer(
  stripe: Stripe,
  accountId: string,
  candidateIds: Array<string | null | undefined>,
  profile: CustomerProfile,
): Promise<{ id: string; returning: boolean }> {
  for (const id of candidateIds) {
    if (!id) continue;
    try {
      const customer = await stripe.customers.retrieve(id, {}, { stripeAccount: accountId });
      if (customer && !(customer as { deleted?: boolean }).deleted) return { id: customer.id, returning: true };
    } catch {
      // Not a customer on this venue's account (for example one made before direct charges): try the next.
    }
  }
  const created = await stripe.customers.create({
    email: profile.email || undefined,
    name: profile.name || 'Guest Patron',
    phone: profile.phone || undefined,
    metadata: { buyerUid: profile.buyerUid || 'anonymous' },
  }, { stripeAccount: accountId });
  return { id: created.id, returning: false };
}

export interface DirectChargeInput {
  accountId: string;
  amountCents: number;
  applicationFeeCents: number;
  customerId: string;
  metadata: Record<string, string>;
}

export function createDirectPaymentIntent(stripe: Stripe, input: DirectChargeInput) {
  return stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: 'usd',
    customer: input.customerId,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: input.applicationFeeCents,
    metadata: input.metadata,
  }, { stripeAccount: input.accountId });
}

export interface WalletStatus { domain: string; applePay: string | null; googlePay: string | null }

// Apple Pay and Google Pay only show on a domain that is registered for the account taking the payment. With direct
// charges that is the venue's account, so Koop registers its ordering domain for each venue (once, safe to repeat).
export async function ensureWalletDomain(stripe: Stripe, accountId: string, domainName: string): Promise<WalletStatus> {
  const opts = { stripeAccount: accountId };
  const existing = await stripe.paymentMethodDomains.list({ domain_name: domainName, limit: 1 }, opts);
  let pmd = existing.data[0] ?? await stripe.paymentMethodDomains.create({ domain_name: domainName }, opts);
  if (pmd.apple_pay?.status !== 'active' || pmd.google_pay?.status !== 'active') {
    pmd = await stripe.paymentMethodDomains.validate(pmd.id, opts);
  }
  return { domain: domainName, applePay: pmd.apple_pay?.status ?? null, googlePay: pmd.google_pay?.status ?? null };
}
