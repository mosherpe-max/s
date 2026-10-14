'use client';

import { useMemo, useState } from 'react';
import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { ArrowDown, ArrowUp, BarChart3, Download, Loader2, Minus } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, Seller, SolutionConfig } from '@/lib/types';
import { REPORT_PRESETS, reportRange, type ReportPreset } from '@/lib/report-ranges';
import { isDemoVenue } from '@/lib/koop-sales-report';
import { resolveThresholds } from '@/lib/ops-stats';
import {
  buildSalesAnalytics, buildTimingAnalytics, buildTimingCsv, buildVenueSalesCsv, daysInRange, formatDuration, priorRange,
  type AnalyticsVenue, type TimingRecord, type VenueSalesRow,
} from '@/lib/koop-analytics';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateKey = (ms: number) => format(new Date(ms), 'yyyy-MM-dd');
const todayKey = () => format(new Date(), 'yyyy-MM-dd');

// One series per chart in the brand ink color, so no legend is needed: the card title names the series.
const BAR_COLOR = '#213147';
const GRID_COLOR = '#e5e7eb';
const AXIS_TICK = { fontSize: 10, fontWeight: 700, fill: '#64748b' };

const SMALL_SAMPLE = 30;

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!(before > 0)) return <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">No prior data</p>;
  const pct = Math.round(((now - before) / before) * 1000) / 10;
  const Icon = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : Minus;
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1">
      <Icon className="h-3 w-3" aria-hidden /> {pct > 0 ? '+' : ''}{pct}% {label}
    </p>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-[#213147] mt-1 font-mono">{value}</p>
      {children}
    </Card>
  );
}

function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <div className="pt-4">
      <h3 className="text-lg font-black uppercase text-[#213147]">{title}</h3>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{note}</p>
    </div>
  );
}

interface ChartPoint { label: string; value: number; detail?: string }

function BarCard({ title, subtitle, data, format: fmt, tickFormat, rangeNote }: {
  title: string; subtitle: string; data: ChartPoint[]; format: (v: number) => string; tickFormat?: (v: number) => string; rangeNote?: string;
}) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">{title}</p>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{subtitle}</p>
      <div className="h-56" role="img" aria-label={`${title}. ${subtitle}. The same numbers are in the data table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={44} allowDecimals={false} tickFormatter={tickFormat} />
            <Tooltip
              cursor={{ fill: 'rgba(33,49,71,0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as ChartPoint;
                return (
                  <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-left">
                    <p className="text-sm font-black text-[#213147] font-mono">{fmt(p.value)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{p.detail || p.label}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill={BAR_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">Data table{rangeNote ? ` · ${rangeNote}` : ''}</summary>
        <div className="max-h-48 overflow-y-auto mt-2">
          <table className="w-full text-xs">
            <tbody>
              {data.map((p, i) => (
                <tr key={`${p.label}-${i}`} className="border-t">
                  <td className="py-1 font-mono">{p.detail || p.label}</td>
                  <td className="py-1 text-right font-mono font-black">{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

type SalesSortKey = 'grossSales' | 'orders' | 'change' | 'lastOrder' | 'name';

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Koop admin: how the venues are selling and how fast orders move. Uses the same delivered-order rules as the
// Sales Report. Demo venues are included by default for now so the page can be tested.
export default function KoopAnalyticsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [from, setFrom] = useState(() => format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [to, setTo] = useState(todayKey);
  const [includeDemo, setIncludeDemo] = useState(true);
  const [sortKey, setSortKey] = useState<SalesSortKey>('grossSales');

  const prior = useMemo(() => priorRange(from, to), [from, to]);
  const periodDays = daysInRange(from, to);

  // Load from the start of the prior period so "vs the period before" has data to compare with.
  const loadFrom = prior.from < from ? prior.from : from;
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), where('createdAt', '>=', Timestamp.fromDate(new Date(`${loadFrom}T00:00:00`))));
  }, [firestore, loadFrom]);
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery);

  const timingQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orderTimings'), where('placedAt', '>=', Timestamp.fromDate(new Date(`${from}T00:00:00`))));
  }, [firestore, from]);
  const { data: timings, isLoading: timingLoading, error: timingError } = useCollection<any>(timingQuery);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const { data: sellers } = useCollection<Seller>(sellersQuery);

  // Koop's own limits live in System Config, per service mode. A venue can override them in its settings.
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  const limitFor = useMemo(() => {
    const byId = new Map((sellers || []).map(s => [s.id, s]));
    return (sellerId: string, menuType: string) => {
      const t = resolveThresholds(byId.get(sellerId)?.orderThresholds?.[menuType], solutionConfig?.orderThresholds?.[menuType]);
      return { totalMinutes: t.maxOrderProcessingMinutes, ackSeconds: t.maxOrderAcknowledgeSeconds };
    };
  }, [sellers, solutionConfig]);

  const venues = useMemo(() => {
    const map: Record<string, AnalyticsVenue> = {};
    (sellers || []).forEach(s => { map[s.id] = { name: s.courseName || s.id, isDemo: isDemoVenue(s.id) }; });
    return map;
  }, [sellers]);

  const sales = useMemo(() => buildSalesAnalytics(
    (orders || []).map(o => ({
      sellerId: o.sellerId, status: o.status, total: o.total, serviceFee: o.serviceFee, notes: o.notes,
      createdAtMs: o.createdAt ? o.createdAt.toMillis() : 0,
    })),
    venues, dateKey, from, to, includeDemo, todayKey(),
  ), [orders, venues, from, to, includeDemo]);

  const timing = useMemo(() => buildTimingAnalytics(
    (timings || []).map((t: any): TimingRecord => ({
      sellerId: t.sellerId, menuType: t.menuType, outcome: t.outcome, isDemo: t.isDemo, suspect: t.suspect, cancelReason: t.cancelReason,
      totalSec: t.totalSec, ackSec: t.ackSec, prepSec: t.prepSec, deliverySec: t.deliverySec, localDate: t.localDate,
      placedAtMs: t.placedAt?.toMillis ? t.placedAt.toMillis() : undefined,
    })),
    venues, dateKey, from, to, includeDemo, limitFor,
  ), [timings, venues, from, to, includeDemo, limitFor]);

  const sortedVenues = useMemo(() => {
    const rows = [...sales.venues];
    const cmp: Record<SalesSortKey, (a: VenueSalesRow, b: VenueSalesRow) => number> = {
      grossSales: (a, b) => b.grossSales - a.grossSales,
      orders: (a, b) => b.orders - a.orders,
      change: (a, b) => (b.grossChangePct ?? -Infinity) - (a.grossChangePct ?? -Infinity),
      lastOrder: (a, b) => (b.daysSinceLastOrder ?? Infinity) - (a.daysSinceLastOrder ?? Infinity), // longest quiet first
      name: (a, b) => a.venueName.localeCompare(b.venueName),
    };
    return rows.sort((a, b) => cmp[sortKey](a, b) || a.venueName.localeCompare(b.venueName));
  }, [sales.venues, sortKey]);

  const setPreset = (preset: ReportPreset) => {
    const range = reportRange(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const dayLabel = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const ordersChart: ChartPoint[] = sales.daily.map(d => ({ label: dayLabel(d.date), detail: `${d.date} · orders`, value: d.orders }));
  const salesChart: ChartPoint[] = sales.daily.map(d => ({ label: dayLabel(d.date), detail: `${d.date} · gross sales`, value: d.grossSales }));
  const histogramChart: ChartPoint[] = timing.histogram.map(h => ({ label: h.label.replace(' min', ''), detail: `${h.label} · orders`, value: h.count }));

  const vsLabel = `vs prior ${periodDays} day${periodDays === 1 ? '' : 's'}`;
  const loading = ordersLoading;
  const noTiming = !timingLoading && timing.counts.finished === 0 && timing.counts.cancelled + timing.counts.resetCancelled === 0;

  const sortButton = (key: SalesSortKey, label: string, align: 'left' | 'right' = 'right') => (
    <TableHead className={`text-[10px] font-black uppercase tracking-widest ${align === 'right' ? 'text-right' : ''}`}>
      <button type="button" onClick={() => setSortKey(key)} className={sortKey === key ? 'underline underline-offset-4' : ''} aria-pressed={sortKey === key}>
        {label}{sortKey === key ? ' ↓' : ''}
      </button>
    </TableHead>
  );

  return (
    <div className="p-8 animate-in fade-in duration-500 text-left">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><BarChart3 className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-2xl font-black uppercase text-[#213147]">Analytics</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Sales performance and order timing · all venues · delivered orders only
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-sm bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="an-from" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">From</Label>
              <Input id="an-from" type="date" value={from} max={to || undefined} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-10 w-40 border-2 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="an-to" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">To</Label>
              <Input id="an-to" type="date" value={to} min={from || undefined} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-10 w-40 border-2 font-bold" />
            </div>
            <div className="flex items-center gap-3 h-10">
              <Switch id="an-demo" checked={includeDemo} onCheckedChange={setIncludeDemo} />
              <Label htmlFor="an-demo" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Include demo venues</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {REPORT_PRESETS.map(({ id, label }) => (
              <Button key={id} type="button" variant="outline" size="sm" onClick={() => setPreset(id)} className="h-7 rounded-full border-2 text-[9px] font-black uppercase tracking-widest">{label}</Button>
            ))}
          </div>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
            Comparing {from} to {to} with {prior.from} to {prior.to}
          </p>
        </Card>

        {(ordersError || timingError) && (
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
            Could not load {ordersError ? 'orders' : 'timing records'}: {(ordersError || timingError)!.message}
          </p>
        )}

        {/* ---------------- SALES ---------------- */}
        <SectionTitle title="Sales performance" note="Dated by when the order was placed · gross sales are what patrons paid, Koop fees are the convenience fees" />

        {loading ? (
          <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Tile label="Gross sales" value={money(sales.totals.grossSales)}><Delta now={sales.totals.grossSales} before={sales.prior.grossSales} label={vsLabel} /></Tile>
              <Tile label="Koop fees" value={money(sales.totals.koopFees)}><Delta now={sales.totals.koopFees} before={sales.prior.koopFees} label={vsLabel} /></Tile>
              <Tile label="Orders" value={String(sales.totals.orders)}><Delta now={sales.totals.orders} before={sales.prior.orders} label={vsLabel} /></Tile>
              <Tile label="Average order" value={sales.totals.avgOrder === null ? '—' : money(sales.totals.avgOrder)}>
                {sales.totals.avgOrder !== null && sales.prior.avgOrder !== null && <Delta now={sales.totals.avgOrder} before={sales.prior.avgOrder} label={vsLabel} />}
              </Tile>
              <Tile label="Venues with orders" value={String(sales.totals.activeVenues)}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  {sales.totals.cancelRatePct === null ? 'No cancellations data' : `${sales.totals.cancelRatePct}% of orders cancelled`}
                </p>
              </Tile>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BarCard title="Orders per day" subtitle="Delivered orders" data={ordersChart} format={(v) => `${v} order${v === 1 ? '' : 's'}`} />
              <BarCard
                title="Gross sales per day" subtitle="What patrons paid" data={salesChart} format={money}
                tickFormat={(v) => (v >= 1000 ? `$${Math.round(v / 100) / 10}K` : `$${v}`)}
              />
            </div>

            <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
              <div className="flex items-center justify-between px-8 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">By venue</p>
                <Button
                  variant="outline" size="sm" disabled={sortedVenues.length === 0}
                  onClick={() => { downloadCsv(buildVenueSalesCsv(sortedVenues, from, to), `Koop_Venue_Performance_${from}_to_${to}${includeDemo ? '' : '_no_demo'}.csv`); toast({ title: 'Venue Table Downloaded', description: `${sortedVenues.length} venue${sortedVenues.length === 1 ? '' : 's'} included.` }); }}
                  className="h-8 font-black uppercase text-[9px] tracking-widest gap-2"
                ><Download className="h-3.5 w-3.5" /> Download CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      {sortButton('name', 'Venue', 'left')}
                      {sortButton('orders', 'Orders')}
                      {sortButton('grossSales', 'Gross Sales')}
                      {sortButton('change', 'Change')}
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Koop Fees</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Avg Order</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Per Active Day</TableHead>
                      {sortButton('lastOrder', 'Last Order')}
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Cancelled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedVenues.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="py-12 text-center text-[10px] font-black uppercase text-muted-foreground">No venues to show</TableCell></TableRow>
                    ) : sortedVenues.map(r => (
                      <TableRow key={r.sellerId} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-sm uppercase whitespace-nowrap">
                          {r.venueName}
                          {r.isDemo && <Badge variant="outline" className="ml-2 text-[8px] font-black uppercase bg-slate-100 border-slate-200">Demo</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.orders}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{money(r.grossSales)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-xs whitespace-nowrap">
                          {r.grossChangePct === null ? '—' : `${r.grossChangePct > 0 ? '▲ +' : r.grossChangePct < 0 ? '▼ ' : ''}${r.grossChangePct}%`}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{money(r.koopFees)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.avgOrder === null ? '—' : money(r.avgOrder)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.ordersPerActiveDay ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs font-bold whitespace-nowrap">
                          {r.lastOrderDate ? `${r.lastOrderDate} · ${r.daysSinceLastOrder === 0 ? 'today' : `${r.daysSinceLastOrder}d ago`}` : 'Never'}
                          {r.orders === 0 && <Badge variant="outline" className="ml-2 text-[8px] font-black uppercase border-amber-300 bg-amber-50 text-amber-800">No orders in range</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-xs">{r.cancelled === 0 ? '0' : `${r.cancelled} (${r.cancelRatePct}%)`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="px-8 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-t">
                Change is gross sales against the prior period · "Last order" looks back over the loaded range · Nightly-reset cancellations are not counted as cancelled
              </p>
            </Card>
          </>
        )}

        {/* ---------------- TIMING ---------------- */}
        <SectionTitle
          title="Order timing"
          note="Placed to delivered, from the order timing records · 'within limit' uses each venue's and service mode's own max times: the venue's override, else Koop's System Config value, else 25 min to deliver and 120s to acknowledge"
        />

        {timingLoading ? (
          <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline" /></div>
        ) : noTiming ? (
          <Card className="border-2 shadow-sm bg-white p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No timing records in this range yet. Records start with orders placed after the timing feature went live.</p>
          </Card>
        ) : (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {timing.counts.finished} delivered · {timing.counts.usable} usable for timing
              {timing.counts.suspect > 0 && ` · ${timing.counts.suspect} left out (steps tapped through too fast, or times missing)`}
              {timing.counts.cancelled > 0 && ` · ${timing.counts.cancelled} cancelled`}
              {timing.counts.resetCancelled > 0 && ` · ${timing.counts.resetCancelled} closed by the nightly reset (not counted)`}
            </p>
            {timing.total.n > 0 && timing.total.n < SMALL_SAMPLE && (
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Only {timing.total.n} orders so far. Treat these as a rough guide until there are about {SMALL_SAMPLE} or more.
              </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <Tile label="Typical total time" value={formatDuration(timing.total.median)}><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Median, placed to delivered</p></Tile>
              <Tile label="Slow end" value={formatDuration(timing.total.p90)}><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">9 in 10 orders arrive within this</p></Tile>
              <Tile label="Typical acknowledge" value={formatDuration(timing.ack.median)}><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Placed to staff started</p></Tile>
              <Tile label="Typical prep" value={formatDuration(timing.prep.median)}><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Started to out for delivery</p></Tile>
              <Tile label="Typical delivery leg" value={formatDuration(timing.delivery.median)}><p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Out for delivery to delivered</p></Tile>
              <Tile label="Within max time" value={timing.withinLimitPct === null ? '—' : `${timing.withinLimitPct}%`}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                  {timing.ackWithinLimitPct === null ? '' : `${timing.ackWithinLimitPct}% acknowledged within the max`}
                </p>
              </Tile>
            </div>

            <BarCard
              title="How long orders take" subtitle="Delivered orders by total time, placed to delivered (minutes)" data={histogramChart}
              format={(v) => `${v} order${v === 1 ? '' : 's'}`}
            />

            <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
              <div className="flex items-center justify-between px-8 pt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">By venue and service mode</p>
                <Button
                  variant="outline" size="sm" disabled={timing.rows.length === 0}
                  onClick={() => { downloadCsv(buildTimingCsv(timing.rows, from, to), `Koop_Order_Timing_${from}_to_${to}${includeDemo ? '' : '_no_demo'}.csv`); toast({ title: 'Timing Table Downloaded', description: `${timing.rows.length} row${timing.rows.length === 1 ? '' : 's'} included.` }); }}
                  className="h-8 font-black uppercase text-[9px] tracking-widest gap-2"
                ><Download className="h-3.5 w-3.5" /> Download CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Venue</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Mode</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Typical Total</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Slow End</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Acknowledge</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Prep</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Delivery Leg</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Max Time</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Within Max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timing.rows.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="py-12 text-center text-[10px] font-black uppercase text-muted-foreground">No usable delivered orders in this range</TableCell></TableRow>
                    ) : timing.rows.map(r => (
                      <TableRow key={r.key} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-sm uppercase whitespace-nowrap">
                          {r.venueName}
                          {r.isDemo && <Badge variant="outline" className="ml-2 text-[8px] font-black uppercase bg-slate-100 border-slate-200">Demo</Badge>}
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase whitespace-nowrap">{r.menuType}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.orders}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{formatDuration(r.medianTotalSec)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{formatDuration(r.p90TotalSec)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{formatDuration(r.medianAckSec)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{formatDuration(r.medianPrepSec)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{formatDuration(r.medianDeliverySec)}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.limitMinutes === null ? '—' : `${r.limitMinutes}m`}</TableCell>
                        <TableCell className="text-right font-mono font-black text-sm">{r.withinLimitPct === null ? '—' : `${r.withinLimitPct}%`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="px-8 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-t">
                Typical is the median. Rows with only a few orders are not reliable on their own
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
