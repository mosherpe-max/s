'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, RefreshCcw } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Seller, Venue } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isCardReady, stripeAttention, type StripeAttentionKind } from '@/lib/stripe-readiness';
import { useRefreshStripeStatus } from '@/lib/use-refresh-stripe-status';

const KIND_STYLES: Record<StripeAttentionKind, string> = {
  'not-started': 'bg-slate-500',
  'incomplete': 'bg-amber-500',
  'info-needed': 'bg-orange-500',
  'paused': 'bg-red-600',
};

// Koop admin overview: venues whose Stripe account needs a person's attention (not started, unfinished,
// Stripe asking for more, or payouts paused). Status comes from Stripe through the account.updated webhook;
// the button asks Stripe for every venue right now.
export function StripeAttentionCard() {
  const firestore = useFirestore();
  const { refresh, isRefreshing } = useRefreshStripeStatus();
  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'venues') : null), [firestore]);
  const { data: sellers } = useCollection<Seller>(sellersQuery);
  const { data: venues } = useCollection<Venue>(venuesQuery);

  const { rows, readyCount } = useMemo(() => {
    const byId = new Map((venues || []).map(v => [v.venueId, v]));
    const out: { id: string; name: string; isDemo: boolean; kind: StripeAttentionKind; label: string; detail: string }[] = [];
    let ready = 0;
    (sellers || []).forEach(seller => {
      const venue = byId.get(seller.id);
      if (isCardReady(venue)) ready++;
      const isDemo = seller.id.startsWith('demo-') || !!venue?.isDemo;
      const attention = stripeAttention(venue, { isActive: seller.status === 'Active', isDemo });
      if (attention) out.push({ id: seller.id, name: seller.courseName || seller.id, isDemo, ...attention });
    });
    out.sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || a.name.localeCompare(b.name));
    return { rows: out, readyCount: ready };
  }, [sellers, venues]);

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Stripe Status
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] text-white', rows.length > 0 ? 'bg-amber-500' : 'bg-green-600')}>
            {rows.length > 0 ? `${rows.length} need attention` : 'All good'}
          </span>
        </CardTitle>
        <Button onClick={() => refresh()} disabled={isRefreshing} variant="outline" size="sm" className="h-8 border-2 font-black uppercase text-[9px] tracking-widest gap-1.5">
          {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />} Check All With Stripe
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 p-6 text-left">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              {readyCount} venue{readyCount === 1 ? '' : 's'} can take card payments. Nothing needs attention.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map(row => (
              <li key={row.id} className="flex items-start justify-between gap-4 px-6 py-4 text-left">
                <div className="min-w-0 space-y-1">
                  <p className="font-black text-sm uppercase flex flex-wrap items-center gap-2">
                    {row.name}
                    {row.isDemo && <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">Demo</Badge>}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-snug">{row.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge className={cn('border-0 text-[8px] font-black uppercase', KIND_STYLES[row.kind])}>
                    {row.kind === 'paused' && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}{row.label}
                  </Badge>
                  <Link href="/admin/venues" className="text-[9px] font-black uppercase text-primary hover:underline">Open Venue Registry</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
