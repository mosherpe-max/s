'use client';

import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCollection, useFirebaseApp, useFirestore, useMemoFirebase } from '@/firebase';
import type { StarterMenuItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Library, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StarterItemPickerProps {
  sellerId: string;
  venueType: 'golf' | 'bowling';
  mode: 'beverageCart' | 'clubhouse' | 'laneService';
  modeLabel: string;
  trigger: React.ReactNode;
  onImported?: () => void;
}

/**
 * Lets a Koop admin or venue admin cherry-pick specific items out of the
 * shared global library for one service mode, instead of dumping the whole
 * library in at once. Defaults to items whose template was authored for
 * this mode, but "Show All" lifts that so any item can go on any mode -
 * the live availableOn field on a venue's menu item was always multi-mode,
 * this just extends that flexibility to the import step itself.
 */
export function StarterItemPicker({ sellerId, venueType, mode, modeLabel, trigger, onImported }: StarterItemPickerProps) {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const libraryQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_menu_item_library') : null), [firestore]);
  const { data: library, isLoading } = useCollection<StarterMenuItem>(libraryQuery);

  const candidates = useMemo(() => {
    return (library || [])
      .filter(item => item.venueType?.includes(venueType))
      .filter(item => showAll || item.serviceMode === mode);
  }, [library, venueType, mode, showAll]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, StarterMenuItem[]>();
    candidates.forEach(item => {
      const list = byCategory.get(item.category) || [];
      list.push(item);
      byCategory.set(item.category, list);
    });
    return Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [candidates]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!firebaseApp || selected.size === 0) return;
    setIsImporting(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const func = httpsCallable(functions, 'applyStarterItems');
      const result = await func({ venueId: sellerId, itemIds: Array.from(selected), mode });
      const data = result.data as { totalCreated: number };
      toast({ title: 'Items Imported', description: `${data.totalCreated} item(s) added to ${modeLabel}.` });
      setSelected(new Set());
      setOpen(false);
      onImported?.();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Import Failed', description: e.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelected(new Set()); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeClassName="text-white hover:text-white/80" className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
        <DialogHeader className="p-8 bg-[#213147] text-white">
          <DialogTitle className="font-headline font-black uppercase text-xl flex items-center gap-2">
            <Library className="h-5 w-5" /> Import Items &mdash; {modeLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="p-8 pb-4 flex items-center justify-between">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            {selected.size} Selected
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Show All Modes</span>
            <Switch checked={showAll} onCheckedChange={setShowAll} />
          </label>
        </div>
        <ScrollArea className="max-h-[50vh] px-8">
          <div className="space-y-6 pb-6">
            {isLoading ? (
              <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-30" /></div>
            ) : grouped.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground uppercase text-[10px] font-black opacity-30">
                No matching library items for this market{showAll ? '' : ' and mode'}
              </p>
            ) : grouped.map(([category, items]) => (
              <div key={category} className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{category}</p>
                <div className="space-y-1">
                  {items.map(item => (
                    <label key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <Checkbox checked={selected.has(item.id!)} onCheckedChange={() => toggle(item.id!)} />
                      <span className="flex-1 text-[11px] font-bold uppercase">{item.name}</span>
                      <span className="text-[10px] font-mono font-black text-primary">${item.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-8 pt-4">
          <Button onClick={handleImport} disabled={isImporting || selected.size === 0} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
            {isImporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Library className="h-4 w-4" />}
            Import {selected.size > 0 ? `${selected.size} ` : ''}Item{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
