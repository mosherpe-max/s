// Test-mode spike: does a Stripe DIRECT charge on a venue's connected account give Koop the setup it wants?
//   - the venue (not Koop) pays Stripe's card processing fee
//   - Koop receives only its application fee (convenience fee minus the cents Koop covers)
//   - a refund is paid by the venue and does not give Koop's fee back
//   - Apple Pay / Google Pay can be registered for the venue's account with one API call
//
// Nothing here is part of the app. It only talks to Stripe, only with a TEST key (it refuses anything else),
// and only creates test-mode records. Run it from Cloud Shell:
//
//   cd ~/s/functions
//   export STRIPE_SECRET_KEY=$(firebase functions:secrets:access STRIPE_SECRET_KEY)
//   node spikes/direct-charge-spike.mjs                      # lists connected accounts to pick from
//   node spikes/direct-charge-spike.mjs acct_XXXX            # runs the spike on that account
//   node spikes/direct-charge-spike.mjs acct_XXXX kooporder.app

import Stripe from 'stripe';
import { pathToFileURL } from 'node:url';

const AMOUNT = 2430;      // $24.30, the same size as the earlier test order
const APP_FEE = 96;       // $0.99 convenience fee minus 3 cents Koop covers
const REFUND_1 = 500;     // a partial refund first, then the rest

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const usd = (cents) => (cents === undefined || cents === null ? 'n/a' : `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`);

export async function runSpike(stripe, { acctId, domain = 'kooporder.app', log = console.log }) {
  const results = [];
  const note = (name, ok, detail) => { results.push({ name, ok, detail }); log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`); };
  const opts = { stripeAccount: acctId };
  const facts = {};

  // 1. The account: who pays fees, who carries losses.
  log(`\n== 1. The connected account ${acctId} ==`);
  const acct = await stripe.accounts.retrieve(acctId);
  const c = acct.controller || {};
  facts.fees_payer = c.fees?.payer;
  facts.losses_payments = c.losses?.payments;
  log(`type=${acct.type}  charges_enabled=${acct.charges_enabled}  payouts_enabled=${acct.payouts_enabled}  card_payments=${acct.capabilities?.card_payments}`);
  log(`controller: fees.payer=${c.fees?.payer}  losses.payments=${c.losses?.payments}  requirement_collection=${c.requirement_collection}  dashboard=${c.stripe_dashboard?.type}`);
  if (acct.type !== 'express') {
    log(`NOTE: this is a ${acct.type.toUpperCase()} account. The app creates EXPRESS accounts, and Express accounts have different fee and loss settings,`);
    log('so run this on an Express account too (finish onboarding for a venue in Koop admin in test mode) before relying on the answers below.');
  }
  if (!acct.charges_enabled) {
    note('Account can take charges', false, 'charges_enabled is false: finish this account\'s test onboarding in Stripe first, or pick another account.');
    return { results, facts };
  }
  note('Account can take charges', true);

  // 2. A direct charge on the venue's account, with Koop's application fee.
  log('\n== 2. Direct charge of ' + usd(AMOUNT) + ' with a ' + usd(APP_FEE) + ' application fee ==');
  const charge = async (payment_method) => stripe.paymentIntents.create({
    amount: AMOUNT, currency: 'usd', application_fee_amount: APP_FEE,
    payment_method, confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    description: 'Koop direct-charge spike (test)', metadata: { spike: 'direct-charge' },
  }, opts);
  let pi;
  try { pi = await charge('pm_card_bypassPending'); }
  catch (e) { log(`  (pm_card_bypassPending failed: ${e.message}; trying pm_card_visa)`); pi = await charge('pm_card_visa'); }
  note('Direct charge succeeded', pi.status === 'succeeded', `PaymentIntent ${pi.id}, status ${pi.status}`);

  // The charge's fee record can take a moment to appear, so look again a few times before giving up.
  let ch = await stripe.charges.retrieve(pi.latest_charge, {}, opts);
  for (let i = 0; i < 5 && !ch.balance_transaction; i++) {
    await sleep(1500);
    ch = await stripe.charges.retrieve(pi.latest_charge, {}, opts);
  }
  const btId = typeof ch.balance_transaction === 'string' ? ch.balance_transaction : ch.balance_transaction?.id;
  const bt = btId ? await stripe.balanceTransactions.retrieve(btId, {}, opts) : null;
  const details = bt?.fee_details || [];
  const stripeFee = details.filter((d) => d.type === 'stripe_fee').reduce((s, d) => s + d.amount, 0);
  const appFee = details.filter((d) => d.type === 'application_fee').reduce((s, d) => s + d.amount, 0);
  facts.stripe_fee_on_venue = stripeFee;
  facts.application_fee = appFee;
  if (bt) {
    log(`On the VENUE's account: charge ${usd(bt.amount)}, fees ${usd(bt.fee)} (stripe_fee ${usd(stripeFee)} + application_fee ${usd(appFee)}), net ${usd(bt.net)}`);
  } else {
    log(`The charge has no balance transaction after waiting. Charge: status=${ch.status} paid=${ch.paid} balance_transaction=${ch.balance_transaction} application_fee=${ch.application_fee}`);
  }
  note('Stripe processing fee is charged to the venue', stripeFee > 0, bt ? `${usd(stripeFee)} on the venue's balance transaction (2.9% + 30c of ${usd(AMOUNT)} = ${usd(Math.round(AMOUNT * 0.029 + 30))})` : 'no balance transaction to read');
  note('Koop receives the application fee', appFee === APP_FEE, `${usd(appFee)}`);

  const feeId = typeof ch.application_fee === 'string' ? ch.application_fee : ch.application_fee?.id;
  let platformFee = null;
  if (feeId) platformFee = await stripe.applicationFees.retrieve(feeId, { expand: ['balance_transaction'] }).catch((e) => { log(`  application fee lookup: ${e.message}`); return null; });
  const platformBt = platformFee?.balance_transaction;
  if (platformBt && typeof platformBt === 'object') {
    facts.platform_fee_received = platformBt.amount;
    facts.platform_stripe_fee = platformBt.fee;
    log(`On KOOP's account: application fee ${usd(platformBt.amount)}, Stripe fee on it ${usd(platformBt.fee)}, net ${usd(platformBt.net)}`);
    note('Koop pays no card processing fee on this order', (platformBt.fee || 0) === 0, `Stripe fee on Koop's side: ${usd(platformBt.fee)}`);
  } else {
    note('Koop-side balance transaction found', false, 'Could not read the application fee balance transaction from the platform.');
  }

  // 3. Refunds on the venue's account.
  log('\n== 3. Refunds, issued on the venue\'s account ==');
  const before = await stripe.balance.retrieve(opts);
  const r1 = await stripe.refunds.create({ payment_intent: pi.id, amount: REFUND_1 }, opts);
  note('Partial refund succeeded', r1.status === 'succeeded' || r1.status === 'pending', `${usd(REFUND_1)} refund ${r1.id} (${r1.status})`);
  const r2 = await stripe.refunds.create({ payment_intent: pi.id }, opts);
  note('Remaining amount refunded', r2.status === 'succeeded' || r2.status === 'pending', `${usd(r2.amount)} refund ${r2.id} (${r2.status})`);

  const feeAfter = feeId ? await stripe.applicationFees.retrieve(feeId) : null;
  facts.application_fee_amount_refunded = feeAfter?.amount_refunded;
  note("Koop's application fee is NOT refunded", !!feeAfter && feeAfter.amount_refunded === 0, `amount_refunded on the application fee: ${usd(feeAfter?.amount_refunded)}`);

  const r2full = await stripe.refunds.retrieve(r2.id, { expand: ['balance_transaction'] }, opts);
  const refundFee = r2full.balance_transaction?.fee ?? 0;
  const after = await stripe.balance.retrieve(opts);
  const sum = (b) => [...(b.available || []), ...(b.pending || [])].reduce((s, x) => s + x.amount, 0);
  facts.venue_balance_change = sum(after) - sum(before);
  log(`Venue balance change across the two refunds: ${usd(facts.venue_balance_change)} (refund fee on the last refund: ${usd(refundFee)})`);
  const venueNetAfterFullRefund = bt ? bt.net - AMOUNT : undefined;
  facts.venue_net_after_full_refund = venueNetAfterFullRefund;
  log(`Venue's total result on this order after the full refund: ${usd(venueNetAfterFullRefund)} (it keeps nothing and does not get back Stripe's fee or Koop's fee)`);
  note('The refund is paid from the venue\'s balance', facts.venue_balance_change <= -(AMOUNT - 1), `balance moved ${usd(facts.venue_balance_change)}`);

  // 4. Apple Pay / Google Pay domain registration for this account.
  log(`\n== 4. Wallet domain registration for ${domain} on this account ==`);
  let pmd;
  try {
    pmd = await stripe.paymentMethodDomains.create({ domain_name: domain }, opts);
  } catch (e) {
    const existing = await stripe.paymentMethodDomains.list({ domain_name: domain }, opts).catch(() => null);
    pmd = existing?.data?.[0];
    if (!pmd) { note('Domain registered for the venue account', false, e.message); }
  }
  if (pmd) {
    let validated = pmd;
    try { validated = await stripe.paymentMethodDomains.validate(pmd.id, opts); } catch (e) { log(`  validate: ${e.message}`); }
    const status = (k) => `${validated[k]?.status}${validated[k]?.status_details?.error_message ? ` (${validated[k].status_details.error_message})` : ''}`;
    facts.apple_pay = validated.apple_pay?.status;
    facts.google_pay = validated.google_pay?.status;
    log(`  enabled=${validated.enabled}  apple_pay=${status('apple_pay')}  google_pay=${status('google_pay')}  link=${status('link')}`);
    note('Domain registered for the venue account', true, `payment method domain ${pmd.id}`);
    note('Apple Pay active for the venue account', validated.apple_pay?.status === 'active',
      validated.apple_pay?.status === 'active' ? '' : 'If inactive: Stripe\'s domain association file must be served at https://' + domain + '/.well-known/apple-developer-merchantid-domain-association');
    note('Google Pay active for the venue account', validated.google_pay?.status === 'active');
  }

  // Summary
  log('\n== Summary ==');
  results.forEach((r) => log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`));
  log('\nFacts: ' + JSON.stringify(facts));
  return { results, facts };
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key.startsWith('sk_test_')) {
    console.error('Refusing to run: STRIPE_SECRET_KEY must be a TEST key (starts with sk_test_). Nothing was done.');
    process.exit(1);
  }
  const stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' });
  const [acctId, domain] = process.argv.slice(2);
  if (!acctId) {
    const list = await stripe.accounts.list({ limit: 20 });
    console.log('Connected accounts in this test account (pass one as the first argument):\n');
    list.data.forEach((a) => console.log(`${a.id}  charges_enabled=${a.charges_enabled}  payouts_enabled=${a.payouts_enabled}  ${a.business_profile?.name || a.email || ''}`));
    return;
  }
  if (!/^acct_/.test(acctId)) { console.error('The first argument should look like acct_XXXX.'); process.exit(1); }
  const { results } = await runSpike(stripe, { acctId, domain });
  process.exit(results.some((r) => !r.ok) ? 2 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('\nSpike stopped:', e.message); process.exit(1); });
}
