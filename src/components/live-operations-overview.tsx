'use client';

import type { ComponentType } from 'react';
import { AlertTriangle, Clock, DollarSign, ShoppingBag, Timer, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ModeStatusSwitches } from '@/components/mode-status-switches';
import { cn } from '@/lib/utils';

export interface ModeOpsStats {
  orderCount: number;
  totalNetRevenue: number;
  avgAck: number;
  avgDuration: number;
  ackWithinPct: number | null;
  ackMaxSeconds: number;
  durWithinPct: number | null;
  durMaxMinutes: number;
  exceedMaxAckCount: number;
  exceedWarnCount: number;
  exceedMaxCount: number;
  // Counts behind the percentages, so the overall figure is weighted by orders.
  ackTotal: number;
  ackWithinCount: number;
  durTotal: number;
  durWithinCount: number;
  activeStaff: string[];
}

export interface ModeOverviewRow {
  mode: string;
  Icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  isPausedByStaff: boolean;
  isAutoThrottled: boolean;
  stats: ModeOpsStats | undefined;
  onActiveChange: (active: boolean) => void;
  onPausedChange: (paused: boolean) => void;
}

const pctText = (pct: number | null) => (pct == null ? '-' : `${pct}%`);
const toneFor = (pct: number | null, goal: number) =>
  pct == null ? 'muted' : pct >= goal ? 'good' : 'bad';
const TEXT_TONE = { muted: 'text-muted-foreground', good: 'text-green-600', bad: 'text-red-600' } as const;
const BAR_TONE = { muted: 'bg-slate-300', good: 'bg-green-500', bad: 'bg-red-500' } as const;

// A percentage with a thin bar and a tick marking the goal, so a mode below goal
// stands out without reading the numbers.
function PercentMeter({ pct, goal, caption }: { pct: number | null; goal: number; caption: string }) {
  const tone = toneFor(pct, goal);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-sm font-black leading-none', TEXT_TONE[tone])}>{pctText(pct)}</span>
        <span className="text-[8px] font-bold uppercase text-muted-foreground truncate">{caption}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-slate-100" role="img" aria-label={`${pctText(pct)} within limit, goal ${goal}%`}>
        <div className={cn('h-full rounded-full', BAR_TONE[tone])} style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }} />
        <div className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#213147]/70" style={{ left: `${goal}%` }} />
      </div>
    </div>
  );
}

function Overs({ stats }: { stats: ModeOpsStats }) {
  // Exceed / Warn / Late counts, shown only when there is something to flag.
  const chips: { text: string; className: string }[] = [];
  if (stats.exceedMaxAckCount > 0) chips.push({ text: `${stats.exceedMaxAckCount} slow ack`, className: 'bg-red-50 text-red-700' });
  if (stats.exceedWarnCount > 0) chips.push({ text: `${stats.exceedWarnCount} warn`, className: 'bg-amber-50 text-amber-700' });
  if (stats.exceedMaxCount > 0) chips.push({ text: `${stats.exceedMaxCount} late`, className: 'bg-red-50 text-red-700' });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span key={c.text} className={cn('rounded px-1 py-px text-[7px] font-black uppercase leading-tight', c.className)}>{c.text}</span>
      ))}
    </div>
  );
}

function ModeName({ row }: { row: ModeOverviewRow }) {
  const paused = row.isPausedByStaff || row.isAutoThrottled;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', row.isActive ? (paused ? 'bg-amber-500' : 'bg-green-500 animate-pulse') : 'bg-slate-300')} />
      <row.Icon className="h-3.5 w-3.5 shrink-0 text-[#213147]/40" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-widest text-[#213147]">{row.mode}</p>
        {row.isActive && paused && (
          <p className="flex items-center gap-1 text-[7px] font-black uppercase leading-tight text-amber-700">
            <AlertTriangle className="h-2.5 w-2.5" />
            {row.isPausedByStaff ? 'Paused' : 'Auto-paused: queue full'}
          </p>
        )}
      </div>
    </div>
  );
}

function StaffLine({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="text-[9px] font-bold uppercase italic text-muted-foreground">No staff on shift</span>;
  return (
    <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#213147]" title={names.join(', ')}>
      <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{names.join(', ')}</span>
    </span>
  );
}

// Venue dashboard "Live Operations": a one-line health summary for the whole operation,
// then one compact row per service mode (a table on wide screens, short cards on a phone).
export function LiveOperationsOverview({ rows, goal }: { rows: ModeOverviewRow[]; goal: number }) {
  const totals = rows.reduce(
    (t, r) => {
      const s = r.stats;
      if (!s) return t;
      return {
        orders: t.orders + s.orderCount,
        net: t.net + s.totalNetRevenue,
        ackTotal: t.ackTotal + s.ackTotal,
        ackWithin: t.ackWithin + s.ackWithinCount,
        durTotal: t.durTotal + s.durTotal,
        durWithin: t.durWithin + s.durWithinCount,
        staff: t.staff + s.activeStaff.length,
      };
    },
    { orders: 0, net: 0, ackTotal: 0, ackWithin: 0, durTotal: 0, durWithin: 0, staff: 0 }
  );
  const overallAck = totals.ackTotal > 0 ? Math.round((totals.ackWithin / totals.ackTotal) * 1000) / 10 : null;
  const overallDur = totals.durTotal > 0 ? Math.round((totals.durWithin / totals.durTotal) * 1000) / 10 : null;

  const activeRows = rows.filter((r) => r.isActive);
  const pausedCount = activeRows.filter((r) => r.isPausedByStaff || r.isAutoThrottled).length;
  const status =
    activeRows.length === 0 ? { text: 'No modes active', className: 'bg-slate-100 text-slate-500' }
    : pausedCount > 0 ? { text: `${pausedCount} of ${activeRows.length} paused`, className: 'bg-amber-100 text-amber-700' }
    : { text: 'All modes taking orders', className: 'bg-green-100 text-green-700' };

  return (
    <div className="space-y-3">
      {/* HEALTH STRIP */}
      <Card className="border-2 shadow-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-center">
          <div>
            <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><ShoppingBag className="h-2.5 w-2.5" /> Orders today</p>
            <p className="text-xl font-black leading-tight text-[#213147]">{totals.orders}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><DollarSign className="h-2.5 w-2.5" /> Net today</p>
            <p className="font-mono text-xl font-black leading-tight text-[#213147]">${totals.net.toFixed(2)}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Timer className="h-2.5 w-2.5" /> Acknowledged on time</p>
            <p className="leading-tight"><span className={cn('text-xl font-black', TEXT_TONE[toneFor(overallAck, goal)])}>{pctText(overallAck)}</span> <span className="text-[8px] font-bold uppercase text-muted-foreground">goal {goal}%</span></p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Clock className="h-2.5 w-2.5" /> Delivered on time</p>
            <p className="leading-tight"><span className={cn('text-xl font-black', TEXT_TONE[toneFor(overallDur, goal)])}>{pctText(overallDur)}</span> <span className="text-[8px] font-bold uppercase text-muted-foreground">goal {goal}%</span></p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Users className="h-2.5 w-2.5" /> On shift</p>
            <p className="text-xl font-black leading-tight text-[#213147]">{totals.staff}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className={cn('inline-block rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wide', status.className)}>{status.text}</span>
          </div>
        </div>
      </Card>

      {/* WIDE SCREENS: one row per mode */}
      <Card className="hidden border-2 shadow-sm overflow-hidden lg:block">
        <div className="grid grid-cols-[minmax(170px,1.3fr)_56px_84px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_auto] items-center gap-x-4 border-b bg-slate-50 px-4 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Service mode</span><span className="text-right">Orders</span><span className="text-right">Net</span>
          <span>Acknowledge (avg / within max)</span><span>Duration (avg / within max)</span><span>On shift</span><span className="text-right">Controls</span>
        </div>
        {rows.map((row) => {
          const s = row.stats;
          return (
            <div key={row.mode} className={cn('grid grid-cols-[minmax(170px,1.3fr)_56px_84px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(110px,1fr)_auto] items-center gap-x-4 border-b px-4 py-2.5 last:border-b-0', !row.isActive && 'bg-muted/20 opacity-60')}>
              <ModeName row={row} />
              <span className="text-right text-sm font-black text-[#213147]">{s?.orderCount ?? 0}</span>
              <span className="text-right font-mono text-sm font-black text-[#213147]">${(s?.totalNetRevenue ?? 0).toFixed(0)}</span>
              <div className="space-y-1">
                <PercentMeter pct={s?.ackWithinPct ?? null} goal={goal} caption={`${s?.avgAck ?? 0}s avg · ≤${s?.ackMaxSeconds ?? 0}s`} />
                {s && <Overs stats={{ ...s, exceedWarnCount: 0, exceedMaxCount: 0 }} />}
              </div>
              <div className="space-y-1">
                <PercentMeter pct={s?.durWithinPct ?? null} goal={goal} caption={`${s?.avgDuration ?? 0}m avg · ≤${s?.durMaxMinutes ?? 0}m`} />
                {s && <Overs stats={{ ...s, exceedMaxAckCount: 0 }} />}
              </div>
              <StaffLine names={s?.activeStaff ?? []} />
              <ModeStatusSwitches isActive={row.isActive} isPaused={row.isPausedByStaff || row.isAutoThrottled} onActiveChange={row.onActiveChange} onPausedChange={row.onPausedChange} />
            </div>
          );
        })}
      </Card>

      {/* PHONES AND TABLETS: a short card per mode */}
      <div className="space-y-3 lg:hidden">
        {rows.map((row) => {
          const s = row.stats;
          return (
            <Card key={row.mode} className={cn('border-2 shadow-sm overflow-hidden', row.isActive ? 'border-slate-100' : 'border-dashed opacity-60')}>
              <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
                <ModeName row={row} />
                <ModeStatusSwitches isActive={row.isActive} isPaused={row.isPausedByStaff || row.isAutoThrottled} onActiveChange={row.onActiveChange} onPausedChange={row.onPausedChange} />
              </div>
              {row.isActive && (<>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4">
                <div className="flex items-baseline gap-3 sm:block">
                  <div>
                    <p className="text-[8px] font-black uppercase text-muted-foreground">Orders</p>
                    <p className="text-base font-black leading-tight text-[#213147]">{s?.orderCount ?? 0}</p>
                  </div>
                </div>
                <div className="text-right sm:text-left">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Net today</p>
                  <p className="font-mono text-base font-black leading-tight text-[#213147]">${(s?.totalNetRevenue ?? 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Timer className="h-2.5 w-2.5" /> Acknowledge</p>
                  <PercentMeter pct={s?.ackWithinPct ?? null} goal={goal} caption={`${s?.avgAck ?? 0}s avg · ≤${s?.ackMaxSeconds ?? 0}s`} />
                  {s && <Overs stats={{ ...s, exceedWarnCount: 0, exceedMaxCount: 0 }} />}
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[8px] font-black uppercase text-muted-foreground"><Clock className="h-2.5 w-2.5" /> Duration</p>
                  <PercentMeter pct={s?.durWithinPct ?? null} goal={goal} caption={`${s?.avgDuration ?? 0}m avg · ≤${s?.durMaxMinutes ?? 0}m`} />
                  {s && <Overs stats={{ ...s, exceedMaxAckCount: 0 }} />}
                </div>
              </div>
              <div className="border-t px-3 py-2"><StaffLine names={s?.activeStaff ?? []} /></div>
              </>)}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
