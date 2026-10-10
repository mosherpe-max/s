// Pure helpers for the venue Sales Report: filter the daily rows by service mode and
// date range, total each dollar column, and build the CSV the venue can download.
// Dates are 'yyyy-MM-dd' strings, so plain string comparison orders them correctly.

export interface SalesReportRow {
  date: string;
  menuType: string;
  netPayout: number;
  tax: number;
  tip: number;
  orderCount: number;
  isLocked: boolean;
  isToday: boolean;
}

export interface SalesReportTotals {
  netPayout: number;
  tax: number;
  tip: number;
  orderCount: number;
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
  const cents = rows.reduce(
    (t, r) => ({
      netPayout: t.netPayout + Math.round(r.netPayout * 100),
      tax: t.tax + Math.round(r.tax * 100),
      tip: t.tip + Math.round(r.tip * 100),
      orderCount: t.orderCount + r.orderCount,
    }),
    { netPayout: 0, tax: 0, tip: 0, orderCount: 0 }
  );
  return { netPayout: cents.netPayout / 100, tax: cents.tax / 100, tip: cents.tip / 100, orderCount: cents.orderCount };
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const money = (n: number) => n.toFixed(2);

// Dollar columns are plain numbers (no $) so they open as numbers in a spreadsheet.
export function buildSalesReportCsv(rows: SalesReportRow[], totals: SalesReportTotals, mode: string): string {
  const lines: (string | number)[][] = [
    ['Date', 'Service Mode', 'Net Payout', 'Tax', 'Tips', 'Orders', 'Status'],
    ...rows.map(r => [r.date, r.menuType, money(r.netPayout), money(r.tax), money(r.tip), r.orderCount, r.isToday ? 'Today (running)' : 'Locked']),
    ['TOTAL', mode === 'All' ? 'All service modes' : mode, money(totals.netPayout), money(totals.tax), money(totals.tip), totals.orderCount, ''],
  ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}

// ---------------------------------------------------------------------------
// Order detail: one line per delivered order, for matching card deposits and
// for audit. Filters and totals work like the daily rows above.
// ---------------------------------------------------------------------------

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
  totalCollected: number;
}

export interface SalesOrderTotals {
  subtotal: number;
  tax: number;
  tip: number;
  convenienceFee: number;
  netPayout: number;
  totalCollected: number;
  orderCount: number;
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
      totalCollected: t.totalCollected + c(r.totalCollected),
    }),
    { subtotal: 0, tax: 0, tip: 0, convenienceFee: 0, netPayout: 0, totalCollected: 0 }
  );
  return {
    subtotal: sums.subtotal / 100, tax: sums.tax / 100, tip: sums.tip / 100,
    convenienceFee: sums.convenienceFee / 100, netPayout: sums.netPayout / 100,
    totalCollected: sums.totalCollected / 100, orderCount: rows.length,
  };
}

export function buildOrderDetailCsv(rows: SalesOrderRow[], totals: SalesOrderTotals, mode: string): string {
  const lines: (string | number)[][] = [
    ['Order Number', 'Date', 'Time', 'Service Mode', 'Payment Type', 'Stripe Payment ID', 'Subtotal', 'Tax', 'Tips', 'Convenience Fee', 'Net Payout', 'Total Collected'],
    ...rows.map(r => [
      r.orderNumber, r.date, r.time, r.menuType, paymentLabel(r.paymentMethod), r.stripePaymentIntentId,
      money(r.subtotal), money(r.tax), money(r.tip), money(r.convenienceFee), money(r.netPayout), money(r.totalCollected),
    ]),
    [`TOTAL (${totals.orderCount} orders)`, '', '', mode === 'All' ? 'All service modes' : mode, '', '',
      money(totals.subtotal), money(totals.tax), money(totals.tip), money(totals.convenienceFee), money(totals.netPayout), money(totals.totalCollected)],
  ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}
