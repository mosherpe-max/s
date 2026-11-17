'use client';

import { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowRight, Check, ThumbsDown, ThumbsUp, Undo2 } from 'lucide-react';
import type { Order } from '@/lib/types';
import { cn, getNumericOrderId } from '@/lib/utils';
import { needsAttention, rangeStartMs, summarizeRatings } from '@/lib/ratings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefundOrder } from '@/components/refund-order-dialog';

const SHOWN = 3;
const usd = (n: number) => `$${n.toFixed(2)}`;

// Venue admin Dashboard: what needs a person today. Staff refund requests (refund or decline right here) and
// thumbs-down ratings waiting for a follow-up. A card shows only while it has something waiting; when neither does,
// one slim "All clear" line stands in, so a quiet day leaves the room to live operations.
export function DashboardAttention({ orders, onOpenRefunds, onOpenRatings }: { orders: Order[]; onOpenRefunds: () => void; onOpenRatings: () => void }) {
  const refunds = useMemo(
    () => orders.filter(o => o.refundRequest?.status === 'Requested')
      .sort((a, b) => (b.refundRequest?.requestedAt?.toMillis?.() ?? 0) - (a.refundRequest?.requestedAt?.toMillis?.() ?? 0)),
    [orders]
  );
  const lowRatings = useMemo(() => needsAttention(orders), [orders]);

  if (refunds.length === 0 && lowRatings.length === 0) {
    return (
      <Card className="border-2 bg-white px-5 py-4 text-left flex items-center gap-3" data-testid="dashboard-attention">
        <Badge className="border-0 bg-green-100 text-green-700 text-[9px] font-black uppercase gap-1 shrink-0"><Check className="h-3 w-3" /> All clear</Badge>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No refund requests or ratings to follow up</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-left" data-testid="dashboard-attention">
      {refunds.length > 0 && <AttentionCard
        title="Refund requests"
        icon={<Undo2 className="h-4 w-4" />}
        count={refunds.length}
        emptyText="No refund requests waiting"
        actionLabel="Open in Fulfillment Log"
        onAction={onOpenRefunds}
      >
        {refunds.slice(0, SHOWN).map(o => (
          <li key={o.id} className="px-5 py-3 border-b last:border-0 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-2">
            <div className="min-w-0 sm:flex-1">
              <p className="text-sm font-black uppercase text-[#213147] truncate">
                <span className="font-mono text-xs text-primary mr-2">#{getNumericOrderId(o.id)}</span>{o.customerName} · {usd(o.total || 0)}
              </p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">
                {o.refundRequest!.requestedAt ? `Requested ${formatDistanceToNowStrict(o.refundRequest!.requestedAt.toDate())} ago` : 'Requested'}{o.refundRequest!.note ? ` · “${o.refundRequest!.note}”` : ''}
              </p>
            </div>
            <RefundOrder order={o} />
          </li>
        ))}
      </AttentionCard>}

      {lowRatings.length > 0 && <AttentionCard
        title="Ratings to follow up"
        icon={<ThumbsDown className="h-4 w-4" />}
        count={lowRatings.length}
        emptyText="No thumbs-down ratings waiting"
        actionLabel="Open Ratings"
        onAction={onOpenRatings}
      >
        {lowRatings.slice(0, SHOWN).map(o => (
          <li key={o.id} className="px-5 py-3 border-b last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-black text-primary shrink-0">#{getNumericOrderId(o.id)}</span>
              <span className="text-sm font-black uppercase text-[#213147] truncate">{o.customerName}</span>
              <Badge className="border-0 bg-red-100 text-red-700 text-[8px] font-black uppercase shrink-0">{o.rating!.reason || 'Not good'}</Badge>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground truncate">
              {o.rating!.comment ? `“${o.rating!.comment}”` : `${o.menuType}${o.assignedStaffName ? ` · ${o.assignedStaffName}` : ''}`}
            </p>
          </li>
        ))}
      </AttentionCard>}
    </div>
  );
}

function AttentionCard({ title, icon, count, emptyText, actionLabel, onAction, children }: {
  title: string; icon: React.ReactNode; count: number; emptyText: string; actionLabel: string; onAction: () => void; children: React.ReactNode;
}) {
  return (
    <Card className={cn('border-2 bg-white overflow-hidden', count > 0 && 'border-amber-300')}>
      <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">{icon} {title}</h3>
        {count > 0
          ? <Badge className="border-0 bg-amber-500 text-white text-[9px] font-black uppercase">{count} waiting</Badge>
          : <Badge className="border-0 bg-green-100 text-green-700 text-[9px] font-black uppercase gap-1"><Check className="h-3 w-3" /> All clear</Badge>}
      </div>
      {count === 0 ? (
        <p className="px-5 py-6 text-center text-[10px] font-black uppercase text-muted-foreground opacity-60">{emptyText}</p>
      ) : (
        <>
          <ul>{children}</ul>
          <div className="px-5 py-2.5 border-t bg-slate-50/60 flex items-center justify-between">
            {count > SHOWN ? <span className="text-[10px] font-bold text-muted-foreground">and {count - SHOWN} more</span> : <span />}
            <Button type="button" variant="ghost" size="sm" onClick={onAction} className="h-7 text-[9px] font-black uppercase tracking-widest gap-1 text-primary">{actionLabel} <ArrowRight className="h-3 w-3" /></Button>
          </div>
        </>
      )}
    </Card>
  );
}

// A small summary of how the last 7 days were rated, for the Dashboard.
export function SatisfactionCard({ orders, onOpen }: { orders: Order[]; onOpen: () => void }) {
  const s = useMemo(() => summarizeRatings(orders, rangeStartMs('7d', Date.now())), [orders]);
  return (
    <Card className="border-2 bg-white p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><ThumbsUp className="h-5 w-5 text-primary" /></div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#213147]">Patron satisfaction</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Last 7 days</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div><p className="text-2xl font-black text-[#213147] leading-none">{s.percentPositive == null ? '-' : `${s.percentPositive}%`}</p><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Positive</p></div>
          <div><p className="text-2xl font-black text-[#213147] leading-none">{s.rated}</p><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Ratings</p></div>
          <div><p className="text-2xl font-black text-[#213147] leading-none">{s.responseRate == null ? '-' : `${s.responseRate}%`}</p><p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">Response</p></div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onOpen} className="h-9 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">See Ratings <ArrowRight className="h-3 w-3" /></Button>
      </div>
      {s.rated === 0 && <p className="mt-3 text-[10px] font-bold text-muted-foreground">No ratings yet. Patrons are asked after each delivery.</p>}
    </Card>
  );
}
