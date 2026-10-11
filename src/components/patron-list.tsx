'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, Search, UsersRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import {
  buildPatronCsv, buildPatronRows, filterPatronRows, sortPatronRows, totalPatronRows,
  type PatronSort,
} from '@/lib/patron-list';

const SORTS: { id: PatronSort; label: string }[] = [
  { id: 'revenue', label: 'Highest Revenue' },
  { id: 'orders', label: 'Most Orders' },
  { id: 'recent', label: 'Most Recent' },
  { id: 'name', label: 'Name (A–Z)' },
];

const money = (n: number) => `$${n.toFixed(2)}`;

// Everyone who has had an order delivered, with lifetime order count and net revenue
// (what they paid, minus the Koop convenience fee). Built from the venue's orders.
export function PatronList({ orders, courseName }: { orders: Order[] | null | undefined; courseName?: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PatronSort>('revenue');

  const allRows = useMemo(
    () => buildPatronRows((orders || []).map(o => ({
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail,
      status: o.status,
      total: o.total,
      serviceFee: o.serviceFee,
      createdAtMs: o.createdAt ? o.createdAt.toMillis() : 0,
    }))),
    [orders]
  );

  const view = useMemo(() => {
    const rows = sortPatronRows(filterPatronRows(allRows, search), sort);
    return { rows, totals: totalPatronRows(rows) };
  }, [allRows, search, sort]);

  const handleDownload = () => {
    const csv = buildPatronCsv(view.rows, view.totals, (ms) => format(new Date(ms), 'yyyy-MM-dd'));
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const venueName = (courseName || 'Venue').replace(/[^a-z0-9]+/gi, '_');
    link.href = url;
    link.download = `${venueName}_Patron_List_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({ title: 'Patron List Downloaded', description: `${view.rows.length} patron${view.rows.length === 1 ? '' : 's'} included.` });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg"><UsersRound className="h-6 w-6 text-primary" /></div>
        <div className="text-left">
          <h2 className="text-xl font-black uppercase text-[#213147]">Patrons</h2>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            Lifetime orders and net revenue (excludes the Koop convenience fee) · delivered orders only
          </p>
        </div>
      </div>

      <Card className="border-2 shadow-sm bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label htmlFor="patron-search" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="patron-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or mobile" className="h-10 pl-9 border-2 font-bold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sort</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as PatronSort)}>
              <SelectTrigger className="h-10 w-48 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownload} disabled={view.rows.length === 0} className="h-10 ml-auto font-black uppercase text-[10px] tracking-widest gap-2">
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>
      </Card>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Mobile</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Net Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-[10px] font-black uppercase text-muted-foreground">
                    {allRows.length === 0 ? 'No patrons yet. They appear here after their first delivered order.' : 'No patrons match your search'}
                  </TableCell>
                </TableRow>
              ) : view.rows.map(r => (
                <TableRow key={r.key} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 font-bold text-sm uppercase text-left">
                    {r.name || 'Guest'}
                    <span className="block text-[9px] font-semibold normal-case text-muted-foreground">Last order {format(new Date(r.lastOrderMs), 'MMM d, yyyy')}</span>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{r.email || '—'}</TableCell>
                  <TableCell className="text-xs font-semibold whitespace-nowrap">{r.phone || '—'}</TableCell>
                  <TableCell className="text-right font-mono font-black text-sm">{r.orderCount}</TableCell>
                  <TableCell className="text-right px-8 font-mono font-black text-sm">{money(r.netRevenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {view.rows.length > 0 && (
              <TableFooter>
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={3} className="px-8 text-[10px] font-black uppercase tracking-widest">Total · {view.totals.patrons} patron{view.totals.patrons === 1 ? '' : 's'}</TableCell>
                  <TableCell className="text-right font-mono font-black text-sm">{view.totals.orderCount}</TableCell>
                  <TableCell className="text-right px-8 font-mono font-black text-sm">{money(view.totals.netRevenue)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </Card>
    </div>
  );
}
