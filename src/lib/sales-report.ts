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
