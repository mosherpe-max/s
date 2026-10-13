// Koop admin sales report: one line per venue per day, with the number of delivered orders,
// what patrons paid in total (gross sales) and Koop's convenience fees. Built from orders;
// money is added up in cents so the totals never drift.

export interface KoopOrderInput {
  sellerId: string;
  status: string;
  total?: number;
  serviceFee?: number;
  createdAtMs: number;
}

export interface KoopVenueInfo {
  name: string;
  isDemo: boolean;
}

export interface KoopSalesRow {
  date: string; // yyyy-MM-dd
  sellerId: string;
  venueName: string;
  isDemo: boolean;
  orders: number;
  grossSales: number;
  koopFees: number;
}

export interface KoopSalesTotals {
  venues: number;
  orders: number;
  grossSales: number;
  koopFees: number;
}

// Demo venues are the dummy ones used for testing; their ids start with "demo-".
export const isDemoVenue = (sellerId: string): boolean => sellerId.startsWith('demo-');

const cents = (n: number | undefined) => Math.round((n || 0) * 100);

export function buildKoopSalesRows(
  orders: KoopOrderInput[],
  venues: Record<string, KoopVenueInfo>,
  formatDate: (ms: number) => string,
): KoopSalesRow[] {
  const byKey = new Map<string, { date: string; sellerId: string; orders: number; gross: number; fees: number }>();
  for (const o of orders) {
    if (o.status !== 'Delivered' || !o.createdAtMs || !o.sellerId) continue;
    const date = formatDate(o.createdAtMs);
    const key = `${date}|${o.sellerId}`;
    const row = byKey.get(key) || { date, sellerId: o.sellerId, orders: 0, gross: 0, fees: 0 };
    row.orders += 1;
    row.gross += cents(o.total);
    row.fees += cents(o.serviceFee);
    byKey.set(key, row);
  }
  return Array.from(byKey.values())
    .map((r) => {
      const venue = venues[r.sellerId];
      return {
        date: r.date,
        sellerId: r.sellerId,
        venueName: venue?.name || r.sellerId,
        isDemo: venue ? venue.isDemo : isDemoVenue(r.sellerId),
        orders: r.orders,
        grossSales: r.gross / 100,
        koopFees: r.fees / 100,
      };
    })
    // Newest day first, venues A-Z within a day.
    .sort((a, b) => (a.date === b.date ? a.venueName.localeCompare(b.venueName) : b.date.localeCompare(a.date)));
}

// Dates are 'yyyy-MM-dd', so plain string comparison orders them. Empty bounds are open.
export function filterKoopSalesRows(rows: KoopSalesRow[], from: string, to: string, includeDemo: boolean): KoopSalesRow[] {
  return rows.filter((r) => (includeDemo || !r.isDemo) && (!from || r.date >= from) && (!to || r.date <= to));
}

export function totalKoopSalesRows(rows: KoopSalesRow[]): KoopSalesTotals {
  const cent = rows.reduce(
    (t, r) => ({ gross: t.gross + Math.round(r.grossSales * 100), fees: t.fees + Math.round(r.koopFees * 100), orders: t.orders + r.orders }),
    { gross: 0, fees: 0, orders: 0 },
  );
  return { venues: new Set(rows.map((r) => r.sellerId)).size, orders: cent.orders, grossSales: cent.gross / 100, koopFees: cent.fees / 100 };
}

// A cell starting with = + - @ would run as a formula in a spreadsheet; venue names are typed
// by people, so defuse those.
export const csvCell = (value: string | number) => {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// Dollar columns are plain numbers (no $) so they open as numbers in a spreadsheet.
export function buildKoopSalesCsv(rows: KoopSalesRow[], totals: KoopSalesTotals): string {
  const lines: (string | number)[][] = [
    ['Date', 'Venue', 'Venue ID', 'Demo Venue', 'Orders', 'Gross Sales', 'Koop Fees'],
    ...rows.map((r) => [r.date, r.venueName, r.sellerId, r.isDemo ? 'Yes' : 'No', r.orders, r.grossSales.toFixed(2), r.koopFees.toFixed(2)]),
    ['TOTAL', `${totals.venues} venue${totals.venues === 1 ? '' : 's'}`, '', '', totals.orders, totals.grossSales.toFixed(2), totals.koopFees.toFixed(2)],
  ];
  return lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}
