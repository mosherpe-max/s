'use client';

import { useMemo, useRef, useState } from 'react';
import { arrayUnion, collection, doc, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';
import { categories, type ModifierGroup, type Seller, type StarterModifierGroup } from '@/lib/types';
import {
  buildPlan, parseGroupsCsv, parseItemsCsv, slugify,
  type ImportOptions, type PlannedItem,
} from '@/lib/menu-import';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const BATCH_LIMIT = 400;
const CATEGORY_CHOICES = categories.filter(c => c !== 'Featured');

const STATUS: Record<PlannedItem['action'], { label: string; className: string }> = {
  create: { label: 'New', className: 'bg-green-100 text-green-700' },
  update: { label: 'Update', className: 'bg-blue-100 text-blue-700' },
  skip: { label: 'Already there', className: 'bg-slate-100 text-slate-500' },
  error: { label: 'Fix', className: 'bg-red-100 text-red-700' },
};

function FileOrPaste({ id, label, hint, value, onChange, template, rows }: {
  id: string; label: string; hint: string; value: string; onChange: (v: string) => void; template: string; rows: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const load = async (file?: File) => {
    if (!file) return;
    onChange(await file.text());
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-[#213147]">{label}</Label>
        <div className="flex items-center gap-2">
          <a href={template} download className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:underline">
            <Download className="h-3 w-3" /> Template
          </a>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="sr-only" aria-label={`${label} file`} onChange={(e) => load(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="h-8 border-2 text-[9px] font-black uppercase tracking-widest gap-1.5">
            <Upload className="h-3 w-3" /> Choose File
          </Button>
        </div>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        placeholder="Choose a CSV file, or paste rows copied from a spreadsheet (include the heading row)."
        className="border-2 font-mono text-[11px] leading-snug"
      />
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

/**
 * Koop admin / venue admin: load a venue's whole menu from a spreadsheet. An items file (name, price, category,
 * optional service modes and modifier groups) plus an optional modifier file; shown as a preview of exactly what
 * would be created, updated or skipped before anything is written.
 */
export function MenuCsvImport({ sellerId, trigger }: { sellerId: string; trigger: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'input' | 'preview'>('input');
  const [itemsText, setItemsText] = useState('');
  const [groupsText, setGroupsText] = useState('');
  const [existingPolicy, setExistingPolicy] = useState<'skip' | 'update'>('skip');
  const [defaultModes, setDefaultModes] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore && open ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId, open]);
  const { data: seller } = useDoc<Seller>(sellerRef);
  const itemsQuery = useMemoFirebase(() => (firestore && open ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, open]);
  const { data: existingItems, isLoading: itemsLoading } = useCollection<{ name: string }>(itemsQuery);
  const groupsQuery = useMemoFirebase(() => (firestore && open ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, open]);
  const { data: existingGroups, isLoading: groupsLoading } = useCollection<ModifierGroup>(groupsQuery);
  const libraryQuery = useMemoFirebase(() => (firestore && open ? collection(firestore, 'starter_modifier_library') : null), [firestore, open]);
  const { data: library } = useCollection<StarterModifierGroup>(libraryQuery);

  const parsedItems = useMemo(() => parseItemsCsv(itemsText), [itemsText]);
  const parsedGroups = useMemo(() => parseGroupsCsv(groupsText), [groupsText]);
  const fileProblems = [...parsedItems.fileProblems, ...parsedGroups.fileProblems];

  const plan = useMemo(() => {
    const opts: ImportOptions = { venueId: sellerId, existingPolicy, defaultModes, categoryMap };
    return buildPlan(
      parsedItems.rows,
      parsedGroups.rows,
      (existingItems || []).map(i => ({ id: i.id, name: i.name })),
      (existingGroups || []).map(g => ({ id: g.id, name: g.name })),
      (library || []).map(g => ({ name: g.name, required: g.required, selectionType: g.selectionType, options: g.options })),
      opts,
    );
  }, [parsedItems.rows, parsedGroups.rows, existingItems, existingGroups, library, sellerId, existingPolicy, defaultModes, categoryMap]);

  const writable = plan.items.filter(i => i.action === 'create' || i.action === 'update');
  const canPreview = !!itemsText.trim() && fileProblems.length === 0 && parsedItems.rows.length > 0 && !itemsLoading && !groupsLoading;
  const canImport = writable.length > 0 || plan.groups.length > 0;

  const reset = () => {
    setPhase('input'); setItemsText(''); setGroupsText(''); setExistingPolicy('skip');
    setDefaultModes([]); setCategoryMap({}); setIsImporting(false);
  };

  const toggleMode = (mode: string) =>
    setDefaultModes(prev => (prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]));

  const handleImport = async () => {
    if (!firestore || !canImport) return;
    setIsImporting(true);
    try {
      const itemsCol = collection(firestore, 'sellers', sellerId, 'menuItems');
      const usedIds = new Set((existingItems || []).map(i => i.id));
      let rank = (existingItems || []).length;

      type Op = (b: ReturnType<typeof writeBatch>) => void;
      const ops: Op[] = [];

      plan.groups.forEach(g => {
        ops.push(b => b.set(doc(firestore, 'modifier_groups', g.id), {
          id: g.id,
          sellerId,
          name: g.name,
          minSelection: g.minSelection,
          maxSelection: g.maxSelection,
          options: g.options,
          ...(g.action === 'create' ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        }, { merge: true }));
      });

      const categoriesByMode = new Map<string, Set<string>>();
      writable.forEach(item => {
        item.modes.forEach(m => {
          const set = categoriesByMode.get(m) || new Set<string>();
          set.add(item.category!);
          categoriesByMode.set(m, set);
        });

        if (item.action === 'update') {
          ops.push(b => b.update(doc(itemsCol, item.existingId!), {
            price: item.price,
            category: item.category,
            ...(item.description ? { description: item.description } : {}),
            ...(item.groupIds ? { modifierGroupIds: item.groupIds } : {}),
            ...(item.modes.length ? { availableOn: arrayUnion(...item.modes) } : {}),
            updatedAt: serverTimestamp(),
          }));
          return;
        }

        let id = `${sellerId}-${slugify(item.name) || 'item'}`;
        for (let n = 2; usedIds.has(id); n++) id = `${sellerId}-${slugify(item.name) || 'item'}-${n}`;
        usedIds.add(id);
        const itemRank = rank++;
        ops.push(b => b.set(doc(itemsCol, id), {
          id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          isAvailable: true,
          imageUrl: '',
          rank: itemRank,
          availableOn: item.modes,
          featuredOn: [],
          upsellEligible: [],
          modifierGroupIds: item.groupIds || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));
      });

      // A mode that keeps an explicit list of visible categories would hide a newly imported item's
      // category; a mode with no list shows everything, so it needs nothing.
      const visibilityUpdates: Record<string, unknown> = {};
      categoriesByMode.forEach((cats, mode) => {
        const current = seller?.categoryVisibility?.[mode];
        const missing = current ? Array.from(cats).filter(c => !current.includes(c)) : [];
        if (missing.length) visibilityUpdates[`categoryVisibility.${mode}`] = arrayUnion(...missing);
      });
      if (Object.keys(visibilityUpdates).length) {
        ops.push(b => b.update(doc(firestore, 'sellers', sellerId), { ...visibilityUpdates, updatedAt: serverTimestamp() }));
      }

      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(firestore);
        ops.slice(i, i + BATCH_LIMIT).forEach(op => op(batch));
        await batch.commit();
      }

      const parts = [
        plan.counts.create ? `${plan.counts.create} item${plan.counts.create === 1 ? '' : 's'} added` : '',
        plan.counts.update ? `${plan.counts.update} updated` : '',
        plan.groups.length ? `${plan.groups.length} modifier group${plan.groups.length === 1 ? '' : 's'} saved` : '',
      ].filter(Boolean);
      toast({ title: 'Menu Imported', description: parts.join(', ') + '.' });
      setOpen(false);
      reset();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Import Stopped',
        description: `${e?.message || 'Please try again.'} Anything already saved is kept; run the same file again to finish (items already added are skipped).`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const errorRows = plan.items.filter(i => i.action === 'error');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        closeClassName="text-white hover:text-white/80"
        className="sm:max-w-[760px] max-h-[92dvh] flex flex-col gap-0 rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"
      >
        <DialogHeader className="p-6 sm:p-8 bg-[#213147] text-white text-left shrink-0">
          <DialogTitle className="font-headline font-black uppercase text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Import Menu From Spreadsheet
          </DialogTitle>
          <DialogDescription className="text-white/70 text-[11px] font-semibold">
            {phase === 'input'
              ? 'Load the items, and optionally the modifier groups, then review before anything is saved.'
              : 'Review what will happen. Nothing is saved until you press Import.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {phase === 'input' ? (
            <>
              <FileOrPaste
                id="menu-items-csv"
                label="1. Menu items"
                template="/menu_upload_template.csv"
                rows={8}
                value={itemsText}
                onChange={setItemsText}
                hint="Columns: Name, Price, Category (required); Description, Modes, Modifier Groups (optional). Separate several modes or modifier groups with | ."
              />
              <FileOrPaste
                id="menu-groups-csv"
                label="2. Modifier groups (optional)"
                template="/modifier_groups_upload_template.csv"
                rows={6}
                value={groupsText}
                onChange={setGroupsText}
                hint="One row per option. Columns: Group, Selection (Single/Multiple), Required (Yes/No), Option, Price Change. Leave Group blank to add another option to the group above. Groups already on this venue, or in the Koop starter library, can be named in the items file without listing them here."
              />
              {fileProblems.map(p => (
                <p key={p} className="text-[11px] font-bold text-red-600 flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {p}</p>
              ))}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([['create', 'New items'], ['update', 'Updates'], ['skip', 'Already there'], ['error', 'Need a fix']] as const).map(([k, label]) => (
                  <div key={k} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                    <p className={cn('text-2xl font-black', k === 'error' && plan.counts.error > 0 ? 'text-red-600' : 'text-[#213147]')}>{plan.counts[k]}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {plan.unknownCategories.length > 0 && (
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Some categories aren&apos;t ones we use. Pick where each goes.</p>
                  {plan.unknownCategories.map(raw => {
                    const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase text-[#213147] min-w-[7rem] truncate">&ldquo;{raw}&rdquo;</span>
                        <Select value={categoryMap[key] || ''} onValueChange={(v) => setCategoryMap(prev => ({ ...prev, [key]: v }))}>
                          <SelectTrigger className="h-10 border-2 font-bold bg-white" aria-label={`Category for ${raw}`}><SelectValue placeholder="Choose a category" /></SelectTrigger>
                          <SelectContent>
                            {CATEGORY_CHOICES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">If an item is already on the menu</p>
                  <RadioGroup value={existingPolicy} onValueChange={(v) => setExistingPolicy(v as 'skip' | 'update')} className="gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><RadioGroupItem value="skip" /> Leave it alone</label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><RadioGroupItem value="update" /> Update it from this file</label>
                  </RadioGroup>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground leading-relaxed">Updating changes price and category, and fills in description, modes and modifiers only where the file has them. Photos and order are kept.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Put rows with no Modes on</p>
                  <div className="space-y-2">
                    {AUTHORIZED_SERVICE_MODES.map(mode => (
                      <label key={mode} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <Checkbox checked={defaultModes.includes(mode)} onCheckedChange={() => toggleMode(mode)} /> {mode}
                      </label>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground leading-relaxed">Nothing ticked adds items to the catalog only; they aren&apos;t orderable until placed on a mode.</p>
                </div>
              </div>

              {plan.groups.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Modifier groups to save ({plan.groups.length})</p>
                  <div className="space-y-1">
                    {plan.groups.map(g => (
                      <div key={g.id} className="rounded-lg border bg-white p-2.5 text-[11px]">
                        <p className="font-black uppercase text-[#213147]">
                          {g.name}
                          <span className="ml-2 text-[9px] font-bold text-muted-foreground">
                            {g.maxSelection === 1 ? 'pick one' : 'pick any'}{g.minSelection > 0 ? ', required' : ''}
                            {g.source === 'library' ? ' · from Koop library' : g.action === 'update' ? ' · replaces existing' : ''}
                          </span>
                        </p>
                        <p className="text-muted-foreground">{g.options.map(o => o.priceAdjustment ? `${o.name} (${o.priceAdjustment > 0 ? '+' : ''}${o.priceAdjustment.toFixed(2)})` : o.name).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {plan.groupProblems.map(p => (
                <p key={p} className="text-[11px] font-bold text-red-600 flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> {p}</p>
              ))}

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Items ({plan.items.length})</p>
                <div className="rounded-xl border-2 overflow-hidden divide-y">
                  {plan.items.map(item => (
                    <div key={item.line} className={cn('p-2.5 text-[11px] flex flex-col gap-1', item.action === 'error' && 'bg-red-50/60')}>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[8px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 shrink-0', STATUS[item.action].className)}>{STATUS[item.action].label}</span>
                        <span className="font-black uppercase text-[#213147] truncate flex-1">{item.name || '(no name)'}</span>
                        {item.action !== 'error' && <span className="font-mono font-black text-primary shrink-0">${item.price.toFixed(2)}</span>}
                        <span className="text-[9px] font-bold text-muted-foreground shrink-0">line {item.line}</span>
                      </div>
                      {item.action !== 'error' ? (
                        <p className="text-muted-foreground">
                          {item.category}
                          {item.modes.length > 0 && ` · ${item.modes.join(', ')}`}
                          {item.groupNames.length > 0 && ` · ${item.groupNames.join(', ')}`}
                        </p>
                      ) : (
                        item.errors.map(e => <p key={e} className="text-red-600 font-semibold flex items-start gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" /> {e}</p>)
                      )}
                    </div>
                  ))}
                </div>
                {errorRows.length > 0 && (
                  <p className="text-[10px] font-bold text-red-600">Rows marked Fix are left out. Correct them in your file and import again; items already added are skipped, so it is safe to re-run.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-t bg-white p-4 sm:p-6 flex items-center gap-3">
          {phase === 'input' ? (
            <Button onClick={() => setPhase('preview')} disabled={!canPreview} className="w-full h-12 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 rounded-2xl">
              {itemsLoading || groupsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Preview Import
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPhase('input')} disabled={isImporting} className="h-12 border-2 font-black uppercase tracking-widest text-[10px] gap-2 rounded-2xl">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleImport} disabled={!canImport || isImporting} className="flex-1 h-12 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 rounded-2xl">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import {writable.length} Item{writable.length === 1 ? '' : 's'}{plan.groups.length > 0 ? ` + ${plan.groups.length} Group${plan.groups.length === 1 ? '' : 's'}` : ''}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
