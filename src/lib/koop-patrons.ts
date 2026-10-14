// The Koop-wide patron list: one row per person across every venue, with their contact details,
// lifetime order value, lifetime order count and the venues they have ordered from. Built from
// delivered orders, like the Sales Report. People are matched on email, then phone, then name,
// the same way each venue's own patron list matches them.

import { formatPhone, patronKey, type PatronOrderInput } from '@/lib/patron-list';
import { csvCell } from '@/lib/koop-sales-report';

export interface KoopPatronOrder extends PatronOrderInput {
  sellerId: string;
}

export interface KoopPatronVenue {
  name: string;
  isDemo: boolean;
}

export interface PatronVenueCount {
  sellerId: string;
  venueName: string;
  isDemo: boolean;
  orders: number;
}

export interface KoopPatronRow {
  key: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  orderValue: number;   // what the patron paid in total, Koop's convenience fee included
  koopFees: number;     // the convenience fees within that
  firstOrderMs: number;
  lastOrderMs: number;
  venues: PatronVenueCount[];
}

const cents = (n: number | undefined) => Math.round((n || 0) * 100);

export function buildKoopPatronRows(
  orders: KoopPatronOrder[],
  venues: Record<string, KoopPatronVenue>,
  options: { includeDemo: boolean; venueId?: string } = { includeDemo: true },
): KoopPatronRow[] {
  const demoOf = (id: string) => (venues[id] ? venues[id].isDemo : id.startsWith('demo-'));
  const sorted = orders
    .filter((o) => o.status === 'Delivered' && o.createdAtMs && o.sellerId)
    .filter((o) => options.includeDemo || !demoOf(o.sellerId))
    .filter((o) => !options.venueId || o.sellerId === options.venueId)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);

  const byKey = new Map<string, KoopPatronRow & { valueCents: number; feeCents: number; perVenue: Map<string, number> }>();
  for (const o of sorted) {
    const key = patronKey(o);
    const details = { name: (o.customerName || '').trim(), email: (o.customerEmail || '').trim(), phone: formatPhone(o.customerPhone) };
    let row = byKey.get(key);
    if (!row) {
      row = { key, ...details, orderCount: 0, orderValue: 0, koopFees: 0, firstOrderMs: o.createdAtMs, lastOrderMs: o.createdAtMs, venues: [], valueCents: 0, feeCents: 0, perVenue: new Map() };
      byKey.set(key, row);
    }
    // Oldest first, so the latest details win.
    if (details.name) row.name = details.name;
    if (details.email) row.email = details.email;
    if (details.phone) row.phone = details.phone;
    row.orderCount += 1;
    row.valueCents += cents(o.total);
    row.feeCents += cents(o.serviceFee);
    row.lastOrderMs = o.createdAtMs;
    row.perVenue.set(o.sellerId, (row.perVenue.get(o.sellerId) || 0) + 1);
  }

  return Array.from(byKey.values()).map(({ valueCents, feeCents, perVenue, ...row }) => ({
    ...row,
    orderValue: valueCents / 100,
    koopFees: feeCents / 100,
    venues: Array.from(perVenue.entries())
      .map(([sellerId, count]) => ({ sellerId, venueName: venues[sellerId]?.name || sellerId, isDemo: demoOf(sellerId), orders: count }))
      .sort((a, b) => b.orders - a.orders || a.venueName.localeCompare(b.venueName)),
  }));
}

export type KoopPatronSort = 'value' | 'orders' | 'recent' | 'venues' | 'name';

export function sortKoopPatrons(rows: KoopPatronRow[], sort: KoopPatronSort): KoopPatronRow[] {
  const copy = [...rows];
  switch (sort) {
    case 'orders': return copy.sort((a, b) => b.orderCount - a.orderCount || b.orderValue - a.orderValue);
    case 'recent': return copy.sort((a, b) => b.lastOrderMs - a.lastOrderMs);
    case 'venues': return copy.sort((a, b) => b.venues.length - a.venues.length || b.orderValue - a.orderValue);
    case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name));
    default: return copy.sort((a, b) => b.orderValue - a.orderValue || b.orderCount - a.orderCount);
  }
}

export function filterKoopPatrons(rows: KoopPatronRow[], term: string): KoopPatronRow[] {
  const t = term.trim().toLowerCase();
  if (!t) return rows;
  const digits = t.replace(/\D/g, '');
  return rows.filter((r) =>
    r.name.toLowerCase().includes(t) ||
    r.email.toLowerCase().includes(t) ||
    (digits.length > 0 && r.phone.replace(/\D/g, '').includes(digits)) ||
    r.venues.some((v) => v.venueName.toLowerCase().includes(t)),
  );
}

export interface KoopPatronTotals {
  patrons: number;
  orders: number;
  orderValue: number;
  koopFees: number;
  multiVenue: number;  // patrons who have ordered from two or more venues
}

export function totalKoopPatrons(rows: KoopPatronRow[]): KoopPatronTotals {
  const c = rows.reduce((t, r) => ({ value: t.value + Math.round(r.orderValue * 100), fees: t.fees + Math.round(r.koopFees * 100), orders: t.orders + r.orderCount }), { value: 0, fees: 0, orders: 0 });
  return { patrons: rows.length, orders: c.orders, orderValue: c.value / 100, koopFees: c.fees / 100, multiVenue: rows.filter((r) => r.venues.length > 1).length };
}

const line = (cells: (string | number)[]) => cells.map(csvCell).join(',');

export function buildKoopPatronCsv(rows: KoopPatronRow[], totals: KoopPatronTotals, formatDate: (ms: number) => string): string {
  return [
    line(['Name', 'Email', 'Mobile', 'Lifetime Orders', 'Lifetime Order Value', 'Koop Fees', 'Venue Count', 'Venues', 'First Order', 'Last Order']),
    ...rows.map((r) => line([
      r.name, r.email, r.phone, r.orderCount, r.orderValue.toFixed(2), r.koopFees.toFixed(2), r.venues.length,
      r.venues.map((v) => `${v.venueName} (${v.orders})`).join('; '), formatDate(r.firstOrderMs), formatDate(r.lastOrderMs),
    ])),
    line([`TOTAL (${totals.patrons} patrons)`, '', '', totals.orders, totals.orderValue.toFixed(2), totals.koopFees.toFixed(2), '', '', '', '']),
  ].join('\r\n');
}
