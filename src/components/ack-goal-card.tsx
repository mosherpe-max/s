'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, doc, query, Timestamp, where } from 'firebase/firestore';
import { CheckCircle2, CircleDashed, Loader2, Timer, TriangleAlert } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Order, Seller, SolutionConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resolveThresholds } from '@/lib/ops-stats';
import { buildAckStatus, MIN_ACK_ORDERS, type AckStatus, type AckVenue } from '@/lib/ack-status';

const WINDOWS = [
  { id: 'today', label: 'Today', days: 0 },
  { id: '7d', label: 'Last 7 Days', days: 6 },
  { id: '30d', label: 'Last 30 Days', days: 29 },
] as const;
type WindowId = (typeof WINDOWS)[number]['id'];

const STATUS: Record<AckStatus, { label: string; className: string }> = {
  meeting: { label: 'Meeting goal', className: 'bg-green-600' },
  below: { label: 'Below goal', className: 'bg-red-600' },
  few: { label: 'Too few orders', className: 'bg-slate-500' },
  none: { label: 'No orders', className: 'bg-slate-400' },
};

function StatusIcon({ status, className }: { status: AckStatus; className?: string }) {
  if (status === 'meeting') return <CheckCircle2 className={className} aria-hidden />;
  if (status === 'below') return <TriangleAlert className={className} aria-hidden />;
  return <CircleDashed className={className} aria-hidden />;
}

// Koop admin overview: is each venue acknowledging orders within its max acknowledge time often enough? The goal
// is the share set in System Config (90% unless changed). Same basis as the venue dashboard: of the orders that
// were acknowledged, the share acknowledged within the venue's max for that service mode.
export function AckGoalCard() {
  const firestore = useFirestore();
  const [windowId, setWindowId] = useState<WindowId>('7d');
  const days = WINDOWS.find(w => w.id === windowId)!.days;

  const fromMs = useMemo(() => startOfDay(subDays(new Date(), days)).getTime(), [days]);
  const ordersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'orders'), where('createdAt', '>=', Timestamp.fromMillis(fromMs))) : null),
    [firestore, fromMs],
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const { data: sellers } = useCollection<Seller>(sellersQuery);
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config } = useDoc<SolutionConfig>(configRef);
  const goal = config?.ackTargetPercent ?? 90;

  const summary = useMemo(() => {
    const venues: Record<string, AckVenue> = {};
    const byId = new Map<string, Seller>();
    (sellers || []).forEach(s => { byId.set(s.id, s); venues[s.id] = { name: s.courseName || s.id, isDemo: s.id.startsWith('demo-') }; });
    const maxSecondsFor = (sellerId: string, menuType: string) =>
      resolveThresholds(byId.get(sellerId)?.orderThresholds?.[menuType], config?.orderThresholds?.[menuType]).maxOrderAcknowledgeSeconds;
    return buildAckStatus(
      (orders || []).map(o => ({
        sellerId: o.sellerId,
        menuType: o.menuType,
        createdAtMs: o.createdAt ? o.createdAt.toMillis() : 0,
        acknowledgedAtMs: o.acknowledgedAt ? o.acknowledgedAt.toMillis() : null,
      })),
      venues, maxSecondsFor, goal, fromMs,
    );
  }, [orders, sellers, config, goal, fromMs]);

  const { overall, counts, rows } = summary;
  const headline = counts.below > 0
    ? { text: `${counts.below} below goal`, className: 'bg-red-600' }
    : counts.meeting > 0
      ? { text: 'All judged venues meeting goal', className: 'bg-green-600' }
      : { text: 'Not enough data yet', className: 'bg-slate-500' };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147] flex items-center gap-2 flex-wrap">
          <Timer className="h-4 w-4" /> Acknowledgement Goal
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] text-white', headline.className)}>{headline.text}</span>
        </CardTitle>
        <div className="flex gap-1.5">
          {WINDOWS.map(w => (
            <Button
              key={w.id} type="button" variant={windowId === w.id ? 'default' : 'outline'} size="sm" onClick={() => setWindowId(w.id)}
              className="h-7 rounded-full border-2 text-[9px] font-black uppercase tracking-widest" aria-pressed={windowId === w.id}
            >{w.label}</Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 py-4 border-b text-left">
          <p className="text-[10px] font-bold uppercase text-muted-foreground leading-snug">
            Goal: {goal}% of acknowledged orders within the venue&apos;s max acknowledge time.
            {overall.pct !== null && <> All venues together: <span className="font-black text-[#213147]">{overall.pct}%</span> ({overall.within} of {overall.acknowledged} orders).</>}
            {' '}A venue needs at least {MIN_ACK_ORDERS} acknowledged orders to be judged.
          </p>
        </div>
        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin text-primary inline" /></div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-[11px] font-bold uppercase text-muted-foreground text-left">No venues yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map(row => (
              <li key={row.sellerId} className="flex items-start justify-between gap-4 px-6 py-3 text-left">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-black text-sm uppercase flex flex-wrap items-center gap-2">
                    {row.venueName}
                    {row.isDemo && <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">Demo</Badge>}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-snug">
                    {row.status === 'none'
                      ? 'No orders in this period'
                      : row.acknowledged === 0
                        ? 'Orders placed, none acknowledged yet'
                        : `${row.within} of ${row.acknowledged} within max · average ${row.avgSeconds}s${row.modes.length > 1 ? ` · ${row.modes.map(m => `${m.menuType} ${m.pct ?? '—'}% (max ${m.maxSeconds}s)`).join(' · ')}` : row.modes.length === 1 ? ` · max ${row.modes[0].maxSeconds}s` : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-black text-sm text-[#213147]">{row.pct === null ? '—' : `${row.pct}%`}</span>
                  <Badge className={cn('border-0 text-[8px] font-black uppercase gap-1', STATUS[row.status].className)}>
                    <StatusIcon status={row.status} className="h-2.5 w-2.5" />{STATUS[row.status].label}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="px-6 py-3 border-t text-left">
          <Link href="/admin/analytics" className="text-[9px] font-black uppercase text-primary hover:underline">More timing detail in Analytics</Link>
        </div>
      </CardContent>
    </Card>
  );
}
