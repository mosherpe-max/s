import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Card payments are made on the venue's own Stripe account (a direct charge), so the browser has to load Stripe for
// that account. One loader per account, kept so the checkout does not reload Stripe on every render.
const loaders = new Map<string, Promise<Stripe | null>>();

export function getStripeForAccount(stripeAccountId: string): Promise<Stripe | null> {
  let loader = loaders.get(stripeAccountId);
  if (!loader) {
    loader = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder', { stripeAccount: stripeAccountId });
    loaders.set(stripeAccountId, loader);
  }
  return loader;
}

// A saved-card customer belongs to one venue's Stripe account, so what the browser remembers is kept per venue.
export const stripeCustomerCacheKey = (sellerId: string) => `koop_stripe_customer_id:${sellerId}`;
