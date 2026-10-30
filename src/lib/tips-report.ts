// Tips by staff member for the venue's Tips Report. Pure helpers: group delivered orders by the day and the
// person who delivered them, add up the card tips, and build the CSV for payroll.
//
// A tip belongs to whoever delivered the order: the order's assigned staff member (the driver on a Beverage Cart,
// the runner on a Clubhouse order; the person who prepared a Clubhouse order is not credited). Only card tips are
// counted, since those are the ones that go through Koop to the venue. Tips on orders paid another way (pay at
// delivery, member account) are never counted; they are totalled separately so the venue can see what was left out.
// Days are the 'yyyy-MM-dd' calendar day the order was placed, the same as the Sales Report, so the two tie out.

export interface TipOrder {
  date: string; // 'yyyy-MM-dd'
  menuType: string;
  paymentMethod: string; // 'Digital Payment' | 'Pay at Delivery' | 'Member Account' | ''
  tip: number;
  status: string;
  staffId?: string;
  staffName?: string;
  placedMs: number; // for choosing the newest name when a staff member was renamed
}

export interface TipFilters { mode: string; from: string; to: string; staffKey: string }

export const UNASSIGNED_KEY = '__unassigned';
export const UNASSIGNED_NAME = 'Unassigned';

export interface TipRow {
  date: string;
  staffKey: string;
  staffName: string;
  modes: string[];
  orders: number; // delivered orders they handled
  tippedOrders: number; // card orders that carried a tip
  tips: number;
}

export interface StaffTotal {
  staffKey: string;
  staffName: string;
  modes: string[];
  days: number;
  orders: number;
  tippedOrders: number;
  tips: number;
}

export interface TipReport {
  byDay: TipRow[];
  byStaff: StaffTotal[];
  totalTips: number;
  totalOrders: number;
  totalTippedOrders: number;
  notCounted: { orders: number; tips: number }; // tips on orders not paid by card
  staffOptions: { key: string; name: string }[];
}

const cents = (n: number) => Math.round((n || 0) * 100);
const isCard = (method: string) => method === 'Digital Payment';

export function staffKeyOf(o: Pick<TipOrder, 'staffId' | 'staffName'>): string {
  if (o.staffId) return o.staffId;
  const name = (o.staffName || '').trim().toLowerCase();
  return name ? `name:${name}` : UNASSIGNED_KEY;
}

const modeOrder = (m: string) => ['Beverage Cart', 'Clubhouse', 'Lane Delivery'].indexOf(m);
const sortModes = (modes: Iterable<string>) => Array.from(modes).sort((a, b) => modeOrder(a) - modeOrder(b));

export function buildTipReport(orders: TipOrder[], filters: TipFilters): TipReport {
  const inRange = orders.filter(o =>
    o.status === 'Delivered' &&
    (filters.mode === 'All' || o.menuType === filters.mode) &&
    (!filters.from || o.date >= filters.from) &&
    (!filters.to || o.date <= filters.to)
  );

  // The newest name seen for each person, so a rename shows once.
  const names = new Map<string, { name: string; ms: number }>();
  inRange.forEach(o => {
    const key = staffKeyOf(o);
    const name = key === UNASSIGNED_KEY ? UNASSIGNED_NAME : (o.staffName || '').trim() || UNASSIGNED_NAME;
    const seen = names.get(key);
    if (!seen || o.placedMs > seen.ms) names.set(key, { name, ms: o.placedMs });
  });
  const nameOf = (key: string) => names.get(key)?.name || UNASSIGNED_NAME;
  const staffOptions = Array.from(names.entries())
    .map(([key, v]) => ({ key, name: v.name }))
    .sort((a, b) => (a.key === UNASSIGNED_KEY ? 1 : b.key === UNASSIGNED_KEY ? -1 : a.name.localeCompare(b.name)));

  const scoped = filters.staffKey === 'All' ? inRange : inRange.filter(o => staffKeyOf(o) === filters.staffKey);

  const days = new Map<string, { date: string; staffKey: string; modes: Set<string>; orders: number; tipped: number; tipCents: number }>();
  const notCounted = { orders: 0, cents: 0 };
  scoped.forEach(o => {
    const key = staffKeyOf(o);
    const id = `${o.date}__${key}`;
    const row = days.get(id) || { date: o.date, staffKey: key, modes: new Set<string>(), orders: 0, tipped: 0, tipCents: 0 };
    row.modes.add(o.menuType);
    row.orders += 1;
    if (isCard(o.paymentMethod)) {
      if (cents(o.tip) > 0) { row.tipped += 1; row.tipCents += cents(o.tip); }
    } else if (cents(o.tip) > 0) {
      notCounted.orders += 1;
      notCounted.cents += cents(o.tip);
    }
    days.set(id, row);
  });

  const byDay: TipRow[] = Array.from(days.values())
    .map(r => ({
      date: r.date, staffKey: r.staffKey, staffName: nameOf(r.staffKey), modes: sortModes(r.modes),
      orders: r.orders, tippedOrders: r.tipped, tips: r.tipCents / 100,
    }))
    .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.tips - a.tips || a.staffName.localeCompare(b.staffName)));

  const totals = new Map<string, { staffKey: string; modes: Set<string>; dates: Set<string>; orders: number; tipped: number; tipCents: number }>();
  byDay.forEach(r => {
    const t = totals.get(r.staffKey) || { staffKey: r.staffKey, modes: new Set<string>(), dates: new Set<string>(), orders: 0, tipped: 0, tipCents: 0 };
    r.modes.forEach(m => t.modes.add(m));
    t.dates.add(r.date);
    t.orders += r.orders;
    t.tipped += r.tippedOrders;
    t.tipCents += cents(r.tips);
    totals.set(r.staffKey, t);
  });
  const byStaff: StaffTotal[] = Array.from(totals.values())
    .map(t => ({
      staffKey: t.staffKey, staffName: nameOf(t.staffKey), modes: sortModes(t.modes), days: t.dates.size,
      orders: t.orders, tippedOrders: t.tipped, tips: t.tipCents / 100,
    }))
    .sort((a, b) => b.tips - a.tips || a.staffName.localeCompare(b.staffName));

  const totalCents = byDay.reduce((s, r) => s + cents(r.tips), 0);
  return {
    byDay,
    byStaff,
    totalTips: totalCents / 100,
    totalOrders: byDay.reduce((s, r) => s + r.orders, 0),
    totalTippedOrders: byDay.reduce((s, r) => s + r.tippedOrders, 0),
    notCounted: { orders: notCounted.orders, tips: notCounted.cents / 100 },
    staffOptions,
  };
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const money = (n: number) => n.toFixed(2);
const avg = (tips: number, n: number) => (n > 0 ? money(tips / n) : '');

export function buildTipCsv(report: TipReport, view: 'day' | 'staff', mode: string): string {
  const modeLabel = mode === 'All' ? 'All service modes' : mode;
  const lines: (string | number)[][] = view === 'day'
    ? [
        ['Date', 'Staff Member', 'Service Mode', 'Orders Delivered', 'Tipped Orders', 'Card Tips', 'Average Tip'],
        ...report.byDay.map(r => [r.date, r.staffName, r.modes.join(' / '), r.orders, r.tippedOrders, money(r.tips), avg(r.tips, r.tippedOrders)]),
        ['TOTAL', '', modeLabel, report.totalOrders, report.totalTippedOrders, money(report.totalTips), avg(report.totalTips, report.totalTippedOrders)],
      ]
    : [
        ['Staff Member', 'Service Mode', 'Days Worked', 'Orders Delivered', 'Tipped Orders', 'Card Tips', 'Average Tip'],
        ...report.byStaff.map(s => [s.staffName, s.modes.join(' / '), s.days, s.orders, s.tippedOrders, money(s.tips), avg(s.tips, s.tippedOrders)]),
        ['TOTAL', modeLabel, '', report.totalOrders, report.totalTippedOrders, money(report.totalTips), avg(report.totalTips, report.totalTippedOrders)],
      ];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}
