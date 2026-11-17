'use client';

import { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Check, Loader2, Phone, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { cn, getNumericOrderId } from '@/lib/utils';
import {
  RATING_RANGES, downReasons, needsAttention, ratingsByMode, ratingsByStaff, rangeStartMs, summarizeRatings,
  type RatingGroupRow, type RatingRange,
} from '@/lib/ratings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const MIN_FOR_PERCENT = 10;

// Venue admin > Ratings: how patrons rated their deliveries, by staff member, mode and reason, and the thumbs-down
// ratings that still need a follow-up. Staff only ever see their own thumbs-up count, never this screen.
export function RatingsPanel({ orders }: { orders: Order[] }) {
  const [range, setRange] = useState<RatingRange>('30d');
  const [showHandled, setShowHandled] = useState(false);
  const now = useMemo(() => Date.now(), [orders]);
  const since = rangeStartMs(range, now);

  const summary = useMemo(() => summarizeRatings(orders, since), [orders, since]);
  const byStaff = useMemo(() => ratingsByStaff(orders, since), [orders, since]);
  const byMode = useMemo(() => ratingsByMode(orders, since), [orders, since]);
  const reasons = useMemo(() => downReasons(orders, since), [orders, since]);
  const open = useMemo(() => needsAttention(orders), [orders]);
  const handled = useMemo(
    () => orders.filter(o => o.status === 'Delivered' && o.rating?.score === 'down' && o.rating.handledAt)
      .sort((a, b) => (b.rating!.handledAt!.toMillis?.() ?? 0) - (a.rating!.handledAt!.toMillis?.() ?? 0)).slice(0, 20),
    [orders]
  );

  const early = summary.rated > 0 && summary.rated < MIN_FOR_PERCENT;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><ThumbsUp className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-xl font-black uppercase text-[#213147]">Ratings</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">How patrons rated their deliveries</p>
          </div>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {RATING_RANGES.map(r => (
            <Button key={r.id} type="button" size="sm" variant={range === r.id ? 'default' : 'ghost'} onClick={() => setRange(r.id)}
              className={cn('h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg', range === r.id ? 'bg-[#213147] text-white' : 'text-slate-500')}>{r.label}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Positive" value={summary.percentPositive == null ? '-' : `${summary.percentPositive}%`} sub={summary.rated ? `${summary.ups} up, ${summary.downs} down` : 'No ratings yet'} />
        <Stat label="Ratings" value={String(summary.rated)} sub={`of ${summary.delivered} delivered`} />
        <Stat label="Response rate" value={summary.responseRate == null ? '-' : `${summary.responseRate}%`} sub="of delivered orders rated" />
      </div>
      {early && <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">Early numbers: fewer than {MIN_FOR_PERCENT} ratings so far, so the percentages can swing a lot.</p>}

      <Card className="border-2 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#213147]">Needs attention</h3>
          <Badge className={cn('border-0 text-[9px] font-black uppercase', open.length ? 'bg-amber-500 text-white' : 'bg-green-100 text-green-700')}>{open.length ? `${open.length} to follow up` : 'All clear'}</Badge>
        </div>
        {open.length === 0 ? (
          <p className="px-5 py-8 text-center text-[10px] font-black uppercase text-muted-foreground opacity-60">No thumbs-down ratings waiting</p>
        ) : (
          <ul>{open.map(o => <AttentionRow key={o.id} order={o} />)}</ul>
        )}
        {handled.length > 0 && (
          <div className="border-t px-5 py-3">
            <button type="button" onClick={() => setShowHandled(v => !v)} className="text-[10px] font-black uppercase tracking-widest text-primary underline">
              {showHandled ? 'Hide' : 'Show'} handled ({handled.length})
            </button>
            {showHandled && <ul className="mt-2">{handled.map(o => <AttentionRow key={o.id} order={o} />)}</ul>}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupTable title="By staff member" rows={byStaff} />
        <GroupTable title="By service mode" rows={byMode} />
      </div>

      <Card className="border-2 bg-white p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#213147] mb-3">What went wrong</h3>
        {reasons.length === 0 ? (
          <p className="text-[10px] font-black uppercase text-muted-foreground opacity-60">No thumbs-down ratings in this range</p>
        ) : (
          <ul className="space-y-2">
            {reasons.map(r => (
              <li key={r.reason} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3">
                <span className="truncate text-xs font-black uppercase text-[#213147]">{r.reason}</span>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(4, (r.count / reasons[0].count) * 100)}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-sm font-black text-[#213147]">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-2xl font-black text-[#213147]">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{sub}</p>
    </Card>
  );
}

function GroupTable({ title, rows }: { title: string; rows: RatingGroupRow[] }) {
  return (
    <Card className="border-2 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b bg-slate-50"><h3 className="text-xs font-black uppercase tracking-widest text-[#213147]">{title}</h3></div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-[10px] font-black uppercase text-muted-foreground opacity-60">No ratings in this range</p>
      ) : (
        <ul>
          {rows.map(r => (
            <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-2.5 border-b last:border-0">
              <span className="truncate text-xs font-black uppercase text-[#213147]">{r.name}</span>
              <span className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1 text-green-700"><ThumbsUp className="h-3 w-3" />{r.ups}</span>
                <span className="flex items-center gap-1 text-red-600"><ThumbsDown className="h-3 w-3" />{r.downs}</span>
              </span>
              <span className="w-12 text-right font-mono text-sm font-black text-[#213147]">{r.percentPositive == null ? '-' : `${r.percentPositive}%`}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// One thumbs-down rating: who, what and why, a way to call them, and a note plus Mark handled while it is open.
export function AttentionRow({ order, compact = false }: { order: Order; compact?: boolean }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const r = order.rating!;
  const handled = !!r.handledAt;
  const phone = (order.customerPhone || '').replace(/\D/g, '');

  const markHandled = async () => {
    if (!firestore) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'orders', order.id), {
        'rating.handledAt': serverTimestamp(),
        'rating.handledBy': user?.email || user?.uid || '',
        'rating.handledNote': note.trim(),
      });
      toast({ title: 'Marked handled' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: e?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={cn('px-5 py-3 border-b last:border-0 space-y-1.5', handled && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs font-black text-primary">#{getNumericOrderId(order.id)}</span>
        <span className="text-sm font-black uppercase text-[#213147]">{order.customerName}</span>
        <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">{order.menuType}</Badge>
        <Badge className="border-0 bg-red-100 text-red-700 text-[8px] font-black uppercase">{r.reason || 'Not good'}</Badge>
        <span className="text-[9px] font-bold uppercase text-muted-foreground ml-auto">
          {order.assignedStaffName ? `${order.assignedStaffName} · ` : ''}{order.createdAt ? format(order.createdAt.toDate(), 'MMM d, h:mm a') : ''}
        </span>
      </div>
      {r.comment && <p className="text-sm font-medium text-[#213147]">&ldquo;{r.comment}&rdquo;</p>}
      {!compact && (
        <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
      )}
      {handled ? (
        <p className="text-[10px] font-bold text-green-700 flex items-center gap-1"><Check className="h-3 w-3" /> Handled{r.handledNote ? `: ${r.handledNote}` : ''}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {phone.length >= 10 && (
            <Button asChild type="button" variant="outline" size="sm" className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
              <a href={`tel:+${phone.length === 10 ? '1' : ''}${phone}`}><Phone className="h-3 w-3" /> Call</a>
            </Button>
          )}
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (optional)" aria-label={`Note for order ${getNumericOrderId(order.id)}`} className="h-8 flex-1 min-w-[10rem] border-2 text-xs font-medium" />
          <Button type="button" size="sm" disabled={saving} onClick={markHandled} className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Mark handled
          </Button>
        </div>
      )}
    </li>
  );
}
