// Dollars per round: Bev cart (and Clubhouse + Bev cart) sales divided by the rounds the course played, by month.
//
// Two sources feed it:
//  - Records the venue (or the Koop team) typed in or uploaded: rounds, and for past seasons the Bev cart sales.
//    Each record covers one day, one week (starting on the date given) or one month.
//  - Koop's own orders, which give Bev cart and Clubhouse sales from the day the venue went live.
//
// "Sales" always means item sales: no tax, tips or convenience fee, and net of refunds.

export type SeasonKind = 'day' | 'week' | 'month';

export interface SeasonRecord {
  kind: SeasonKind;
  start: string; // 'yyyy-MM-dd': the day, the first day of the week, or the first day of the month
  rounds?: number;
  bevCartSales?: number; // dollars
}

export const recordId = (kind: SeasonKind, start: string) => `${kind}_${start}`;

const DAY_MS = 86400000;
const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const monthKeyOf = (iso: string) => iso.slice(0, 7);
const daysInMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isoOf(toUtc(value)) === value;
}

export interface MonthRollUp {
  value: number;
  used: SeasonKind; // the most detailed kind present in the month; the others are ignored
  ignored: SeasonKind[];
  approximate: boolean; // a week that runs across two months was shared out evenly by day
  suspect: boolean; // the entries used add up to under half of a coarser total that was ignored: probably incomplete
}

// Adds records up to months. Within a month the most detailed kind wins (days, then weeks, then the month's own
// total), so a venue that gives both a month total and its days is never counted twice.
export function rollUpMonths(records: SeasonRecord[], field: 'rounds' | 'bevCartSales'): Map<string, MonthRollUp> {
  const parts = new Map<string, { day: number; week: number; month: number; has: Set<SeasonKind>; split: boolean }>();
  const slot = (key: string) => {
    let p = parts.get(key);
    if (!p) { p = { day: 0, week: 0, month: 0, has: new Set(), split: false }; parts.set(key, p); }
    return p;
  };
  for (const r of records) {
    const v = r[field];
    if (typeof v !== 'number' || !Number.isFinite(v) || !isIsoDate(r.start)) continue;
    if (r.kind === 'day') {
      const p = slot(monthKeyOf(r.start)); p.day += v; p.has.add('day');
    } else if (r.kind === 'month') {
      const p = slot(monthKeyOf(r.start)); p.month += v; p.has.add('month');
    } else {
      const startMs = toUtc(r.start);
      const share = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const key = monthKeyOf(isoOf(startMs + i * DAY_MS));
        share.set(key, (share.get(key) || 0) + 1);
      }
      share.forEach((days, key) => {
        const p = slot(key); p.week += (v * days) / 7; p.has.add('week');
        if (share.size > 1) p.split = true;
      });
    }
  }
  const out = new Map<string, MonthRollUp>();
  parts.forEach((p, key) => {
    const used: SeasonKind = p.has.has('day') ? 'day' : p.has.has('week') ? 'week' : 'month';
    out.set(key, {
      value: p[used],
      used,
      ignored: (['day', 'week', 'month'] as SeasonKind[]).filter(k => k !== used && p.has.has(k)),
      approximate: used === 'week' && p.split,
      suspect: (['day', 'week', 'month'] as SeasonKind[]).some(k => k !== used && p.has.has(k) && p[k] > 0 && p[used] < p[k] * 0.5),
    });
  });
  return out;
}

// ---- Koop's own orders ----

export interface KoopOrder {
  date: string; // 'yyyy-MM-dd' the order was placed
  menuType: string;
  status: string;
  subtotal: number;
  total: number;
  refundedAmount?: number;
  isDemoSeed?: boolean;
}

export interface KoopMonth { bevCents: number; clubCents: number; bevOrders: number; clubOrders: number }

// Item sales (subtotal) of delivered orders, less the share that was refunded. A refund returns tax and tip in
// proportion to the item sales, so the refunded share of the whole order is the refunded share of the items.
export function koopMonthlySales(orders: KoopOrder[]): Map<string, KoopMonth> {
  const out = new Map<string, KoopMonth>();
  for (const o of orders) {
    if (o.status !== 'Delivered' || o.isDemoSeed || !isIsoDate(o.date)) continue;
    if (o.menuType !== 'Beverage Cart' && o.menuType !== 'Clubhouse') continue;
    const kept = o.total > 0 ? 1 - Math.min(1, (o.refundedAmount || 0) / o.total) : 1;
    const cents = Math.round((o.subtotal || 0) * 100 * kept);
    const key = monthKeyOf(o.date);
    const m = out.get(key) || { bevCents: 0, clubCents: 0, bevOrders: 0, clubOrders: 0 };
    if (o.menuType === 'Beverage Cart') { m.bevCents += cents; m.bevOrders += 1; } else { m.clubCents += cents; m.clubOrders += 1; }
    out.set(key, m);
  }
  return out;
}

// ---- The comparison the chart shows ----

export interface SeasonMonth {
  month: string; // '01'..'12'
  label: string;
  // Each is dollars per round, or null when the month has no sales or no rounds.
  priorBev: number | null;
  currentBev: number | null;
  priorCombined: number | null;
  currentCombined: number | null;
  priorRounds: number | null;
  currentRounds: number | null;
  priorBevSales: number | null;
  currentBevSales: number | null;
  currentClubSales: number | null;
  priorSource: 'koop' | 'venue' | null;
  currentSource: 'koop' | 'venue' | null;
  approximate: boolean;
  suspect: boolean; // detailed entries used for this month look incomplete next to a bigger total that was ignored
}

export interface SeasonSummary {
  priorBev: number | null;
  currentBev: number | null;
  bevChangePct: number | null;
  priorCombined: number | null;
  currentCombined: number | null;
  combinedChangePct: number | null;
  months: number; // months both seasons have, used for the totals
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const r2 = (n: number) => Math.round(n * 100) / 100;

interface SeasonSide {
  bevSales: number | null; clubSales: number; rounds: number | null; source: 'koop' | 'venue' | null; approximate: boolean; suspect: boolean;
}

// Koop's orders win for a month that has them; otherwise the sales the venue gave for that month.
function sideFor(year: number, mm: string, rounds: Map<string, MonthRollUp>, venueSales: Map<string, MonthRollUp>, koop: Map<string, KoopMonth>): SeasonSide {
  const key = `${year}-${mm}`;
  const k = koop.get(key);
  const r = rounds.get(key);
  const v = venueSales.get(key);
  const koopHasBev = !!k && k.bevOrders > 0;
  const bevSales = koopHasBev ? k!.bevCents / 100 : v ? v.value : null;
  return {
    bevSales,
    clubSales: k ? k.clubCents / 100 : 0,
    rounds: r && r.value > 0 ? r.value : null,
    source: koopHasBev ? 'koop' : v ? 'venue' : null,
    approximate: !!(r?.approximate || (!koopHasBev && v?.approximate)),
    suspect: !!(r?.suspect || (!koopHasBev && v?.suspect)),
  };
}

export function seasonYears(records: SeasonRecord[], koop: Map<string, KoopMonth>): number[] {
  const years = new Set<number>();
  records.forEach(r => { if (isIsoDate(r.start)) years.add(Number(r.start.slice(0, 4))); });
  koop.forEach((_, key) => years.add(Number(key.slice(0, 4))));
  return Array.from(years).sort((a, b) => a - b);
}

export function buildSeasonComparison(records: SeasonRecord[], koop: Map<string, KoopMonth>, year: number): { months: SeasonMonth[]; summary: SeasonSummary } {
  const rounds = rollUpMonths(records, 'rounds');
  const venueSales = rollUpMonths(records, 'bevCartSales');
  const months: SeasonMonth[] = MONTH_LABELS.map((label, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const prior = sideFor(year - 1, mm, rounds, venueSales, koop);
    const cur = sideFor(year, mm, rounds, venueSales, koop);
    const per = (sales: number | null, rd: number | null) => (sales != null && rd != null && rd > 0 ? r2(sales / rd) : null);
    const combined = (s: SeasonSide) => (s.bevSales != null || s.clubSales > 0 ? per((s.bevSales || 0) + s.clubSales, s.rounds) : null);
    return {
      month: mm, label,
      priorBev: per(prior.bevSales, prior.rounds),
      currentBev: per(cur.bevSales, cur.rounds),
      priorCombined: combined(prior),
      currentCombined: combined(cur),
      priorRounds: prior.rounds, currentRounds: cur.rounds,
      priorBevSales: prior.bevSales, currentBevSales: cur.bevSales,
      currentClubSales: cur.clubSales > 0 ? cur.clubSales : null,
      priorSource: prior.source, currentSource: cur.source,
      approximate: prior.approximate || cur.approximate,
      suspect: prior.suspect || cur.suspect,
    };
  });

  // Totals over the months both seasons have, so the two numbers compare like with like. A month whose entries look
  // incomplete is left out, so one bad month cannot swing the headline numbers.
  const total = (pick: (m: SeasonMonth) => { a: number | null; b: number | null; ra: number | null; rb: number | null }) => {
    let sa = 0, ra = 0, sb = 0, rb = 0, n = 0;
    months.forEach(m => {
      const x = pick(m);
      if (!m.suspect && x.a != null && x.b != null && x.ra && x.rb) { sa += x.a; ra += x.ra; sb += x.b; rb += x.rb; n += 1; }
    });
    return { n, prior: ra > 0 ? r2(sa / ra) : null, current: rb > 0 ? r2(sb / rb) : null };
  };
  const bev = total(m => ({ a: m.priorBevSales, b: m.currentBevSales, ra: m.priorRounds, rb: m.currentRounds }));
  const comb = total(m => ({
    a: m.priorBev != null && m.priorRounds ? m.priorBev * m.priorRounds : null,
    b: m.currentCombined != null && m.currentRounds ? m.currentCombined * m.currentRounds : null,
    ra: m.priorRounds, rb: m.currentRounds,
  }));
  const pct = (a: number | null, b: number | null) => (a != null && b != null && a > 0 ? Math.round(((b - a) / a) * 1000) / 10 : null);
  return {
    months,
    summary: {
      priorBev: bev.prior, currentBev: bev.current, bevChangePct: pct(bev.prior, bev.current),
      priorCombined: comb.prior, currentCombined: comb.current, combinedChangePct: pct(comb.prior, comb.current),
      months: bev.n,
    },
  };
}

// The most recent finished month that has Koop orders but no rounds entered yet, as 'yyyy-MM', or null.
// Dollars per round cannot be worked out for that month until the venue adds its rounds.
export function missingRoundsMonth(records: SeasonRecord[], koop: Map<string, KoopMonth>, now: Date = new Date()): string | null {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const k = koop.get(key);
  if (!k || k.bevOrders + k.clubOrders === 0) return null;
  const r = rollUpMonths(records, 'rounds').get(key);
  return r && r.value > 0 ? null : key;
}

// ---- Pasting or uploading a spreadsheet ----

export interface ParsedSeasonRows { records: SeasonRecord[]; errors: string[] }

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === '\t') { cells.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

// Accepts yyyy-MM-dd, M/D/YYYY, M/D/YY, and (for months) yyyy-MM or M/YYYY. Returns yyyy-MM-dd, or null.
export function parseSeasonDate(value: string, kind: SeasonKind): string | null {
  const v = value.trim();
  let y = 0, m = 0, d = 1;
  let match: RegExpMatchArray | null;
  if ((match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) { m = +match[1]; d = +match[2]; y = match[3].length === 2 ? 2000 + +match[3] : +match[3]; }
  else if (kind === 'month' && (match = v.match(/^(\d{4})-(\d{1,2})$/))) { y = +match[1]; m = +match[2]; }
  else if (kind === 'month' && (match = v.match(/^(\d{1,2})\/(\d{4})$/))) { m = +match[1]; y = +match[2]; }
  else return null;
  if (kind === 'month') d = 1;
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

const parseMoney = (v: string): number | null | undefined => {
  const t = v.replace(/[$,\s]/g, '');
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const kindFromWord = (w: string): SeasonKind | null => {
  const t = w.toLowerCase();
  if (t.startsWith('week')) return 'week';
  if (t.startsWith('month')) return 'month';
  if (t.startsWith('day') || t === 'date') return 'day';
  return null;
};

// Columns: date (or "week starting" / "month"), Bev cart sales, rounds. A header row is optional: without one the
// columns are in that order and every row is a day. A header can name the kind ("Week starting", "Month") or a
// "Type" column can say day, week or month on each row.
export function parseSeasonCsv(text: string): ParsedSeasonRows {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const records = new Map<string, SeasonRecord>();
  const errors: string[] = [];
  if (lines.length === 0) return { records: [], errors: ['Nothing to import.'] };

  let cols = { date: 0, sales: 1, rounds: 2, type: -1 };
  let defaultKind: SeasonKind = 'day';
  let first = 0;
  const head = splitCsvLine(lines[0]).map(c => c.toLowerCase());
  if (head.some(c => /[a-z]/.test(c)) && !head.some(c => parseSeasonDate(c, 'day'))) {
    first = 1;
    const find = (re: RegExp) => head.findIndex(c => re.test(c));
    const dateCol = find(/^(date|day|week|month|start|period)/);
    cols = { date: dateCol >= 0 ? dateCol : 0, sales: find(/sales|bev|cart|revenue/), rounds: find(/round/), type: find(/^(type|kind|period type)$/) };
    defaultKind = kindFromWord(head[cols.date] || '') || 'day';
    if (cols.sales < 0 && cols.rounds < 0) { cols.sales = 1; cols.rounds = 2; }
  }

  for (let i = first; i < lines.length; i++) {
    const row = splitCsvLine(lines[i]);
    const label = `Line ${i + 1}`;
    let kind: SeasonKind = defaultKind;
    if (cols.type >= 0 && row[cols.type]) {
      const k = kindFromWord(row[cols.type]);
      if (!k) { errors.push(`${label}: type must be day, week or month.`); continue; }
      kind = k;
    }
    const start = parseSeasonDate(row[cols.date] || '', kind);
    if (!start) { errors.push(`${label}: "${row[cols.date] || ''}" is not a date I can read (use yyyy-mm-dd or m/d/yyyy).`); continue; }
    const sales = cols.sales >= 0 ? parseMoney(row[cols.sales] || '') : undefined;
    const rounds = cols.rounds >= 0 ? parseMoney(row[cols.rounds] || '') : undefined;
    if (sales === null || rounds === null) { errors.push(`${label}: sales and rounds must be plain numbers.`); continue; }
    if (sales === undefined && rounds === undefined) { errors.push(`${label}: needs Bev cart sales, rounds, or both.`); continue; }
    const rec: SeasonRecord = { kind, start };
    if (sales !== undefined) rec.bevCartSales = Math.round(sales * 100) / 100;
    if (rounds !== undefined) rec.rounds = Math.round(rounds * 100) / 100;
    records.set(recordId(kind, start), rec);
  }
  return { records: Array.from(records.values()), errors };
}
