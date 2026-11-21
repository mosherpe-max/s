// Pure helpers for the venue Sales Report: filter the daily rows by service mode and
// date range, total each dollar column, and build the CSV the venue can download.
// Dates are 'yyyy-MM-dd' strings, so plain string comparison orders them correctly.

export interface SalesReportRow {
  date: string;
  menuType: string;
  orderCount: number;
  sales: number;          // items sold: before tax, tips, fees and refunds
  refunds: number;        // refunded to patrons on this day's orders, live (a refund can come after the day is locked)
  tax: number;
  tip: number;
  totalCollected: number; // what patrons paid: sales + convenience fee + tax + tips
  fees: number;           // card processing and service fees together
  deposit: number;        // what reaches the bank for card orders: total collected - refunds - fees
  feesEstimated: boolean; // some of the card fees are estimates, because Stripe's actual fee is not recorded yet
  nonCardOrders: number;  // orders that were not paid by card: in total collected, but not in the deposit
  isLocked: boolean;
  isToday: boolean;
}

export interface SalesReportTotals {
  orderCount: number;
  sales: number;
  refunds: number;
  tax: number;
  tip: number;
  totalCollected: number;
  fees: number;
  deposit: number;
  feesEstimated: boolean; // some of the fees in these rows are estimates
  nonCardOrders: number;
}

export function filterSalesRows(rows: SalesReportRow[], mode: string, from: string, to: string): SalesReportRow[] {
  return rows.filter(r =>
    (mode === 'All' || r.menuType === mode) &&
    (!from || r.date >= from) &&
    (!to || r.date <= to)
  );
}

// Totals are summed in cents so a long report doesn't pick up floating point drift.
export function totalSalesRows(rows: SalesReportRow[]): SalesReportTotals {
  const sum = (pick: (r: SalesReportRow) => number) => rows.reduce((t, r) => t + Math.round(pick(r) * 100), 0) / 100;
  return {
    orderCount: rows.reduce((t, r) => t + r.orderCount, 0),
    sales: sum(r => r.sales),
    refunds: sum(r => r.refunds),
    tax: sum(r => r.tax),
    tip: sum(r => r.tip),
    totalCollected: sum(r => r.totalCollected),
    fees: sum(r => r.fees),
    deposit: sum(r => r.deposit),
    feesEstimated: rows.some(r => r.feesEstimated),
    nonCardOrders: rows.reduce((t, r) => t + r.nonCardOrders, 0),
  };
}

// One day's orders for one service mode, added up in cents. The fees are card processing plus the service fee together, so
// total collected - fees (- later refunds) is the deposit without the two being split out. netPayout and cardFees are what
// older versions of the report showed; they are still recorded when a day is locked.
export interface DaySummary {
  orderCount: number;
  sales: number;
  tax: number;
  tip: number;
  totalCollected: number;
  fees: number;
  depositGross: number; // the deposit before any refund
  feesEstimated: boolean;
  nonCardOrders: number;
  netPayout: number;
  cardFees: number;
}

export function summarizeDay<T extends OrderMoneyInput>(orders: T[], moneyFor: (o: T) => OrderMoney): DaySummary {
  const t = { sales: 0, tax: 0, tip: 0, totalCollected: 0, fees: 0, depositGross: 0, netPayout: 0, cardFees: 0 };
  let feesEstimated = false;
  let nonCardOrders = 0;
  for (const o of orders) {
    const m = moneyFor(o);
    const subtotal = c100(o.subtotal), serviceFee = c100(o.serviceFee), tax = c100(o.tax), tip = c100(o.tip);
    t.sales += subtotal;
    t.tax += tax;
    t.tip += tip;
    t.totalCollected += c100(o.total) || subtotal + serviceFee + tax + tip;
    t.netPayout += Math.round(m.netPayout * 100);
    t.cardFees += Math.round(m.cardFee * 100);
    if (m.isCard) {
      t.fees += Math.round(m.cardFee * 100) + Math.round(m.koopFee * 100);
      t.depositGross += Math.round((m.deposit ?? 0) * 100);
      if (m.cardFeeEstimated) feesEstimated = true;
    } else {
      nonCardOrders += 1;
    }
  }
  const d = (n: number) => n / 100;
  return {
    orderCount: orders.length, sales: d(t.sales), tax: d(t.tax), tip: d(t.tip), totalCollected: d(t.totalCollected), fees: d(t.fees),
    depositGross: d(t.depositGross), feesEstimated, nonCardOrders, netPayout: d(t.netPayout), cardFees: d(t.cardFees),
  };
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const money = (n: number) => n.toFixed(2);

// Dollar columns are plain numbers (no $) so they open as numbers in a spreadsheet.
export function buildSalesReportCsv(rows: SalesReportRow[], totals: SalesReportTotals, mode: string): string {
  const fee = (estimated: boolean, n: number) => `${estimated ? '~' : ''}${money(n)}`;
  const lines: (string | number)[][] = [
    ['Date', 'Service Mode', 'Orders', 'Sales', 'Refunds', 'Tax', 'Tips', 'Total Collected', 'Fees (card + service)', 'Deposit', 'Status'],
    ...rows.map(r => [r.date, r.menuType, r.orderCount, money(r.sales), r.refunds ? money(r.refunds) : '', money(r.tax), money(r.tip), money(r.totalCollected), fee(r.feesEstimated, r.fees), money(r.deposit), r.isToday ? 'Today (running)' : 'Locked']),
    ['TOTAL', mode === 'All' ? 'All service modes' : mode, totals.orderCount, money(totals.sales), money(totals.refunds), money(totals.tax), money(totals.tip), money(totals.totalCollected), fee(totals.feesEstimated, totals.fees), money(totals.deposit), ''],
  ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}

// ---------------------------------------------------------------------------
// Order detail: one line per delivered order, for matching card deposits and
// for audit. Filters and totals work like the daily rows above.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// What one order is worth to the venue. Card orders are direct charges on the venue's own Stripe account: Stripe's
// processing fee comes out of the venue's balance and Koop takes its fee (the convenience fee minus the cents Koop
// covers) as the application fee, so the bank deposit is the total less both. The fee Stripe actually charged is
// recorded on the order when the payment completes; until then it is estimated at Stripe's standard 2.9% + 30c.
// Orders paid another way never went through Stripe: no fees, and the venue keeps what it collected itself.
// ---------------------------------------------------------------------------

export const CARD_FEE_RATE = 0.029;
export const CARD_FEE_FIXED = 0.30;

export interface OrderMoneyInput {
  paymentMethod?: string;
  subtotal?: number;
  serviceFee?: number;
  tax?: number;
  tip?: number;
  total?: number;
  stripeFee?: number; // actual, recorded from Stripe
  koopFee?: number;   // actual application fee, recorded from Stripe
  refundedAmount?: number; // refunded to the patron so far
}

export interface OrderMoney {
  isCard: boolean;
  koopFee: number;
  cardFee: number;
  cardFeeEstimated: boolean;
  netPayout: number;       // sales after card fees and Koop's fee; net payout + tax + tips = the deposit for a card order
  deposit: number | null;  // what Stripe pays out for this order; null when it was not paid by card
  refunded: number;        // refunded to the patron
  // The same order once refunds are taken out. A refund returns the patron's money, but Stripe's fee and Koop's fee are
  // not given back, so a fully refunded order costs the venue both. Tax and tips are returned in proportion.
  afterRefund: { netPayout: number; tax: number; tip: number; deposit: number | null };
}

const c100 = (n: number | undefined) => Math.round((n || 0) * 100);

export interface CardFeeEstimate { percent: number; fixedCents: number }

export function orderMoney(
  o: OrderMoneyInput,
  solutionFeeFixedDollars: number,
  estimate: CardFeeEstimate = { percent: CARD_FEE_RATE * 100, fixedCents: CARD_FEE_FIXED * 100 },
): OrderMoney {
  const subtotal = c100(o.subtotal);
  const serviceFee = c100(o.serviceFee);
  const tax = c100(o.tax);
  const tip = c100(o.tip);
  if (o.paymentMethod !== 'Digital Payment') {
    const net = (subtotal + serviceFee) / 100;
    return {
      isCard: false, koopFee: 0, cardFee: 0, cardFeeEstimated: false, netPayout: net, deposit: null, refunded: 0,
      afterRefund: { netPayout: net, tax: tax / 100, tip: tip / 100, deposit: null },
    };
  }
  const total = c100(o.total) || subtotal + serviceFee + tax + tip;
  const koopFee = typeof o.koopFee === 'number' ? c100(o.koopFee) : Math.max(0, serviceFee - c100(solutionFeeFixedDollars));
  const hasActual = typeof o.stripeFee === 'number';
  const cardFee = hasActual ? c100(o.stripeFee) : Math.round(total * estimate.percent / 100 + estimate.fixedCents);
  const refunded = Math.min(total, c100(o.refundedAmount));
  const kept = total > 0 ? (total - refunded) / total : 1; // the share of the order the patron still paid for
  return {
    isCard: true,
    koopFee: koopFee / 100,
    cardFee: cardFee / 100,
    cardFeeEstimated: !hasActual,
    netPayout: (subtotal + serviceFee - koopFee - cardFee) / 100,
    deposit: (total - koopFee - cardFee) / 100,
    refunded: refunded / 100,
    afterRefund: (() => {
      // Tax and tips are rounded first and net payout is what is left of the deposit, so the three always add up to it.
      const depositAfter = total - refunded - koopFee - cardFee;
      const taxAfter = Math.round(tax * kept);
      const tipAfter = Math.round(tip * kept);
      return { netPayout: (depositAfter - taxAfter - tipAfter) / 100, tax: taxAfter / 100, tip: tipAfter / 100, deposit: depositAfter / 100 };
    })(),
  };
}

export type SalesPaymentFilter = 'All' | 'Card' | 'Pay at Delivery' | 'Member Account';

export interface SalesOrderRow {
  orderNumber: string;
  orderId: string;
  date: string; // 'yyyy-MM-dd', local calendar day the order was placed
  time: string; // 'h:mm a'
  menuType: string;
  paymentMethod: string; // 'Digital Payment' | 'Pay at Delivery' | 'Member Account' | ''
  stripePaymentIntentId: string;
  subtotal: number;
  tax: number;
  tip: number;
  convenienceFee: number;
  netPayout: number;
  cardFee: number;
  cardFeeEstimated: boolean;
  deposit: number | null; // the card payout for this order; null when not paid by card
  refunded: number;       // refunded to the patron; net payout, tax, tips and deposit above already have it taken out
  totalCollected: number;
}

export interface SalesOrderTotals {
  subtotal: number;
  tax: number;
  tip: number;
  convenienceFee: number;
  netPayout: number;
  cardFee: number;
  deposit: number;
  refunded: number;
  totalCollected: number;
  orderCount: number;
  cardFeeEstimated: boolean; // some of the card fees in these rows are estimates
}

export const paymentLabel = (method: string): string =>
  method === 'Digital Payment' ? 'Card' : method || 'Unknown';

export function filterSalesOrderRows(
  rows: SalesOrderRow[], mode: string, from: string, to: string, payment: SalesPaymentFilter
): SalesOrderRow[] {
  return rows.filter(r =>
    (mode === 'All' || r.menuType === mode) &&
    (!from || r.date >= from) &&
    (!to || r.date <= to) &&
    (payment === 'All' || paymentLabel(r.paymentMethod) === payment)
  );
}

export function totalSalesOrderRows(rows: SalesOrderRow[]): SalesOrderTotals {
  const c = (n: number) => Math.round(n * 100);
  const sums = rows.reduce(
    (t, r) => ({
      subtotal: t.subtotal + c(r.subtotal), tax: t.tax + c(r.tax), tip: t.tip + c(r.tip),
      convenienceFee: t.convenienceFee + c(r.convenienceFee), netPayout: t.netPayout + c(r.netPayout),
      cardFee: t.cardFee + c(r.cardFee), deposit: t.deposit + c(r.deposit ?? 0), refunded: t.refunded + c(r.refunded),
      totalCollected: t.totalCollected + c(r.totalCollected),
    }),
    { subtotal: 0, tax: 0, tip: 0, convenienceFee: 0, netPayout: 0, cardFee: 0, deposit: 0, refunded: 0, totalCollected: 0 }
  );
  return {
    subtotal: sums.subtotal / 100, tax: sums.tax / 100, tip: sums.tip / 100,
    convenienceFee: sums.convenienceFee / 100, netPayout: sums.netPayout / 100,
    cardFee: sums.cardFee / 100, deposit: sums.deposit / 100, refunded: sums.refunded / 100,
    cardFeeEstimated: rows.some(r => r.cardFeeEstimated),
    totalCollected: sums.totalCollected / 100, orderCount: rows.length,
  };
}

export function buildOrderDetailCsv(rows: SalesOrderRow[], totals: SalesOrderTotals, mode: string): string {
  const lines: (string | number)[][] = [
    ['Order Number', 'Date', 'Time', 'Service Mode', 'Payment Type', 'Stripe Payment ID', 'Subtotal', 'Tax', 'Tips', 'Convenience Fee', 'Card Fee', 'Net Payout', 'Deposit', 'Refunded', 'Total Collected'],
    ...rows.map(r => [
      r.orderNumber, r.date, r.time, r.menuType, paymentLabel(r.paymentMethod), r.stripePaymentIntentId,
      money(r.subtotal), money(r.tax), money(r.tip), money(r.convenienceFee),
      r.cardFee === 0 && r.deposit === null ? '' : `${r.cardFeeEstimated ? '~' : ''}${money(r.cardFee)}`, money(r.netPayout), r.deposit === null ? '' : money(r.deposit), r.refunded ? money(r.refunded) : '', money(r.totalCollected),
    ]),
    [`TOTAL (${totals.orderCount} orders)`, '', '', mode === 'All' ? 'All service modes' : mode, '', '',
      money(totals.subtotal), money(totals.tax), money(totals.tip), money(totals.convenienceFee), `${totals.cardFeeEstimated ? '~' : ''}${money(totals.cardFee)}`, money(totals.netPayout), money(totals.deposit), money(totals.refunded), money(totals.totalCollected)],
  ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}
