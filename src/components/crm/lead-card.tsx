'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { Download, Loader2, Pencil, Printer, Save, Trash2, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, LeadContact, LeadContactType } from '@/lib/types';
import { CONTACT_TYPES, LEAD_STAGES, POS_SUGGESTIONS, firstYearValue, latestDate } from '@/lib/crm';
import { leadFormSchema, leadFormToFields, leadToFormValues, type LeadFormValues } from '@/lib/crm-form';
import { US_STATES } from '@/lib/us-states';
import { buildLeadSheet, leadSheetFileName, renderLeadSheetPdf } from '@/lib/lead-sheet';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const todayKey = () => format(new Date(), 'yyyy-MM-dd');
const prettyDate = (key: string) => { try { return format(parseISO(key), 'EEE, MMM d, yyyy'); } catch { return key; } };
const labelClass = 'text-[9px] font-black uppercase';
const inputClass = 'h-11 border-2 font-bold';

function NumberField({ form, name, label, prefix, placeholder }: { form: ReturnType<typeof useForm<LeadFormValues>>; name: keyof LeadFormValues; label: string; prefix?: string; placeholder?: string }) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel className={labelClass}>{label}</FormLabel>
        <div className="relative">
          {prefix && <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{prefix}</span>}
          <FormControl>
            <Input {...field} value={field.value as string} inputMode="decimal" placeholder={placeholder} className={`${inputClass} ${prefix ? 'pl-7' : ''}`} />
          </FormControl>
        </div>
        <FormMessage className="text-[10px]" />
      </FormItem>
    )} />
  );
}

function YesNo({ form, name, label }: { form: ReturnType<typeof useForm<LeadFormValues>>; name: 'hasBevCart' | 'hasClubhouseKitchen'; label: string }) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className="flex items-center justify-between rounded-xl border-2 p-3 space-y-0">
        <FormLabel className="text-[10px] font-black uppercase cursor-pointer">{label}</FormLabel>
        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" /></FormControl>
      </FormItem>
    )} />
  );
}

// The record for one lead: key data, where they are in the funnel, and a dated log of every contact. Save writes the
// key data and funnel fields; contact log entries are saved as they are added.
export function LeadCard({ lead, open, onOpenChange, onSaved }: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (lead: Lead) => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tab, setTab] = useState('key');
  const [saving, setSaving] = useState(false);
  const form = useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema), defaultValues: leadToFormValues(lead) });

  // Opening a lead starts on Key Data. The form is refilled whenever a different lead (or a newly created one) is shown.
  useEffect(() => { if (open) setTab('key'); }, [open]);
  useEffect(() => {
    if (open) form.reset(leadToFormValues(lead));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  const venueType = form.watch('venueType');
  const launch = form.watch('launchFeeQuoted');
  const monthly = form.watch('monthlyFeeQuoted');
  const quotedValue = useMemo(() => {
    const l = launch.trim() === '' ? null : Number(launch);
    const m = monthly.trim() === '' ? null : Number(monthly);
    return firstYearValue({ launchFeeQuoted: Number.isNaN(l as number) ? null : l, monthlyFeeQuoted: Number.isNaN(m as number) ? null : m });
  }, [launch, monthly]);

  // If saving is refused, show the tab that holds the field to fix.
  const onInvalid = (errors: Record<string, unknown>) => {
    const funnelFields = ['stage', 'launchFeeQuoted', 'monthlyFeeQuoted'];
    setTab(Object.keys(errors).some(k => !funnelFields.includes(k)) ? 'key' : 'funnel');
  };

  const onSubmit = (values: LeadFormValues) => {
    if (!firestore) return;
    setSaving(true);
    const id = lead?.id || Math.random().toString(36).slice(2, 11);
    const fields = leadFormToFields(values);
    const stageChanged = !lead || lead.stage !== fields.stage;
    const payload = {
      ...fields,
      id,
      updatedAt: serverTimestamp(),
      createdAt: lead?.createdAt || serverTimestamp(),
      ...(stageChanged ? { stageChangedAt: serverTimestamp() } : {}),
      ...(lead ? {} : { lastContactDate: null, contactCount: 0 }),
    };
    setDoc(doc(firestore, 'leads', id), payload, { merge: true })
      .then(() => {
        toast({ title: lead ? 'Lead Saved' : 'Lead Created', description: 'You can log your first contact on the Sales Funnel tab.' });
        onSaved({ ...(lead || {}), ...(payload as unknown as Lead) });
        form.reset(values);
        if (!lead) setTab('funnel');
      })
      .catch(() => toast({ variant: 'destructive', title: 'Could Not Save', description: 'The lead was not saved. Please try again.' }))
      .finally(() => setSaving(false));
  };

  // ---- contact log ----
  const contactsQuery = useMemoFirebase(
    () => (firestore && lead?.id ? collection(firestore, 'leads', lead.id, 'contacts') : null),
    [firestore, lead?.id],
  );
  const { data: contacts, isLoading: contactsLoading } = useCollection<LeadContact>(contactsQuery);
  const sortedContacts = useMemo(
    () => [...(contacts || [])].sort((a, b) => (a.date === b.date ? (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0) : a.date < b.date ? 1 : -1)),
    [contacts],
  );

  const [entryDate, setEntryDate] = useState(todayKey());
  const [entryType, setEntryType] = useState<LeadContactType>('Call');
  const [entryNotes, setEntryNotes] = useState('');
  const [editingEntry, setEditingEntry] = useState<LeadContact | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);

  const resetEntry = () => { setEditingEntry(null); setEntryDate(todayKey()); setEntryType('Call'); setEntryNotes(''); };
  useEffect(() => { if (open) resetEntry(); }, [open, lead?.id]);

  // Writes a change to the log and keeps the lead's "last contact" and count in step, in one go.
  const commitContacts = async (apply: (batch: ReturnType<typeof writeBatch>, leadId: string) => void, nextDates: string[], successTitle: string) => {
    if (!firestore || !lead) return;
    setSavingEntry(true);
    try {
      const batch = writeBatch(firestore);
      apply(batch, lead.id);
      batch.update(doc(firestore, 'leads', lead.id), { lastContactDate: latestDate(nextDates), contactCount: nextDates.length, updatedAt: serverTimestamp() });
      await batch.commit();
      toast({ title: successTitle });
      resetEntry();
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Save', description: 'The contact log was not updated. Please try again.' });
    } finally {
      setSavingEntry(false);
    }
  };

  const saveEntry = () => {
    if (!firestore || !lead) return;
    if (!entryDate) { toast({ variant: 'destructive', title: 'Pick a date', description: 'Choose the day this contact happened.' }); return; }
    if (entryNotes.trim() === '') { toast({ variant: 'destructive', title: 'Add a note', description: 'Write what was discussed so you can pick it up later.' }); return; }
    const others = (contacts || []).filter(c => c.id !== editingEntry?.id).map(c => c.date);
    const id = editingEntry?.id || doc(collection(firestore, 'leads', lead.id, 'contacts')).id;
    const data = { id, date: entryDate, type: entryType, notes: entryNotes.trim(), createdAt: editingEntry?.createdAt || Timestamp.now() };
    commitContacts((batch, leadId) => batch.set(doc(firestore, 'leads', leadId, 'contacts', id), data), [...others, entryDate], editingEntry ? 'Entry Updated' : 'Contact Logged');
  };

  const deleteEntry = (entry: LeadContact) => {
    if (!firestore || !lead) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this contact entry? This cannot be undone.')) return;
    const others = (contacts || []).filter(c => c.id !== entry.id).map(c => c.date);
    commitContacts((batch, leadId) => batch.delete(doc(firestore, 'leads', leadId, 'contacts', entry.id)), others, 'Entry Deleted');
  };

  // ---- printable lead sheet: built from the saved lead and its contact log ----
  const [sheetBusy, setSheetBusy] = useState<'download' | 'print' | null>(null);
  const makeSheet = () => renderLeadSheetPdf(buildLeadSheet(lead!, contacts || [], todayKey()));
  const downloadSheet = async () => {
    if (!lead) return;
    setSheetBusy('download');
    try {
      const url = URL.createObjectURL(await makeSheet());
      const a = document.createElement('a');
      a.href = url; a.download = leadSheetFileName(lead, todayKey());
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: 'Lead Sheet Downloaded', description: `${lead.venueName} · ${(contacts || []).length} logged contact${(contacts || []).length === 1 ? '' : 's'}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Create Sheet', description: 'The lead sheet could not be made. Please try again.' });
    } finally {
      setSheetBusy(null);
    }
  };
  // Opens the sheet in a new tab, where the browser's viewer has a Print button (and Save as PDF).
  const printSheet = async () => {
    if (!lead) return;
    setSheetBusy('print');
    try {
      const url = URL.createObjectURL(await makeSheet());
      const win = window.open(url, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = url; a.download = leadSheetFileName(lead, todayKey());
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast({ title: 'Pop-up Blocked', description: 'The sheet was downloaded instead. Open it to print.' });
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Create Sheet', description: 'The lead sheet could not be made. Please try again.' });
    } finally {
      setSheetBusy(null);
    }
  };

  const startEdit = (entry: LeadContact) => { setEditingEntry(entry); setEntryDate(entry.date); setEntryType(entry.type); setEntryNotes(entry.notes); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeClassName="text-white hover:text-white/80" onOpenAutoFocus={(e) => { if (!lead) { e.preventDefault(); setTimeout(() => form.setFocus('venueName'), 0); } }} className="sm:max-w-[820px] max-h-[92dvh] flex flex-col gap-0 rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
        <DialogHeader className="shrink-0 p-6 bg-[#213147] text-white space-y-1">
          <DialogTitle className="font-headline font-black uppercase text-xl">{lead ? lead.venueName : 'New Lead'}</DialogTitle>
          {lead && <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{lead.venueType} · {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}</p>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex min-h-0 flex-1 flex-col">
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-6 mt-4 grid shrink-0 grid-cols-2 w-auto">
                <TabsTrigger value="key" className="text-[10px] font-black uppercase tracking-widest">Key Data</TabsTrigger>
                <TabsTrigger value="funnel" className="text-[10px] font-black uppercase tracking-widest">Sales Funnel</TabsTrigger>
              </TabsList>
              {/* A plain scrolling area: the header, tabs and Save bar stay put while the form scrolls between them. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="p-6 space-y-8">
                  <TabsContent value="key" forceMount className="mt-0 space-y-8 data-[state=inactive]:hidden">
                    <section className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Venue</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="venueType" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Venue Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="venueName" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Venue Name</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="streetAddress" render={({ field }) => (
                        <FormItem><FormLabel className={labelClass}>Street Address</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl></FormItem>
                      )} />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem className="col-span-2 sm:col-span-1"><FormLabel className={labelClass}>City</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="county" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>County</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>State</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                              <SelectContent>{US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="zip" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Zip</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="posSystem" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>POS System</FormLabel>
                          <FormControl><Input {...field} list="crm-pos-options" autoComplete="off" placeholder="Type or pick one, for example Square or Toast" className={inputClass} /></FormControl>
                          <datalist id="crm-pos-options">{POS_SUGGESTIONS[venueType].map(o => <option key={o} value={o} />)}</datalist>
                        </FormItem>
                      )} />
                    </section>

                    <section className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Contact</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="contactName" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Contact Name</FormLabel><FormControl><Input {...field} className={inputClass} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Phone</FormLabel><FormControl><Input {...field} type="tel" className={inputClass} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Email</FormLabel><FormControl><Input {...field} type="email" className={inputClass} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                        )} />
                      </div>
                    </section>

                    {venueType === 'Golf Course' ? (
                      <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Golf Details</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <NumberField form={form} name="holes" label="Number of Holes" placeholder="18" />
                          <NumberField form={form} name="rackRatePeak" label="Rack Rate, Peak Season" prefix="$" />
                          <NumberField form={form} name="roundsAnnually" label="Rounds per Year (optional)" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <YesNo form={form} name="hasBevCart" label="Has a Beverage Cart" />
                          <YesNo form={form} name="hasClubhouseKitchen" label="Has a Clubhouse Kitchen" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <NumberField form={form} name="bevCartCount" label="Carts on Course (not outings)" />
                          <NumberField form={form} name="bevCartOperators" label="Cart Operators" />
                          <NumberField form={form} name="bevCartRevenuePerRound" label="Bev Cart $ per Round" prefix="$" />
                        </div>
                      </section>
                    ) : (
                      <section className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Bowling Details</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <NumberField form={form} name="lanesCount" label="Number of Lanes" />
                        </div>
                      </section>
                    )}
                  </TabsContent>

                  <TabsContent value="funnel" forceMount className="mt-0 space-y-8 data-[state=inactive]:hidden">
                    <section className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Where They Are</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField control={form.control} name="stage" render={({ field }) => (
                          <FormItem><FormLabel className={labelClass}>Funnel Stage</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{LEAD_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <NumberField form={form} name="launchFeeQuoted" label="Launch Fee Quoted" prefix="$" />
                        <NumberField form={form} name="monthlyFeeQuoted" label="Monthly Fee Quoted" prefix="$" />
                      </div>
                      <div className="rounded-xl bg-slate-50 border-2 border-slate-100 p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Quoted first-year value</p>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Launch fee plus 12 months of the monthly fee</p>
                        </div>
                        <p className="font-mono font-black text-lg text-[#213147]">{quotedValue === null ? '—' : money(quotedValue)}</p>
                      </div>
                      {lead && form.formState.isDirty && <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Stage and fee changes are saved with the Save button below.</p>}
                    </section>

                    <section className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Contact Log</Label>
                      {!lead ? (
                        <p className="rounded-xl border-2 border-dashed p-4 text-[11px] font-bold uppercase text-muted-foreground text-center">Save the lead first, then log your calls, visits and meetings here.</p>
                      ) : (
                        <>
                          <div className="rounded-2xl border-2 p-4 space-y-3 bg-white">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor="entry-date" className={labelClass}>Date</Label>
                                <Input id="entry-date" type="date" value={entryDate} max={todayKey()} onChange={(e) => setEntryDate(e.target.value)} className={inputClass} />
                              </div>
                              <div className="space-y-1.5">
                                <Label className={labelClass}>Type</Label>
                                <Select value={entryType} onValueChange={(v) => setEntryType(v as LeadContactType)}>
                                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                  <SelectContent>{CONTACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="entry-notes" className={labelClass}>Notes from the meeting or discussion</Label>
                              <Textarea id="entry-notes" value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} rows={4} placeholder="Who you spoke with, what was said, what happens next…" className="border-2 font-medium" />
                            </div>
                            <div className="flex gap-2 justify-end">
                              {editingEntry && <Button type="button" variant="outline" onClick={resetEntry} className="h-10 border-2 font-black uppercase text-[10px] tracking-widest gap-1.5"><X className="h-3.5 w-3.5" /> Cancel</Button>}
                              <Button type="button" onClick={saveEntry} disabled={savingEntry} className="h-10 font-black uppercase text-[10px] tracking-widest gap-1.5">
                                {savingEntry ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {editingEntry ? 'Update Entry' : 'Add To Log'}
                              </Button>
                            </div>
                          </div>

                          {contactsLoading ? (
                            <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin text-primary inline" /></div>
                          ) : sortedContacts.length === 0 ? (
                            <p className="py-6 text-center text-[10px] font-black uppercase text-muted-foreground opacity-60">No contacts logged yet</p>
                          ) : (
                            <ul className="space-y-3">
                              {sortedContacts.map(c => (
                                <li key={c.id} className="rounded-2xl border-2 p-4 bg-slate-50/60 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] font-black uppercase text-[#213147]">{prettyDate(c.date)}</span>
                                      <Badge variant="outline" className="text-[8px] font-black uppercase bg-white">{c.type}</Badge>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit entry" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete entry" onClick={() => deleteEntry(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">{c.notes}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </section>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
            <div className="shrink-0 p-4 border-t bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" disabled={!lead || sheetBusy !== null} onClick={downloadSheet} title={lead ? 'Download a printable lead sheet (PDF)' : 'Save the lead first'}
                  className="h-10 border-2 font-black uppercase text-[10px] tracking-widest gap-1.5">
                  {sheetBusy === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download Sheet
                </Button>
                <Button type="button" variant="outline" disabled={!lead || sheetBusy !== null} onClick={printSheet} title={lead ? 'Open the lead sheet to print' : 'Save the lead first'}
                  className="h-10 border-2 font-black uppercase text-[10px] tracking-widest gap-1.5">
                  {sheetBusy === 'print' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print
                </Button>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  {Object.keys(form.formState.errors).length > 0 ? 'Fix the highlighted fields to save.' : lead && form.formState.isDirty ? 'The sheet uses the saved lead. Save first to include your edits.' : ''}
                </p>
              </div>
              <Button type="submit" disabled={saving} className="h-12 px-8 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />} {lead ? 'Save Lead' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
