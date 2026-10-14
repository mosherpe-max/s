// How quickly each venue acknowledges orders, against Koop's goal. Same basis as the venue dashboard's
// "Acknowledgement Responsiveness" card: of the orders that were acknowledged, the share acknowledged within
// the venue's max acknowledge time for that service mode.

export interface AckOrder {
  sellerId: string;
  menuType: string;
  createdAtMs: number;
  acknowledgedAtMs?: number | null;
}

export interface AckVenue {
  name: string;
  isDemo: boolean;
}

// meeting: at or above the goal. below: under it. few: not enough orders yet to judge. none: no orders at all.
export type AckStatus = 'meeting' | 'below' | 'few' | 'none';

export interface AckModeRow {
  menuType: string;
  acknowledged: number;
  within: number;
  pct: number | null;
  maxSeconds: number;
}

export interface VenueAckRow {
  sellerId: string;
  venueName: string;
  isDemo: boolean;
  acknowledged: number;
  within: number;
  pct: number | null;
  avgSeconds: number | null;
  status: AckStatus;
  modes: AckModeRow[];
}

export interface AckSummary {
  rows: VenueAckRow[];
  overall: { acknowledged: number; within: number; pct: number | null; status: AckStatus };
  counts: { meeting: number; below: number; few: number; none: number };
}

// Fewer acknowledged orders than this and a percentage says little (one slow order out of three is 67%).
export const MIN_ACK_ORDERS = 5;

const pctOf = (hits: number, of: number): number | null => (of === 0 ? null : Math.round((hits / of) * 1000) / 10);

export function ackStatusOf(acknowledged: number, pct: number | null, goal: number, orderCount: number): AckStatus {
  if (orderCount === 0) return 'none';
  if (acknowledged < MIN_ACK_ORDERS || pct === null) return 'few';
  return pct >= goal ? 'meeting' : 'below';
}

const RANK: Record<AckStatus, number> = { below: 0, few: 1, meeting: 2, none: 3 };

export function buildAckStatus(
  orders: AckOrder[],
  venues: Record<string, AckVenue>,
  maxSecondsFor: (sellerId: string, menuType: string) => number,
  goal: number,
  fromMs: number,
): AckSummary {
  interface Acc { orders: number; acknowledged: number; within: number; seconds: number; modes: Map<string, { acknowledged: number; within: number }> }
  const bySeller = new Map<string, Acc>();
  for (const o of orders) {
    if (!o.sellerId || !o.createdAtMs || o.createdAtMs < fromMs) continue;
    const acc = bySeller.get(o.sellerId) || { orders: 0, acknowledged: 0, within: 0, seconds: 0, modes: new Map() };
    acc.orders += 1;
    if (o.acknowledgedAtMs) {
      // Whole seconds, the way the venue dashboard counts them.
      const secs = Math.trunc((o.acknowledgedAtMs - o.createdAtMs) / 1000);
      const ok = secs <= maxSecondsFor(o.sellerId, o.menuType);
      acc.acknowledged += 1;
      acc.seconds += secs;
      if (ok) acc.within += 1;
      const m = acc.modes.get(o.menuType) || { acknowledged: 0, within: 0 };
      m.acknowledged += 1;
      if (ok) m.within += 1;
      acc.modes.set(o.menuType, m);
    }
    bySeller.set(o.sellerId, acc);
  }

  const ids = new Set<string>([...Object.keys(venues), ...bySeller.keys()]);
  const rows: VenueAckRow[] = Array.from(ids).map((id) => {
    const acc = bySeller.get(id);
    const acknowledged = acc?.acknowledged || 0;
    const within = acc?.within || 0;
    const pct = pctOf(within, acknowledged);
    return {
      sellerId: id,
      venueName: venues[id]?.name || id,
      isDemo: venues[id] ? venues[id].isDemo : id.startsWith('demo-'),
      acknowledged,
      within,
      pct,
      avgSeconds: acc && acknowledged > 0 ? Math.round(acc.seconds / acknowledged) : null,
      status: ackStatusOf(acknowledged, pct, goal, acc?.orders || 0),
      modes: Array.from(acc?.modes.entries() || [])
        .map(([menuType, m]) => ({ menuType, acknowledged: m.acknowledged, within: m.within, pct: pctOf(m.within, m.acknowledged), maxSeconds: maxSecondsFor(id, menuType) }))
        .sort((a, b) => b.acknowledged - a.acknowledged || a.menuType.localeCompare(b.menuType)),
    };
  }).sort((a, b) =>
    RANK[a.status] - RANK[b.status] ||
    (a.pct ?? 101) - (b.pct ?? 101) ||
    Number(a.isDemo) - Number(b.isDemo) ||
    a.venueName.localeCompare(b.venueName));

  const acknowledged = rows.reduce((s, r) => s + r.acknowledged, 0);
  const within = rows.reduce((s, r) => s + r.within, 0);
  const pct = pctOf(within, acknowledged);
  const orderCount = Array.from(bySeller.values()).reduce((s, a) => s + a.orders, 0);
  return {
    rows,
    overall: { acknowledged, within, pct, status: ackStatusOf(acknowledged, pct, goal, orderCount) },
    counts: {
      meeting: rows.filter((r) => r.status === 'meeting').length,
      below: rows.filter((r) => r.status === 'below').length,
      few: rows.filter((r) => r.status === 'few').length,
      none: rows.filter((r) => r.status === 'none').length,
    },
  };
}
