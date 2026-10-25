'use client';

import { useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, Plus, Search, Target } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeadCard } from '@/components/crm/lead-card';
import type { Lead, LeadStage } from '@/lib/types';
import { LEAD_STAGES, OPEN_STAGES, daysSince, filterLeads, firstYearValue, sortLeads, summarizePipeline, type LeadSort } from '@/lib/crm';
import { cn } from '@/lib/utils';

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const todayKey = () => format(new Date(), 'yyyy-MM-dd');

const STAGE_STYLE: Record<LeadStage, string> = {
  'Cold Lead': 'bg-slate-100 text-slate-700 border-slate-200',
  'On-Site Meeting': 'bg-sky-50 text-sky-800 border-sky-200',
  'Demo': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Offer': 'bg-amber-50 text-amber-800 border-amber-200',
  'Closed': 'bg-green-50 text-green-800 border-green-200',
  'Dead': 'bg-red-50 text-red-700 border-red-200',
};

const SORTS: { id: LeadSort; label: string }[] = [
  { id: 'updated', label: 'Recently Updated' },
  { id: 'quiet', label: 'Longest Since Contact' },
  { id: 'name', label: 'Venue (A–Z)' },
];

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="border-2 shadow-sm bg-white p-4 text-left">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-black text-[#213147] mt-1 font-mono">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{note}</p>
    </Card>
  );
}

// Koop admin Sales CRM: every lead, where each one is in the funnel, what was quoted and when each was last
// contacted. Open a lead for its key data card, funnel details and the dated log of every contact.
export default function AdminSalesCRMPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [term, setTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<Lead['venueType'] | 'All'>('All');
  const [sort, setSort] = useState<LeadSort>('updated');
  const [cardOpen, setCardOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A lead just created is shown from here until it arrives in the live list.
  const [justSaved, setJustSaved] = useState<Lead | null>(null);

  const leadsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'leads') : null), [firestore]);
  const { data: leads, isLoading } = useCollection<Lead>(leadsQuery);
  const all = useMemo(() => leads || [], [leads]);

  const openLead = selectedId ? (all.find(l => l.id === selectedId) || (justSaved?.id === selectedId ? justSaved : null)) : null;
  const today = todayKey();

  const summary = useMemo(() => summarizePipeline(all), [all]);
  const rows = useMemo(
    () => sortLeads(filterLeads(all, { term, stage: stageFilter, type: typeFilter }), sort),
    [all, term, stageFilter, typeFilter, sort],
  );

  const changeStage = (lead: Lead, stage: LeadStage) => {
    if (!firestore || stage === lead.stage) return;
    updateDoc(doc(firestore, 'leads', lead.id), { stage, stageChangedAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .then(() => toast({ title: 'Stage Updated', description: `${lead.venueName} is now ${stage}.` }))
      .catch(() => toast({ variant: 'destructive', title: 'Could Not Update', description: 'The stage was not changed. Please try again.' }));
  };

  const openCard = (id: string | null) => { setSelectedId(id); setCardOpen(true); };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-left">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Target className="h-6 w-6 text-primary" /></div>
            <div>
              <h2 className="text-2xl font-black uppercase text-[#213147]">Sales CRM</h2>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Founder-led pipeline · open a lead for its key data, funnel and contact log</p>
            </div>
          </div>
          <Button onClick={() => openCard(null)} className="bg-primary uppercase font-black text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> New Lead</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Open leads" value={String(summary.open.count)} note="Cold lead through offer" />
          <Tile label="Open pipeline" value={money(summary.open.value)} note="Quoted first-year value" />
          <Tile label="Closed" value={String(summary.closed.count)} note={`${money(summary.closed.value)} quoted first year`} />
          <Tile label="Dead" value={String(summary.byStage.Dead.count)} note="Not pursuing" />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
          {(['All', ...LEAD_STAGES] as const).map(s => {
            const count = s === 'All' ? all.length : summary.byStage[s].count;
            const active = stageFilter === s;
            return (
              <Button key={s} type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} onClick={() => setStageFilter(s)}
                className="h-8 rounded-full border-2 text-[10px] font-black uppercase tracking-widest gap-1.5">
                {s} <span className={cn('rounded-full px-1.5 text-[9px]', active ? 'bg-white/25' : 'bg-slate-100')}>{count}</span>
              </Button>
            );
          })}
        </div>

        <Card className="border-2 shadow-sm bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search leads" placeholder="Search venue, city, county, contact, phone or email" value={term} onChange={(e) => setTerm(e.target.value)} className="pl-10 h-10 border-2 rounded-xl" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as Lead['venueType'] | 'All')}>
              <SelectTrigger aria-label="Venue type" className="h-10 w-44 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All venue types</SelectItem>
                <SelectItem value="Golf Course">Golf courses</SelectItem>
                <SelectItem value="Bowling Center">Bowling centers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as LeadSort)}>
              <SelectTrigger aria-label="Sort leads" className="h-10 w-52 border-2 font-black uppercase text-[10px] tracking-widest bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{SORTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </Card>

        <div className="border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Venue</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Contact</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Stage</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Quoted</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Last Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-24 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary inline" /></TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-24 text-center text-muted-foreground uppercase text-[10px] font-black opacity-50">
                    {all.length === 0 ? 'No leads yet. Add your first lead to start the pipeline.' : 'No leads match these filters'}
                  </TableCell></TableRow>
                ) : rows.map(lead => {
                  const value = firstYearValue(lead);
                  const since = daysSince(lead.lastContactDate, today);
                  return (
                    <TableRow key={lead.id} onClick={() => openCard(lead.id)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
                      <TableCell className="px-8 py-4">
                        <p className="font-black text-sm">{lead.venueName}</p>
                        <p className="text-[9px] uppercase text-muted-foreground">
                          {lead.venueType === 'Golf Course' ? 'Golf' : 'Bowling'}{(lead.city || lead.county) ? ' · ' : ''}{[lead.city, lead.county && `${lead.county} Co.`].filter(Boolean).join(', ')}{lead.posSystem ? ` · POS: ${lead.posSystem}` : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-xs">{lead.contactName || '—'}</p>
                        <p className="text-[9px] text-muted-foreground">{lead.phone || lead.email || ''}</p>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select value={lead.stage} onValueChange={(v) => changeStage(lead, v as LeadStage)}>
                          <SelectTrigger aria-label={`Stage for ${lead.venueName}`} className={cn('h-8 w-40 border text-[10px] font-black uppercase tracking-wide', STAGE_STYLE[lead.stage])}><SelectValue /></SelectTrigger>
                          <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {value === null ? <span className="text-xs text-muted-foreground">Not quoted</span> : (
                          <>
                            <p className="font-mono font-black text-sm">{money(value)}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">{lead.launchFeeQuoted != null ? `${money(lead.launchFeeQuoted)} launch` : 'no launch fee'} · {lead.monthlyFeeQuoted != null ? `${money(lead.monthlyFeeQuoted)}/mo` : 'no monthly'}</p>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="px-8 whitespace-nowrap">
                        {lead.lastContactDate ? (
                          <>
                            <p className="text-xs font-bold">{format(new Date(`${lead.lastContactDate}T12:00:00`), 'MMM d, yyyy')}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">
                              {since === 0 ? 'Today' : `${since} day${since === 1 ? '' : 's'} ago`}{OPEN_STAGES.includes(lead.stage) && since !== null && since >= 14 ? ' · follow up' : ''}
                            </p>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[8px] font-black uppercase">Not contacted</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <LeadCard
        lead={openLead}
        open={cardOpen}
        onOpenChange={setCardOpen}
        onSaved={(saved) => { setJustSaved(saved); setSelectedId(saved.id); }}
      />
    </div>
  );
}
