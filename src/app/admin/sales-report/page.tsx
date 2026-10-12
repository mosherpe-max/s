'use client';

import { useMemo, useState } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { Download, Loader2, Receipt } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, Seller } from '@/lib/types';
import { REPORT_PRESETS, reportRange, type ReportPreset } from '@/lib/report-ranges';
import {
  buildKoopSalesCsv, buildKoopSalesRows, filterKoopSalesRows, isDemoVenue, totalKoopSalesRows,
  type KoopVenueInfo,
} from '@/lib/koop-sales-report';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateKey = (ms: number) => format(new Date(ms), 'yyyy-MM-dd');

// Koop admin: one line per venue per day with orders, gross sales and Koop's fees. Demo venues
// are included for now so the report can be tested; switch them off once real venues are live.
export default function KoopSalesReportPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [from, setFrom] = useState(() => format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [includeDemo, setIncludeDemo] = useState(true);

  // Only the orders from the chosen start date onward are loaded.
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const start = from ? new Date(`${from}T00:00:00`) : new Date(0);
    return query(collection(firestore, 'orders'), where('createdAt', '>=', Timestamp.fromDate(start)));
  }, [firestore, from]);
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const { data: sellers } = useCollection<Seller>(sellersQuery);

  const venues = useMemo(() => {
    const map: Record<string, KoopVenueInfo> = {};
    (sellers || []).forEach(s => { map[s.id] = { name: s.courseName || s.id, isDemo: isDemoVenue(s.id) }; });
    return map;
  }, [sellers]);

  const allRows = useMemo(
    () => buildKoopSalesRows(
      (orders || []).map(o => ({
        sellerId: o.sellerId,
        status: o.status,
        total: o.total,
        serviceFee: o.serviceFee,
        createdAtMs: o.createdAt ? o.createdAt.toMillis() : 0,
      })),
      venues,
      dateKey,
    ),
    [orders, venues]
  );

  const view = useMemo(() => {
    const rows = filterKoopSalesRows(allRows, from, to, includeDemo);
    return { rows, totals: totalKoopSalesRows(rows) };
  }, [allRows, from, to, includeDemo]);

  const setPreset = (preset: ReportPreset) => {
    const range = reportRange(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleDownload = () => {
    const csv = buildKoopSalesCsv(view.rows, view.totals);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Koop_Sales_Report_${from || 'start'}_to_${to || 'today'}${includeDemo ? '' : '_no_demo'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({ title: 'Sales Report Downloaded', description: `${view.rows.length} line${view.rows.length === 1 ? '' : 's'} included.` });
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 text-left">
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Receipt className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-2xl font-black uppercase text-[#213147]">Sales Report</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              One line per venue per day · delivered orders only · gross sales are what patrons paid, Koop fees are the convenience fees
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-sm bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="koop-from" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">From</Label>
              <Input id="koop-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40 border-2 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="koop-to" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">To</Label>
              <Input id="koop-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 w-40 border-2 font-bold" />
            </div>
            <div className="flex items-center gap-3 h-10">
              <Switch id="koop-demo" checked={includeDemo} onCheckedChange={setIncludeDemo} />
              <Label htmlFor="koop-demo" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Include demo venues</Label>
            </div>
            <Button onClick={handleDownload} disabled={view.rows.length === 0} className="h-10 ml-auto font-black uppercase text-[10px] tracking-widest gap-2">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {REPORT_PRESETS.map(({ id, label }) => (
              <Button key={id} type="button" variant="outline" size="sm" onClick={() => setPreset(id)} className="h-7 rounded-full border-2 text-[9px] font-black uppercase tracking-widest">{label}</Button>
            ))}
          </div>
        </Card>

        {ordersError && (
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive">Could not load orders: {ordersError.message}</p>
        )}

        <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Venue</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Gross Sales</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Koop Fees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline" /></TableCell></TableRow>
                ) : view.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-16 text-center text-[10px] font-black uppercase text-muted-foreground">No delivered orders in this range</TableCell></TableRow>
                ) : view.rows.map(r => (
                  <TableRow key={`${r.date}|${r.sellerId}`} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-8 font-mono font-black text-xs whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="font-bold text-sm uppercase">
                      {r.venueName}
                      {r.isDemo && <Badge variant="outline" className="ml-2 text-[8px] font-black uppercase bg-slate-100 border-slate-200">Demo</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{r.orders}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{money(r.grossSales)}</TableCell>
                    <TableCell className="text-right px-8 font-mono font-black text-sm">{money(r.koopFees)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {view.rows.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-slate-50">
                    <TableCell colSpan={2} className="px-8 text-[10px] font-black uppercase tracking-widest">Total · {view.totals.venues} venue{view.totals.venues === 1 ? '' : 's'}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{view.totals.orders}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{money(view.totals.grossSales)}</TableCell>
                    <TableCell className="text-right px-8 font-mono font-black text-sm">{money(view.totals.koopFees)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
