// A venue's patron list, built from its orders: one row per patron, with their
// lifetime order count and lifetime net revenue (what the patron paid, minus the
// Koop convenience fee). Only delivered orders count, matching the Sales Report.

export interface PatronOrderInput {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  status: string;
  total?: number;
  serviceFee?: number;
  createdAtMs: number;
}

export interface PatronRow {
  key: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  netRevenue: number;
  lastOrderMs: number;
}

// 10-digit US numbers read as (248) 555-0142; anything else is left as entered.
export function formatPhone(raw: string | undefined): string {
  const digits = (raw || '').replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length === 10) return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  return raw || '';
}

// The same person can order under slightly different spellings, so match on email
// first and fall back to the phone number.
function patronKey(o: PatronOrderInput): string {
  const email = (o.customerEmail || '').trim().toLowerCase();
  if (email) return `e:${email}`;
  const digits = (o.customerPhone || '').replace(/\D/g, '');
  if (digits) return `p:${digits.slice(-10)}`;
  return `n:${(o.customerName || '').trim().toLowerCase()}`;
}

export function buildPatronRows(orders: PatronOrderInput[]): PatronRow[] {
  const byKey = new Map<string, PatronRow & { cents: number }>();
  const sorted = orders
    .filter(o => o.status === 'Delivered' && o.createdAtMs)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);
  for (const o of sorted) {
    const key = patronKey(o);
    const net = Math.round(((o.total || 0) - (o.serviceFee || 0)) * 100);
    const existing = byKey.get(key);
    // Orders arrive oldest-first, so the latest details win.
    const details = {
      name: (o.customerName || '').trim(),
      email: (o.customerEmail || '').trim(),
      phone: formatPhone(o.customerPhone),
    };
    if (existing) {
      existing.cents += net;
      existing.orderCount += 1;
      existing.lastOrderMs = o.createdAtMs;
      if (details.name) existing.name = details.name;
      if (details.email) existing.email = details.email;
      if (details.phone) existing.phone = details.phone;
    } else {
      byKey.set(key, { key, ...details, orderCount: 1, netRevenue: 0, cents: net, lastOrderMs: o.createdAtMs });
    }
  }
  return Array.from(byKey.values())
    .map(({ cents, ...row }) => ({ ...row, netRevenue: cents / 100 }));
}

export type PatronSort = 'revenue' | 'orders' | 'recent' | 'name';

export function sortPatronRows(rows: PatronRow[], sort: PatronSort): PatronRow[] {
  const copy = [...rows];
  switch (sort) {
    case 'orders': return copy.sort((a, b) => b.orderCount - a.orderCount || b.netRevenue - a.netRevenue);
    case 'recent': return copy.sort((a, b) => b.lastOrderMs - a.lastOrderMs);
    case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name));
    default: return copy.sort((a, b) => b.netRevenue - a.netRevenue || b.orderCount - a.orderCount);
  }
}

export function filterPatronRows(rows: PatronRow[], term: string): PatronRow[] {
  const t = term.trim().toLowerCase();
  if (!t) return rows;
  const digits = t.replace(/\D/g, '');
  return rows.filter(r =>
    r.name.toLowerCase().includes(t) ||
    r.email.toLowerCase().includes(t) ||
    (digits.length > 0 && r.phone.replace(/\D/g, '').includes(digits))
  );
}

export function totalPatronRows(rows: PatronRow[]): { patrons: number; orderCount: number; netRevenue: number } {
  const cents = rows.reduce((sum, r) => sum + Math.round(r.netRevenue * 100), 0);
  return { patrons: rows.length, orderCount: rows.reduce((sum, r) => sum + r.orderCount, 0), netRevenue: cents / 100 };
}

// A cell that starts with = + - @ would be run as a formula by a spreadsheet, and
// patrons type their own names, so defuse those.
const csvCell = (value: string | number) => {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export function buildPatronCsv(rows: PatronRow[], totals: ReturnType<typeof totalPatronRows>, formatDate: (ms: number) => string): string {
  const lines: (string | number)[][] = [
    ['Name', 'Email', 'Mobile', 'Lifetime Orders', 'Lifetime Net Revenue', 'Last Order'],
    ...rows.map(r => [r.name, r.email, r.phone, r.orderCount, r.netRevenue.toFixed(2), formatDate(r.lastOrderMs)]),
    [`TOTAL (${totals.patrons} patrons)`, '', '', totals.orderCount, totals.netRevenue.toFixed(2), ''],
  ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}
