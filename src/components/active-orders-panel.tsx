'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { Order, Seller, SolutionConfig } from '@/lib/types';
import { getNumericOrderId, cn } from '@/lib/utils';

interface ActiveOrdersPanelProps {
  orders: Order[];
  seller: Seller | null | undefined;
  solutionConfig: SolutionConfig | null | undefined;
}

const ACTIVE_STATUSES: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery'];
const DEFAULT_THRESHOLDS = { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 };

/**
 * Live "what's happening right now" board for the Dashboard tab - distinct
 * from the Fulfillment Log, which is a historical/searchable ticket list
 * with no notion of "currently in flight" or live duration. Golf shows
 * which service mode each order is on; bowling shows lane number instead,
 * since every bowling order is Lane Delivery and the mode column would be
 * redundant there.
 */
export function ActiveOrdersPanel({ orders, seller, solutionConfig }: ActiveOrdersPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  // Matches the existing 15s live-tracking cadence used elsewhere (e.g.
  // bevcart's own `now` state) rather than a per-second clock - duration is
  // only ever displayed in whole minutes, so finer-grained ticking would
  // just mean more re-renders for no visible benefit.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const isGolf = seller?.type === 'Golf Course';

  const activeOrders = orders
    .filter(o => ACTIVE_STATUSES.includes(o.status))
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));

  return (
    <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Order</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">{isGolf ? 'Mode' : 'Lane'}</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Staff</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
            <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeOrders.map(order => {
            const thresholds = seller?.orderThresholds?.[order.menuType] || solutionConfig?.orderThresholds?.[order.menuType] || DEFAULT_THRESHOLDS;
            const elapsedMinutes = order.createdAt ? Math.max(0, Math.floor((now - order.createdAt.toDate().getTime()) / 60000)) : 0;
            const isOverMax = elapsedMinutes >= thresholds.maxOrderProcessingMinutes;
            const isOverWarn = elapsedMinutes >= thresholds.warningOrderProcessingMinutes;

            return (
              <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8 font-mono font-black text-primary text-xs">#{getNumericOrderId(order.id)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">
                    {isGolf ? order.menuType : (order.menuTypeLocation || '—')}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-sm uppercase">
                  {order.assignedStaffName || <span className="text-muted-foreground italic normal-case font-medium">Unassigned</span>}
                </TableCell>
                <TableCell>
                  <Badge className="text-[8px] font-black uppercase border-0 bg-primary animate-pulse">{order.status}</Badge>
                </TableCell>
                <TableCell className="text-right px-8">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 font-mono font-black text-sm",
                    isOverMax ? "text-destructive" : isOverWarn ? "text-amber-500" : "text-[#213147]"
                  )}>
                    <Clock className="h-3 w-3" />
                    {elapsedMinutes}m
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {activeOrders.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-muted-foreground text-sm font-bold uppercase">
                No active orders right now
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
