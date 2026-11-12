'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Loader2, Trash2, TrendingUp, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  buildSeasonComparison, isIsoDate, koopMonthlySales, missingRoundsMonth, parseSeasonCsv, recordId, rollUpMonths, seasonYears,
  type SeasonKind, type SeasonMonth, type SeasonRecord,
} from '@/lib/season-data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const usd = (n: number | null | undefined) => (n == null ? '-' : `$${n.toFixed(2)}`);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PRIOR_COLOR = '#94a3b8';
const BEV_COLOR = '#E50000';
const COMBINED_COLOR = '#213147';

type StoredRecord = SeasonRecord & { id: string };

// Dollars per round for a venue: Bev cart, and Clubhouse + Bev cart, by month, this season against last. Sales come from
// Koop's own orders once the venue is live (and from what the venue gave us for past seasons); rounds are typed in or
// uploaded. The same panel is used by the Koop admin (venue onboarding) and the venue admin.
export function SeasonDataPanel({ sellerId, orders }: { sellerId: string; orders?: Order[] | null }) {
  const firestore = useFirestore();
  const recordsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'seasonData') : null), [firestore, sellerId]);
  const { data: stored, isLoading: recordsLoading } = useCollection<SeasonRecord>(recordsQuery);
  // The venue admin screen already has the venue's orders; the Koop admin screen does not, so it asks for them.
  const ordersQuery = useMemoFirebase(
    () => (firestore && orders === undefined ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null),
    [firestore, sellerId, orders]
  );
  const { data: fetchedOrders } = useCollection<Order>(ordersQuery);
  const orderList = orders !== undefined ? orders : fetchedOrders;

  const records = useMemo<StoredRecord[]>(() => (stored || []).map(r => ({ ...r, id: recordId(r.kind, r.start) })), [stored]);
  const koop = useMemo(() => koopMonthlySales((orderList || [])
    .filter(o => o.createdAt)
    .map(o => ({
      date: format(o.createdAt.toDate(), 'yyyy-MM-dd'), menuType: o.menuType, status: o.status, subtotal: o.subtotal || 0,
      total: o.total || 0, refundedAmount: o.refundedAmount, isDemoSeed: (o as Order & { isDemoSeed?: boolean }).isDemoSeed,
    }))), [orderList]);

  const years = useMemo(() => seasonYears(records, koop), [records, koop]);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const year = pickedYear && years.includes(pickedYear) ? pickedYear : years[years.length - 1] ?? new Date().getFullYear();
  const { months, summary } = useMemo(() => buildSeasonComparison(records, koop, year), [records, koop, year]);
  const visible = useMemo(() => {
    const used = months.filter(m => m.priorBev != null || m.currentBev != null || m.currentCombined != null || m.priorCombined != null);
    return used.length ? used : [];
  }, [months]);
  const missing = useMemo(() => missingRoundsMonth(records, koop), [records, koop]);
  const hasAnyData = records.length > 0 || koop.size > 0;
  const hasComparison = summary.months > 0;

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-6 w-6 text-primary" /></div>
          <div>
            <h2 className="text-xl font-black uppercase text-[#213147]">Dollars per Round</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">On-course sales divided by rounds played, by month</p>
          </div>
        </div>
        {years.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Season</Label>
            <Select value={String(year)} onValueChange={(v) => setPickedYear(Number(v))}>
              <SelectTrigger className="h-9 w-28 border-2 font-black text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{years.slice().reverse().map(y => <SelectItem key={y} value={String(y)} className="font-black">{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      {missing && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
            Add the rounds played in {MONTH_NAMES[Number(missing.slice(5)) - 1]} {missing.slice(0, 4)} to see its dollars per round. Use the entry boxes below.
          </p>
        </div>
      )}

      {recordsLoading && !hasAnyData ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !hasAnyData ? (
        <Card className="border-2 bg-white p-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">No data yet</p>
          <p className="text-[11px] font-semibold text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
            Add last season&apos;s Bev cart sales and rounds, and this season&apos;s rounds, below. Once the venue is taking orders on Koop, its sales fill in on their own.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label={`Bev cart per round, ${year - 1}`} value={usd(summary.priorBev)} />
            <Stat label={`Bev cart per round, ${year}`} value={usd(summary.currentBev)} change={summary.bevChangePct} />
            <Stat label={`Clubhouse + Bev cart per round, ${year}`} value={usd(summary.currentCombined)} change={summary.combinedChangePct} />
            <Stat label="Months compared" value={String(summary.months)} />
          </div>
          {!hasComparison && (
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
              The totals above need a month with sales and rounds in both {year - 1} and {year}. Bars show whatever months have data.
            </p>
          )}
          <PerRoundChart title="Bev cart sales per round" months={visible} year={year} series="bev" />
          <PerRoundChart title="Clubhouse + Bev cart sales per round" months={visible} year={year} series="combined" />
          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
            Sales are item sales only: no tax, tips or convenience fee, and less refunds. {year - 1} sales come from the figures the venue gave us; any month that has Koop orders uses Koop&apos;s own sales.
            Clubhouse sales are all new on Koop, so the {year - 1} comparison for Clubhouse + Bev cart is Bev cart alone.
            {visible.some(m => m.approximate) && ' Months marked ~ include a week that crosses two months, shared out evenly by day.'}
            {visible.some(m => m.suspect) && ' Months marked * use daily or weekly entries that add up to far less than another total entered for that month, so check them below. They are left out of the totals at the top.'}
          </p>
        </>
      )}

      <SeasonEntry sellerId={sellerId} records={records} koop={koop} defaultYear={new Date().getFullYear()} />
    </div>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-2xl font-black text-[#213147]">{value}</p>
      {change != null && (
        <p className={cn('text-[10px] font-black uppercase', change >= 0 ? 'text-green-600' : 'text-red-600')}>{change >= 0 ? '+' : ''}{change}% vs last season</p>
      )}
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-snug">{label}</p>
    </Card>
  );
}

function PerRoundChart({ title, months, year, series }: { title: string; months: SeasonMonth[]; year: number; series: 'bev' | 'combined' }) {
  const rows = months.map(m => ({
    label: `${m.label}${m.suspect ? ' *' : m.approximate ? ' ~' : ''}`,
    prior: m.priorBev,
    current: series === 'bev' ? m.currentBev : m.currentCombined,
    m,
  }));
  const currentName = series === 'bev' ? `${year} Bev cart` : `${year} Clubhouse + Bev cart`;
  const currentColor = series === 'bev' ? BEV_COLOR : COMBINED_COLOR;
  return (
    <Card className="border-2 shadow-sm bg-white p-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-[#213147] mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground opacity-50">No months with sales and rounds yet</p>
      ) : (
        <div className="h-64 w-full" role="img" aria-label={`${title} by month, ${year - 1} against ${year}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as (typeof rows)[number];
                  const m = row.m;
                  return (
                    <div className="rounded-lg border bg-white p-2 text-[11px] font-bold shadow-md space-y-0.5">
                      <p className="font-black uppercase text-[#213147]">{MONTH_NAMES[Number(m.month) - 1]}</p>
                      <p style={{ color: PRIOR_COLOR }}>{year - 1}: {usd(row.prior)}{m.priorRounds ? ` · ${Math.round(m.priorRounds)} rounds` : ''}</p>
                      <p style={{ color: currentColor }}>{year}: {usd(row.current)}{m.currentRounds ? ` · ${Math.round(m.currentRounds)} rounds` : ''}</p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="prior" name={`${year - 1} Bev cart`} fill={PRIOR_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" name={currentName} fill={currentColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ---- Entry ----

type EntryTab = 'monthly' | 'single' | 'csv';

function SeasonEntry({ sellerId, records, koop, defaultYear }: { sellerId: string; records: StoredRecord[]; koop: Map<string, unknown>; defaultYear: number }) {
  const [tab, setTab] = useState<EntryTab>('monthly');
  return (
    <Card className="border-2 shadow-sm bg-white p-4 space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-[#213147]">Enter rounds and sales</h3>
        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed mt-1">
          Give rounds played, and for past seasons the Bev cart sales (before tax, tips and fees). Daily is best, weekly or monthly is fine. For a stretch of the season, use one level of detail: if a month has daily numbers, they are used and its weekly or monthly totals are ignored.
        </p>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {([['monthly', 'Monthly totals'], ['single', 'Add a day or week'], ['csv', 'Paste or upload']] as const).map(([id, label]) => (
          <Button key={id} type="button" variant={tab === id ? 'default' : 'ghost'} size="sm" onClick={() => setTab(id)}
            className={cn('h-8 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg', tab === id ? 'bg-[#213147] text-white' : 'text-slate-500')}>{label}</Button>
        ))}
      </div>
      {tab === 'monthly' && <MonthlyGrid sellerId={sellerId} records={records} koop={koop} defaultYear={defaultYear} />}
      {tab === 'single' && <SingleEntry sellerId={sellerId} />}
      {tab === 'csv' && <CsvImport sellerId={sellerId} />}
      <RecordList sellerId={sellerId} records={records} />
    </Card>
  );
}

const numberOrNull = (v: string): number | null => {
  const t = v.replace(/[$,\s]/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

// Firestore allows 500 writes in a batch.
async function writeRecords(firestore: ReturnType<typeof useFirestore>, sellerId: string, upserts: SeasonRecord[], removals: string[], by: string) {
  const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [
    ...upserts.map(r => (b: ReturnType<typeof writeBatch>) => {
      b.set(doc(firestore, 'sellers', sellerId, 'seasonData', recordId(r.kind, r.start)), {
        kind: r.kind, start: r.start,
        ...(r.rounds !== undefined ? { rounds: r.rounds } : {}),
        ...(r.bevCartSales !== undefined ? { bevCartSales: r.bevCartSales } : {}),
        updatedAt: serverTimestamp(), updatedBy: by,
      });
    }),
    ...removals.map(id => (b: ReturnType<typeof writeBatch>) => b.delete(doc(firestore, 'sellers', sellerId, 'seasonData', id))),
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(firestore);
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
}

function MonthlyGrid({ sellerId, records, koop, defaultYear }: { sellerId: string; records: StoredRecord[]; koop: Map<string, unknown>; defaultYear: number }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [year, setYear] = useState(defaultYear);
  const [cells, setCells] = useState<Record<string, { sales: string; rounds: string }>>({});
  const [saving, setSaving] = useState(false);
  const rollRounds = useMemo(() => rollUpMonths(records, 'rounds'), [records]);
  const rollSales = useMemo(() => rollUpMonths(records, 'bevCartSales'), [records]);

  // Fill the boxes from the month records already saved for that year.
  useEffect(() => {
    const next: Record<string, { sales: string; rounds: string }> = {};
    for (let m = 1; m <= 12; m++) {
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const r = records.find(x => x.kind === 'month' && x.start === start);
      next[start] = { sales: r?.bevCartSales !== undefined ? String(r.bevCartSales) : '', rounds: r?.rounds !== undefined ? String(r.rounds) : '' };
    }
    setCells(next);
  }, [year, records]);

  const save = async () => {
    if (!firestore) return;
    const upserts: SeasonRecord[] = [];
    const removals: string[] = [];
    for (const [start, c] of Object.entries(cells)) {
      const sales = numberOrNull(c.sales);
      const rounds = numberOrNull(c.rounds);
      if (Number.isNaN(sales) || Number.isNaN(rounds)) { toast({ variant: 'destructive', title: 'Check the numbers', description: 'Sales and rounds must be plain numbers.' }); return; }
      const existing = records.find(x => x.kind === 'month' && x.start === start);
      if (sales === null && rounds === null) { if (existing) removals.push(existing.id); continue; }
      upserts.push({ kind: 'month', start, ...(rounds !== null ? { rounds } : {}), ...(sales !== null ? { bevCartSales: Math.round(sales * 100) / 100 } : {}) });
    }
    setSaving(true);
    try {
      await writeRecords(firestore, sellerId, upserts, removals, user?.email || user?.uid || '');
      toast({ title: 'Saved', description: `${upserts.length} month${upserts.length === 1 ? '' : 's'} saved for ${year}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: e?.message || 'Please try again.' });
    } finally { setSaving(false); }
  };

  const thisYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => thisYear + 1 - i);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Year</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-28 border-2 font-black text-xs bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={String(y)} className="font-black">{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border-2 border-slate-100 overflow-hidden">
        <div className="grid grid-cols-[6rem_1fr_1fr] gap-2 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Month</span><span>Bev cart sales ($)</span><span>Rounds</span>
        </div>
        {Array.from({ length: 12 }, (_, i) => {
          const start = `${year}-${String(i + 1).padStart(2, '0')}-01`;
          const key = start.slice(0, 7);
          const detail = rollRounds.get(key)?.used !== 'month' && rollRounds.get(key) ? rollRounds.get(key)!.used : rollSales.get(key)?.used !== 'month' && rollSales.get(key) ? rollSales.get(key)!.used : null;
          const suspect = !!(rollRounds.get(key)?.suspect || rollSales.get(key)?.suspect);
          const onKoop = koop.has(key);
          return (
            <div key={start} className="grid grid-cols-[6rem_1fr_1fr] gap-2 items-center px-3 py-1.5 border-t border-slate-100">
              <div>
                <p className="text-xs font-black uppercase text-[#213147]">{MONTH_NAMES[i].slice(0, 3)}</p>
                {detail && <p className="text-[8px] font-bold uppercase text-amber-700 leading-tight">{detail === 'day' ? 'Daily' : 'Weekly'} entries used{suspect ? ' - look incomplete' : ''}</p>}
                {onKoop && !detail && <p className="text-[8px] font-bold uppercase text-green-700 leading-tight">On Koop</p>}
              </div>
              <Input inputMode="decimal" aria-label={`${MONTH_NAMES[i]} ${year} Bev cart sales`} value={cells[start]?.sales ?? ''} onChange={(e) => setCells(c => ({ ...c, [start]: { ...c[start], sales: e.target.value } }))} placeholder="0.00" className="h-9 border-2 font-bold" />
              <Input inputMode="numeric" aria-label={`${MONTH_NAMES[i]} ${year} rounds`} value={cells[start]?.rounds ?? ''} onChange={(e) => setCells(c => ({ ...c, [start]: { ...c[start], rounds: e.target.value } }))} placeholder="0" className="h-9 border-2 font-bold" />
            </div>
          );
        })}
      </div>
      <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
        Sales are only needed for months before the venue was on Koop; months with Koop orders use Koop&apos;s own sales. Clearing both boxes for a month removes its monthly total.
      </p>
      <Button onClick={save} disabled={saving} className="h-10 font-black uppercase text-[10px] tracking-widest gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save monthly totals
      </Button>
    </div>
  );
}

function SingleEntry({ sellerId }: { sellerId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [kind, setKind] = useState<Exclude<SeasonKind, 'month'>>('day');
  const [date, setDate] = useState('');
  const [sales, setSales] = useState('');
  const [rounds, setRounds] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!firestore) return;
    const s = numberOrNull(sales);
    const r = numberOrNull(rounds);
    if (!isIsoDate(date)) { toast({ variant: 'destructive', title: 'Pick a date' }); return; }
    if (Number.isNaN(s) || Number.isNaN(r) || (s === null && r === null)) { toast({ variant: 'destructive', title: 'Add rounds, sales, or both', description: 'Use plain numbers.' }); return; }
    setSaving(true);
    try {
      await writeRecords(firestore, sellerId, [{ kind, start: date, ...(r !== null ? { rounds: r } : {}), ...(s !== null ? { bevCartSales: Math.round(s * 100) / 100 } : {}) }], [], user?.email || user?.uid || '');
      toast({ title: 'Saved', description: `${kind === 'day' ? 'Day' : 'Week starting'} ${date} saved.` });
      setSales(''); setRounds('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: e?.message || 'Please try again.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Period</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as 'day' | 'week')}>
          <SelectTrigger className="h-10 w-36 border-2 font-black text-xs bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day" className="font-black">One day</SelectItem>
            <SelectItem value="week" className="font-black">Week starting</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="season-date" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date</Label>
        <Input id="season-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-40 border-2 font-bold" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="season-sales" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Bev cart sales ($)</Label>
        <Input id="season-sales" inputMode="decimal" value={sales} onChange={(e) => setSales(e.target.value)} placeholder="optional" className="h-10 w-36 border-2 font-bold" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="season-rounds" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rounds</Label>
        <Input id="season-rounds" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} placeholder="optional" className="h-10 w-28 border-2 font-bold" />
      </div>
      <Button onClick={add} disabled={saving} className="h-10 font-black uppercase text-[10px] tracking-widest gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add
      </Button>
      <p className="basis-full text-[10px] font-medium text-muted-foreground leading-relaxed">
        Adding a date that is already saved replaces it. A week is the seven days starting on the date you pick.
      </p>
    </div>
  );
}

function CsvImport({ sellerId }: { sellerId: string }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseSeasonCsv(text) : null), [text]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
  };

  const run = async () => {
    if (!firestore || !parsed || parsed.records.length === 0) return;
    setSaving(true);
    try {
      await writeRecords(firestore, sellerId, parsed.records, [], user?.email || user?.uid || '');
      toast({ title: 'Imported', description: `${parsed.records.length} row${parsed.records.length === 1 ? '' : 's'} saved.` });
      setText('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not import', description: e?.message || 'Please try again.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
        Paste rows from a spreadsheet or choose a CSV file. Columns: <span className="font-black">Date, Bev Cart Sales, Rounds</span>. Name the first column <span className="font-black">Week starting</span> or <span className="font-black">Month</span> for weekly or monthly rows, or add a <span className="font-black">Type</span> column (day, week or month). Dollar signs and commas are fine. Rows for a date that is already saved replace it.
      </p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={'Date,Bev Cart Sales,Rounds\n2025-06-01,1250.50,118\n2025-06-02,980,104'} className="border-2 font-mono text-xs" />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 h-10 text-[10px] font-black uppercase tracking-widest text-[#213147] hover:bg-slate-50">
          <Upload className="h-4 w-4" /> Choose CSV file
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <Button onClick={run} disabled={saving || !parsed || parsed.records.length === 0} className="h-10 font-black uppercase text-[10px] tracking-widest gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Import {parsed && parsed.records.length > 0 ? `${parsed.records.length} row${parsed.records.length === 1 ? '' : 's'}` : ''}
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 && (
        <ul className="space-y-0.5 rounded-lg border-2 border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
          {parsed.errors.slice(0, 8).map(e => <li key={e}>{e}</li>)}
          {parsed.errors.length > 8 && <li>and {parsed.errors.length - 8} more. Rows with a problem are skipped.</li>}
        </ul>
      )}
    </div>
  );
}

function RecordList({ sellerId, records }: { sellerId: string; records: StoredRecord[] }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => records.slice().sort((a, b) => b.start.localeCompare(a.start) || a.kind.localeCompare(b.kind)), [records]);
  if (records.length === 0) return null;
  const remove = async (id: string) => {
    if (!firestore) return;
    try { await deleteDoc(doc(firestore, 'sellers', sellerId, 'seasonData', id)); }
    catch (e: any) { toast({ variant: 'destructive', title: 'Could not remove', description: e?.message || 'Please try again.' }); }
  };
  return (
    <div className="space-y-2 pt-2 border-t-2 border-slate-100">
      <button type="button" onClick={() => setOpen(v => !v)} className="text-[10px] font-black uppercase tracking-widest text-primary underline">
        {open ? 'Hide' : 'Show'} saved entries ({records.length})
      </button>
      {open && (
        <div className="max-h-64 overflow-y-auto rounded-xl border-2 border-slate-100">
          {sorted.map(r => (
            <div key={r.id} className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-2 px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-[#213147]">
              <span className="font-mono">{r.start}</span>
              <span className="uppercase text-[9px] text-muted-foreground">{r.kind === 'week' ? 'Week' : r.kind === 'month' ? 'Month' : 'Day'}</span>
              <span>{r.bevCartSales !== undefined ? usd(r.bevCartSales) : '-'} · {r.rounds !== undefined ? `${r.rounds} rounds` : '-'}</span>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${r.kind} ${r.start}`} onClick={() => remove(r.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
