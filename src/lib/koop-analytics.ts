// Koop admin analytics: sales performance from orders, and order timing from the orderTimings records.
// Pure functions (no Firebase) so the numbers can be tested directly. Money is added up in cents so
// totals never drift, and every figure here uses the same rules as the Koop Sales Report: delivered
// orders only, dated by when they were placed.

import { csvCell } from '@/lib/koop-sales-report';

export interface AnalyticsOrder {
  sellerId: string;
  status: string;
  total?: number;
  serviceFee?: number;
  createdAtMs: number;
  notes?: string;
}

export interface AnalyticsVenue {
  name: string;
  isDemo: boolean;
}

const cents = (n: number | undefined) => Math.round((n || 0) * 100);

// ---- dates ('yyyy-MM-dd' strings, plain calendar arithmetic) ----

const DAY_MS = 86_400_000;
const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (key: string, days: number): string => toKey(parseKey(key) + days * DAY_MS);

// Number of calendar days from..to, both included.
export const daysInRange = (from: string, to: string): number => Math.max(0, Math.round((parseKey(to) - parseKey(from)) / DAY_MS) + 1);

// The period of the same length directly before from..to, used for "vs the period before".
export function priorRange(from: string, to: string): { from: string; to: string } {
  const length = daysInRange(from, to);
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const length = daysInRange(from, to);
  for (let i = 0; i < length; i++) out.push(addDays(from, i));
  return out;
}

// ---- helpers ----

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const value = sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
  return Math.round(value);
}

export const median = (values: number[]): number | null => percentile(values, 50);

// Change from before to now as a percentage. Null when there was nothing before to compare with.
export function changePct(now: number, before: number): number | null {
  if (!(before > 0)) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

export function formatDuration(sec: number | null | undefined): string {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return '—';
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest === 0 ? `${m}m` : `${m}m ${String(rest).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
}

const isResetCancel = (o: AnalyticsOrder) => typeof o.notes === 'string' && o.notes.startsWith('Operational Reset');
const isDemoId = (id: string) => id.startsWith('demo-');

// ---- sales ----

export interface SalesTotals {
  orders: number;
  grossSales: number;
  koopFees: number;
  avgOrder: number | null;
  activeVenues: number;
  cancelled: number;
  cancelRatePct: number | null;
}

export interface DailyPoint {
  date: string;
  orders: number;
  grossSales: number;
}

export interface VenueSalesRow {
  sellerId: string;
  venueName: string;
  isDemo: boolean;
  orders: number;
  grossSales: number;
  koopFees: number;
  avgOrder: number | null;
  activeDays: number;
  ordersPerActiveDay: number | null;
  priorOrders: number;
  priorGrossSales: number;
  grossChangePct: number | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  cancelled: number;
  cancelRatePct: number | null;
}

export interface SalesAnalytics {
  totals: SalesTotals;
  prior: { orders: number; grossSales: number; koopFees: number; avgOrder: number | null; activeVenues: number };
  daily: DailyPoint[];
  venues: VenueSalesRow[];
}

interface Bucket { orders: number; cents: number; fees: number; days: Set<string>; cancelled: number }
const newBucket = (): Bucket => ({ orders: 0, cents: 0, fees: 0, days: new Set(), cancelled: 0 });

export function buildSalesAnalytics(
  orders: AnalyticsOrder[],
  venues: Record<string, AnalyticsVenue>,
  formatDate: (ms: number) => string,
  from: string,
  to: string,
  includeDemo: boolean,
  today: string = to,
): SalesAnalytics {
  const prior = priorRange(from, to);
  const current = new Map<string, Bucket>();
  const before = new Map<string, Bucket>();
  const lastOrder = new Map<string, string>();
  const daily = new Map<string, { orders: number; cents: number }>(eachDay(from, to).map((d) => [d, { orders: 0, cents: 0 }]));

  const venueIsDemo = (id: string) => (venues[id] ? venues[id].isDemo : isDemoId(id));

  for (const o of orders) {
    if (!o.sellerId || !o.createdAtMs) continue;
    if (!includeDemo && venueIsDemo(o.sellerId)) continue;
    const date = formatDate(o.createdAtMs);
    const inCurrent = date >= from && date <= to;
    const inPrior = date >= prior.from && date <= prior.to;

    if (o.status === 'Delivered') {
      const prev = lastOrder.get(o.sellerId);
      if (!prev || date > prev) lastOrder.set(o.sellerId, date);
      const map = inCurrent ? current : inPrior ? before : null;
      if (!map) continue;
      const b = map.get(o.sellerId) || newBucket();
      b.orders += 1;
      b.cents += cents(o.total);
      b.fees += cents(o.serviceFee);
      b.days.add(date);
      map.set(o.sellerId, b);
      if (inCurrent) {
        const d = daily.get(date)!;
        d.orders += 1;
        d.cents += cents(o.total);
      }
    } else if (o.status === 'Cancelled' && !isResetCancel(o)) {
      // The nightly reset cancels open orders; those are housekeeping, not real cancellations.
      const map = inCurrent ? current : inPrior ? before : null;
      if (!map) continue;
      const b = map.get(o.sellerId) || newBucket();
      b.cancelled += 1;
      map.set(o.sellerId, b);
    }
  }

  const sum = (map: Map<string, Bucket>) => {
    let ordersN = 0, c = 0, fees = 0, cancelled = 0, active = 0;
    for (const b of map.values()) {
      ordersN += b.orders; c += b.cents; fees += b.fees; cancelled += b.cancelled;
      if (b.orders > 0) active += 1;
    }
    return { orders: ordersN, cents: c, fees, cancelled, active };
  };
  const cur = sum(current);
  const prev = sum(before);

  const ids = new Set<string>([...current.keys(), ...before.keys()]);
  for (const id of Object.keys(venues)) if (includeDemo || !venues[id].isDemo) ids.add(id);

  const rows: VenueSalesRow[] = Array.from(ids).map((id) => {
    const b = current.get(id) || newBucket();
    const p = before.get(id) || newBucket();
    const last = lastOrder.get(id) || null;
    const decided = b.orders + b.cancelled;
    return {
      sellerId: id,
      venueName: venues[id]?.name || id,
      isDemo: venueIsDemo(id),
      orders: b.orders,
      grossSales: b.cents / 100,
      koopFees: b.fees / 100,
      avgOrder: b.orders > 0 ? Math.round(b.cents / b.orders) / 100 : null,
      activeDays: b.days.size,
      ordersPerActiveDay: b.days.size > 0 ? Math.round((b.orders / b.days.size) * 10) / 10 : null,
      priorOrders: p.orders,
      priorGrossSales: p.cents / 100,
      grossChangePct: changePct(b.cents, p.cents),
      lastOrderDate: last,
      daysSinceLastOrder: last ? Math.max(0, daysInRange(last, today) - 1) : null,
      cancelled: b.cancelled,
      cancelRatePct: decided > 0 ? Math.round((b.cancelled / decided) * 1000) / 10 : null,
    };
  }).sort((a, b) => b.grossSales - a.grossSales || a.venueName.localeCompare(b.venueName));

  const decided = cur.orders + cur.cancelled;
  return {
    totals: {
      orders: cur.orders,
      grossSales: cur.cents / 100,
      koopFees: cur.fees / 100,
      avgOrder: cur.orders > 0 ? Math.round(cur.cents / cur.orders) / 100 : null,
      activeVenues: cur.active,
      cancelled: cur.cancelled,
      cancelRatePct: decided > 0 ? Math.round((cur.cancelled / decided) * 1000) / 10 : null,
    },
    prior: {
      orders: prev.orders,
      grossSales: prev.cents / 100,
      koopFees: prev.fees / 100,
      avgOrder: prev.orders > 0 ? Math.round(prev.cents / prev.orders) / 100 : null,
      activeVenues: prev.active,
    },
    daily: Array.from(daily.entries()).map(([date, d]) => ({ date, orders: d.orders, grossSales: d.cents / 100 })),
    venues: rows,
  };
}

// ---- timing ----

// What the orderTimings records hold that this page uses.
export interface TimingRecord {
  sellerId: string;
  menuType?: string;
  outcome?: string;          // 'Delivered' | 'Cancelled', set once the order is finished
  isDemo?: boolean;
  suspect?: boolean;
  cancelReason?: string | null;
  totalSec?: number | null;
  ackSec?: number | null;
  prepSec?: number | null;
  deliverySec?: number | null;
  localDate?: string;        // the venue's calendar day the order was placed
  placedAtMs?: number;
}

export interface Stat {
  n: number;
  median: number | null;
  p90: number | null;
}

export interface TimingRow {
  key: string;
  sellerId: string;
  venueName: string;
  isDemo: boolean;
  menuType: string;
  orders: number;
  medianTotalSec: number | null;
  p90TotalSec: number | null;
  medianAckSec: number | null;
  medianPrepSec: number | null;
  medianDeliverySec: number | null;
  limitMinutes: number | null;   // the limit used for this row's venue and mode
  withinLimitPct: number | null;
}

export interface HistogramBucket { label: string; fromMin: number; toMin: number | null; count: number }

export interface TimingAnalytics {
  counts: {
    finished: number;        // delivered orders in range (after the demo filter)
    usable: number;          // delivered with trustworthy step times
    suspect: number;         // delivered but step times look tapped through
    resetCancelled: number;  // cancelled by the nightly reset (never real cancellations)
    cancelled: number;       // genuinely cancelled
  };
  total: Stat;
  ack: Stat;
  prep: Stat;
  delivery: Stat;
  withinLimitPct: number | null;
  ackWithinLimitPct: number | null;
  histogram: HistogramBucket[];
  rows: TimingRow[];
}

const BUCKET_EDGES = [0, 5, 10, 15, 20, 25, 30, 40];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const stat = (values: number[]): Stat => ({ n: values.length, median: median(values), p90: percentile(values, 90) });
const pctOf = (hits: number, of: number): number | null => (of === 0 ? null : Math.round((hits / of) * 1000) / 10);

export function buildTimingAnalytics(
  records: TimingRecord[],
  venues: Record<string, AnalyticsVenue>,
  formatDate: (ms: number) => string,
  from: string,
  to: string,
  includeDemo: boolean,
  // Each venue and service mode has its own limits (the venue's override, else Koop's setting, else the built-in
  // fallback), so the share "within the limit" is judged order by order against the limit that applies to it.
  limitFor: (sellerId: string, menuType: string) => { totalMinutes: number; ackSeconds: number },
): TimingAnalytics {
  const venueIsDemo = (r: TimingRecord) => (venues[r.sellerId] ? venues[r.sellerId].isDemo : isDemoId(r.sellerId)) || !!r.isDemo;
  const counts = { finished: 0, usable: 0, suspect: 0, resetCancelled: 0, cancelled: 0 };
  const usable: TimingRecord[] = [];

  for (const r of records) {
    if (!r.sellerId) continue;
    if (!includeDemo && venueIsDemo(r)) continue;
    const date = r.localDate || (r.placedAtMs ? formatDate(r.placedAtMs) : '');
    if (!date || date < from || date > to) continue;
    if (r.outcome === 'Cancelled') {
      if (r.cancelReason === 'operational-reset') counts.resetCancelled += 1;
      else counts.cancelled += 1;
      continue;
    }
    if (r.outcome !== 'Delivered') continue;
    counts.finished += 1;
    if (r.suspect || !isNum(r.totalSec)) { counts.suspect += 1; continue; }
    counts.usable += 1;
    usable.push(r);
  }

  const totals = usable.map((r) => r.totalSec as number);
  const col = (pick: (r: TimingRecord) => number | null | undefined) => usable.map(pick).filter(isNum);
  const limitOf = (r: TimingRecord) => limitFor(r.sellerId, r.menuType || 'Unknown');
  const withinTotal = (r: TimingRecord) => (r.totalSec as number) <= limitOf(r).totalMinutes * 60;

  const groups = new Map<string, TimingRecord[]>();
  for (const r of usable) {
    const key = `${r.sellerId}|${r.menuType || 'Unknown'}`;
    groups.set(key, [...(groups.get(key) || []), r]);
  }
  const rows: TimingRow[] = Array.from(groups.entries()).map(([key, list]) => {
    const t = list.map((r) => r.totalSec as number);
    const first = list[0];
    return {
      key,
      sellerId: first.sellerId,
      venueName: venues[first.sellerId]?.name || first.sellerId,
      isDemo: venueIsDemo(first),
      menuType: first.menuType || 'Unknown',
      orders: list.length,
      medianTotalSec: median(t),
      p90TotalSec: percentile(t, 90),
      medianAckSec: median(list.map((r) => r.ackSec).filter(isNum)),
      medianPrepSec: median(list.map((r) => r.prepSec).filter(isNum)),
      medianDeliverySec: median(list.map((r) => r.deliverySec).filter(isNum)),
      limitMinutes: limitOf(first).totalMinutes,
      withinLimitPct: pctOf(list.filter(withinTotal).length, list.length),
    };
  }).sort((a, b) => b.orders - a.orders || a.venueName.localeCompare(b.venueName) || a.menuType.localeCompare(b.menuType));

  const histogram: HistogramBucket[] = BUCKET_EDGES.map((edge, i) => {
    const next = BUCKET_EDGES[i + 1] ?? null;
    return {
      label: next === null ? `${edge}+ min` : `${edge}-${next} min`,
      fromMin: edge,
      toMin: next,
      count: totals.filter((s) => s >= edge * 60 && (next === null || s < next * 60)).length,
    };
  });

  return {
    counts,
    total: stat(totals),
    ack: stat(col((r) => r.ackSec)),
    prep: stat(col((r) => r.prepSec)),
    delivery: stat(col((r) => r.deliverySec)),
    withinLimitPct: pctOf(usable.filter(withinTotal).length, usable.length),
    ackWithinLimitPct: (() => {
      const withAck = usable.filter((r) => isNum(r.ackSec));
      return pctOf(withAck.filter((r) => (r.ackSec as number) <= limitOf(r).ackSeconds).length, withAck.length);
    })(),
    histogram,
    rows,
  };
}

// ---- CSV ----

const line = (cells: (string | number)[]) => cells.map(csvCell).join(',');

export function buildVenueSalesCsv(rows: VenueSalesRow[], from: string, to: string): string {
  return [
    line(['Venue', 'Venue ID', 'Demo Venue', 'From', 'To', 'Orders', 'Gross Sales', 'Koop Fees', 'Avg Order', 'Active Days', 'Orders Per Active Day', 'Prior Period Gross Sales', 'Gross Change %', 'Last Order', 'Days Since Last Order', 'Cancelled', 'Cancel Rate %']),
    ...rows.map((r) => line([
      r.venueName, r.sellerId, r.isDemo ? 'Yes' : 'No', from, to, r.orders, r.grossSales.toFixed(2), r.koopFees.toFixed(2),
      r.avgOrder === null ? '' : r.avgOrder.toFixed(2), r.activeDays, r.ordersPerActiveDay ?? '', r.priorGrossSales.toFixed(2),
      r.grossChangePct ?? '', r.lastOrderDate ?? '', r.daysSinceLastOrder ?? '', r.cancelled, r.cancelRatePct ?? '',
    ])),
  ].join('\r\n');
}

// Times are in whole seconds so they open as plain numbers in a spreadsheet.
export function buildTimingCsv(rows: TimingRow[], from: string, to: string): string {
  return [
    line(['Venue', 'Venue ID', 'Demo Venue', 'Service Mode', 'From', 'To', 'Orders', 'Median Total (s)', '90th Percentile Total (s)', 'Median Acknowledge (s)', 'Median Prep (s)', 'Median Delivery Leg (s)', 'Limit (min)', 'Within Limit %']),
    ...rows.map((r) => line([
      r.venueName, r.sellerId, r.isDemo ? 'Yes' : 'No', r.menuType, from, to, r.orders,
      r.medianTotalSec ?? '', r.p90TotalSec ?? '', r.medianAckSec ?? '', r.medianPrepSec ?? '', r.medianDeliverySec ?? '', r.limitMinutes ?? '', r.withinLimitPct ?? '',
    ])),
  ].join('\r\n');
}
