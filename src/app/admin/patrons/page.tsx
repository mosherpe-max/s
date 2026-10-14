'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Download, Loader2, Search, UsersRound } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Order, Seller } from '@/lib/types';
import { isDemoVenue } from '@/lib/koop-sales-report';
import {
  buildKoopPatronCsv, buildKoopPatronRows, filterKoopPatrons, sortKoopPatrons, totalKoopPatrons,
  type KoopPatronSort, type KoopPatronVenue,
} from '@/lib/koop-patrons';

const SORTS: { id: KoopPatronSort; label: string }[] = [
  { id: 'value', label: 'Highest Value' },
  { id: 'orders', label: 'Most Orders' },
  { id: 'venues', label: 'Most Venues' },
  { id: 'recent', label: 'Most Recent' },
  { id: 'name', label: 'Name (A–Z)' },
];

const ALL_VENUES = 'all';
const PAGE_SIZE = 100;
const MAX_VENUE_CHIPS = 3;

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-[#213147] mt-1 font-mono">{value}</p>
      {note && <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{note}</p>}
    </Card>
  );
}

// Koop admin: everyone who has had an order delivered, across all venues, with their contact details,
// lifetime order value and count, and the venues they have ordered from. Demo venues are included by
// default for now so the page can be tested.
export default function KoopPatronsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<KoopPatronSort>('value');
  const [venueId, setVenueId] = useState(ALL_VENUES);
  const [includeDemo, setIncludeDemo] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Lifetime figures, so every delivered order is loaded (no date range).
  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('status', '==', 'Delivered')) : null), [firestore]);
  const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const { data: sellers } = useCollection<Seller>(sellersQuery);

  const venues = useMemo(() => {
    const map: Record<string, KoopPatronVenue> = {};
    (sellers || []).forEach(s => { map[s.id] = { name: s.courseName || s.id, isDemo: isDemoVenue(s.id) }; });
    return map;
  }, [sellers]);

  const venueOptions = useMemo(
    () => Object.entries(venues).filter(([, v]) => includeDemo || !v.isDemo).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [venues, includeDemo],
  );
  // If the chosen venue is hidden by the demo switch, fall back to all venues.
  const activeVenue = venueId !== ALL_VENUES && venueOptions.some(([id]) => id === venueId) ? venueId : ALL_VENUES;

  const allRows = useMemo(
    () => buildKoopPatronRows(
      (orders || []).map(o => ({
        sellerId: o.sellerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        status: o.status,
        total: o.total,
        serviceFee: o.serviceFee,
        createdAtMs: o.createdAt ? o.createdAt.toMillis() : 0,
      })),
      venues,
      { includeDemo, venueId: activeVenue === ALL_VENUES ? undefined : activeVenue },
    ),
    [orders, venues, includeDemo, activeVenue],
  );

  const view = useMemo(() => {
    const rows = sortKoopPatrons(filterKoopPatrons(allRows, search), sort);
    return { rows, totals: totalKoopPatrons(rows) };
  }, [allRows, search, sort]);

  const handleDownload = () => {
    const csv = buildKoopPatronCsv(view.rows, view.totals, (ms) => format(new Date(ms), 'yyyy-MM-dd'));
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Koop_Patron_List_${format(new Date(), 'yyyy-MM-dd')}${includeDemo ? '' : '_no_demo'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({ title: 'Patron List Downloaded', description: `${view.rows.length} patron${view.rows.length === 1 ? '' : 's'} included.` });
  };

  const visible = view.rows.slice(0, shown);

  return (
    <div className="p-8 animate-in fade-in duration-500 text-left">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><UsersRound className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-2xl font-black uppercase text-[#213147]">Patrons</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Everyone across all venues · lifetime figures · delivered orders only · order value is what the patron paid, convenience fee included
            </p>
          </div>
        </div>

        <Card className="border-2 shadow-sm bg-white p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="kp-search" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="kp-search" value={search} onChange={(e) => { setSearch(e.target.value); setShown(PAGE_SIZE); }} placeholder="Name, email, mobile or venue" className="h-10 pl-9 border-2 font-bold" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Venue</Label>
              <Select value={activeVenue} onValueChange={(v) => { setVenueId(v); setShown(PAGE_SIZE); }}>
                <SelectTrigger className="h-10 w-52 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VENUES} className="text-[10px] font-black uppercase">All venues</SelectItem>
                  {venueOptions.map(([id, v]) => <SelectItem key={id} value={id} className="text-[10px] font-black uppercase">{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Sort</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as KoopPatronSort)}>
                <SelectTrigger className="h-10 w-44 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORTS.map(s => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase">{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 h-10">
              <Switch id="kp-demo" checked={includeDemo} onCheckedChange={setIncludeDemo} />
              <Label htmlFor="kp-demo" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">Include demo venues</Label>
            </div>
            <Button onClick={handleDownload} disabled={view.rows.length === 0} className="h-10 ml-auto font-black uppercase text-[10px] tracking-widest gap-2">
              <Download className="h-4 w-4" /> Download CSV
            </Button>
          </div>
        </Card>

        {error && (
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive">Could not load orders: {error.message}</p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Patrons" value={String(view.totals.patrons)} />
          <Tile label="Lifetime orders" value={String(view.totals.orders)} />
          <Tile label="Lifetime order value" value={money(view.totals.orderValue)} note={`${money(view.totals.koopFees)} Koop fees`} />
          <Tile label="At 2+ venues" value={String(view.totals.multiVenue)} note="Patrons who ordered from more than one venue" />
        </div>

        <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Mobile</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Orders</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Order Value</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Venues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline" /></TableCell></TableRow>
                ) : view.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-[10px] font-black uppercase text-muted-foreground">
                      {allRows.length === 0 ? 'No patrons yet. They appear here after their first delivered order.' : 'No patrons match your search'}
                    </TableCell>
                  </TableRow>
                ) : visible.map(r => (
                  <TableRow key={r.key} className="hover:bg-slate-50/50 transition-colors align-top">
                    <TableCell className="px-8 font-bold text-sm uppercase text-left">
                      {r.name || 'Guest'}
                      <span className="block text-[9px] font-semibold normal-case text-muted-foreground">
                        First {format(new Date(r.firstOrderMs), 'MMM d, yyyy')} · Last {format(new Date(r.lastOrderMs), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">{r.email || '—'}</TableCell>
                    <TableCell className="text-xs font-semibold whitespace-nowrap">{r.phone || '—'}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{r.orderCount}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm whitespace-nowrap">{money(r.orderValue)}</TableCell>
                    <TableCell className="px-8" title={r.venues.map(v => `${v.venueName} (${v.orders})`).join(', ')}>
                      <div className="flex flex-wrap gap-1">
                        {r.venues.slice(0, MAX_VENUE_CHIPS).map(v => (
                          <Badge key={v.sellerId} variant="outline" className="text-[9px] font-black uppercase bg-slate-50 whitespace-nowrap">
                            {v.venueName} · {v.orders}{v.isDemo ? ' · Demo' : ''}
                          </Badge>
                        ))}
                        {r.venues.length > MAX_VENUE_CHIPS && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase">+{r.venues.length - MAX_VENUE_CHIPS} more</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {view.rows.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-slate-50">
                    <TableCell colSpan={3} className="px-8 text-[10px] font-black uppercase tracking-widest">Total · {view.totals.patrons} patron{view.totals.patrons === 1 ? '' : 's'}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm">{view.totals.orders}</TableCell>
                    <TableCell className="text-right font-mono font-black text-sm whitespace-nowrap">{money(view.totals.orderValue)}</TableCell>
                    <TableCell className="px-8" />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
          {view.rows.length > shown && (
            <div className="p-4 border-t text-center">
              <Button variant="outline" onClick={() => setShown(s => s + PAGE_SIZE)} className="h-9 font-black uppercase text-[10px] tracking-widest">
                Show more ({view.rows.length - shown} left)
              </Button>
            </div>
          )}
        </Card>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          The same person is matched by email, then mobile number. Someone who used a different email and number at two venues appears as two patrons. The CSV download includes every row, not just the ones shown.
        </p>
      </div>
    </div>
  );
}
