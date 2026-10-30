'use client';

import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Coins, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { REPORT_PRESETS, reportRange, type ReportPreset } from '@/lib/report-ranges';
import { buildTipCsv, buildTipReport, type TipOrder } from '@/lib/tips-report';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const usd = (n: number) => `$${n.toFixed(2)}`;

// Venue admin > Tips Report: card tips by the staff member who delivered each order, by day or totalled over
// the chosen dates, with a CSV for payroll. See lib/tips-report.ts for exactly what is counted.
export function TipsReport({ orders, menuTypes, courseName }: { orders: Order[] | null | undefined; menuTypes: string[]; courseName?: string }) {
  const { toast } = useToast();
  const [view, setView] = useState<'day' | 'staff'>('day');
  const [mode, setMode] = useState('All');
  const [staffKey, setStaffKey] = useState('All');
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState('');

  const tipOrders = useMemo<TipOrder[]>(() => (orders || [])
    .filter(o => o.status === 'Delivered' && o.createdAt)
    .map(o => ({
      date: format(o.createdAt.toDate(), 'yyyy-MM-dd'),
      menuType: o.menuType,
      paymentMethod: o.paymentMethod || '',
      tip: o.tip || 0,
      status: o.status,
      staffId: o.assignedStaffId,
      staffName: o.assignedStaffName,
      placedMs: o.createdAt.toMillis(),
    })), [orders]);

  const report = useMemo(() => buildTipReport(tipOrders, { mode, from, to, staffKey }), [tipOrders, mode, from, to, staffKey]);
  const average = report.totalTippedOrders > 0 ? report.totalTips / report.totalTippedOrders : 0;
  const rowCount = view === 'day' ? report.byDay.length : report.byStaff.length;
  // A filtered-out person must not leave the picker pointing at nobody.
  const staffValue = report.staffOptions.some(s => s.key === staffKey) ? staffKey : 'All';

  const setPreset = (preset: ReportPreset) => {
    const range = reportRange(preset);
    setFrom(range.from);
    setTo(range.to);
  };

  const download = () => {
    const csv = buildTipCsv(report, view, mode);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const venue = (courseName || 'Venue').replace(/[^a-z0-9]+/gi, '_');
    const modePart = mode === 'All' ? 'All_Modes' : mode.replace(/\s+/g, '_');
    link.href = url;
    link.download = `${venue}_Tips_${view === 'day' ? 'By_Day' : 'By_Staff'}_${modePart}_${from || 'start'}_to_${to || 'today'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({ title: 'Tips Report Downloaded', description: `${rowCount} row${rowCount === 1 ? '' : 's'} included.` });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg"><Coins className="h-6 w-6 text-primary" /></div>
        <div className="text-left">
          <h2 className="text-xl font-black uppercase text-[#213147]">Tips Report</h2>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Card tips by the staff member who delivered the order</p>
        </div>
      </div>

      <Card className="border-2 shadow-sm bg-white p-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
          {([['day', 'By Day'], ['staff', 'By Staff Member']] as const).map(([id, label]) => (
            <Button key={id} type="button" variant={view === id ? 'default' : 'ghost'} size="sm" onClick={() => setView(id)}
              className={cn('h-8 px-4 text-[9px] font-black uppercase tracking-widest rounded-lg', view === id ? 'bg-[#213147] text-white' : 'text-slate-500')}>{label}</Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Service Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-10 w-48 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-[10px] font-black uppercase">All Service Modes</SelectItem>
                {menuTypes.filter(m => AUTHORIZED_SERVICE_MODES.includes(m)).map(m => (
                  <SelectItem key={m} value={m} className="text-[10px] font-black uppercase">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Staff Member</Label>
            <Select value={staffValue} onValueChange={setStaffKey}>
              <SelectTrigger className="h-10 w-48 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All" className="text-[10px] font-black uppercase">Everyone</SelectItem>
                {report.staffOptions.map(s => (
                  <SelectItem key={s.key} value={s.key} className="text-[10px] font-black uppercase">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tips-from" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">From</Label>
            <Input id="tips-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40 border-2 font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tips-to" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">To</Label>
            <Input id="tips-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 w-40 border-2 font-bold" />
          </div>
          <Button onClick={download} disabled={rowCount === 0} className="h-10 ml-auto font-black uppercase text-[10px] tracking-widest gap-2">
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {REPORT_PRESETS.map(({ id, label }) => (
            <Button key={id} type="button" variant="outline" size="sm" onClick={() => setPreset(id)} className="h-7 rounded-full border-2 text-[9px] font-black uppercase tracking-widest">{label}</Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          ['Card Tips', usd(report.totalTips)],
          ['Tipped Orders', `${report.totalTippedOrders} of ${report.totalOrders}`],
          ['Average Tip', report.totalTippedOrders > 0 ? usd(average) : '-'],
        ] as const).map(([label, value]) => (
          <Card key={label} className="border-2 shadow-sm bg-white p-4 text-left">
            <p className="text-2xl font-black text-[#213147]">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            {view === 'day' ? (
              <TableRow>
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Staff Member</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Service Mode</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Tipped</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8">Card Tips</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Staff Member</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Service Mode</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Days</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Tipped</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8">Card Tips</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {rowCount === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center text-[10px] font-black uppercase text-muted-foreground opacity-40">No delivered orders in this range</TableCell></TableRow>
            ) : view === 'day' ? report.byDay.map(r => (
              <TableRow key={`${r.date}-${r.staffKey}`}>
                <TableCell className="px-8 font-mono text-xs font-bold">{r.date}</TableCell>
                <TableCell className="text-xs font-black uppercase text-[#213147]">{r.staffName}</TableCell>
                <TableCell className="text-[10px] font-black uppercase text-muted-foreground">{r.modes.join(' / ')}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{r.orders}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{r.tippedOrders}</TableCell>
                <TableCell className="text-right pr-8 font-mono text-sm font-black text-[#213147]">{usd(r.tips)}</TableCell>
              </TableRow>
            )) : report.byStaff.map(s => (
              <TableRow key={s.staffKey}>
                <TableCell className="px-8 text-xs font-black uppercase text-[#213147]">{s.staffName}</TableCell>
                <TableCell className="text-[10px] font-black uppercase text-muted-foreground">{s.modes.join(' / ')}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{s.days}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{s.orders}</TableCell>
                <TableCell className="text-right font-mono text-xs font-bold">{s.tippedOrders}</TableCell>
                <TableCell className="text-right pr-8 font-mono text-sm font-black text-[#213147]">{usd(s.tips)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rowCount > 0 && (
            <TableFooter className="bg-slate-50">
              <TableRow>
                <TableCell className="px-8 text-[10px] font-black uppercase tracking-widest" colSpan={3}>Total</TableCell>
                <TableCell className="text-right font-mono text-xs font-black">{report.totalOrders}</TableCell>
                <TableCell className="text-right font-mono text-xs font-black">{report.totalTippedOrders}</TableCell>
                <TableCell className="text-right pr-8 font-mono text-sm font-black text-[#213147]">{usd(report.totalTips)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>

      <div className="space-y-1 text-left">
        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
          Each tip is credited to the staff member who delivered the order. On a Clubhouse order that is the runner, not the person who prepared it.
          Only tips paid by card are counted. Orders marked Unassigned were delivered without a staff member recorded.
          Days are the day the order was placed, matching the Sales Report.
        </p>
        {report.notCounted.orders > 0 && (
          <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
            Not counted: {usd(report.notCounted.tips)} in tips on {report.notCounted.orders} order{report.notCounted.orders === 1 ? '' : 's'} paid another way (pay at delivery or member account). Those tips did not go through Koop.
          </p>
        )}
      </div>
    </div>
  );
}
