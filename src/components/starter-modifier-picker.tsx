'use client';

import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCollection, useFirebaseApp, useFirestore, useMemoFirebase } from '@/firebase';
import type { StarterModifierGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tags, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface StarterModifierPickerProps {
  sellerId: string;
  venueType: 'golf' | 'bowling';
  trigger: React.ReactNode;
  onImported?: () => void;
}

/**
 * Lets a Koop admin or venue admin cherry-pick specific modifier group
 * templates out of the shared global library to copy into a venue, rather
 * than bulk-cloning every template that matches the venue's market.
 */
export function StarterModifierPicker({ sellerId, venueType, trigger, onImported }: StarterModifierPickerProps) {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const libraryQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_modifier_library') : null), [firestore]);
  const { data: library, isLoading } = useCollection<StarterModifierGroup>(libraryQuery);

  const candidates = useMemo(() => (
    (library || []).filter(mod => mod.venueType?.includes(venueType))
  ), [library, venueType]);

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
      const func = httpsCallable(functions, 'applyStarterMenu');
      const result = await func({ venueId: sellerId, modifierIds: Array.from(selected) });
      const data = result.data as { totalCreated: number };
      toast({ title: 'Modifiers Imported', description: `${data.totalCreated} modifier group(s) added.` });
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
      <DialogContent closeClassName="text-white hover:text-white/80" className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
        <DialogHeader className="p-8 bg-[#213147] text-white">
          <DialogTitle className="font-headline font-black uppercase text-xl flex items-center gap-2">
            <Tags className="h-5 w-5" /> Import Modifiers
          </DialogTitle>
        </DialogHeader>
        <p className="px-8 pt-6 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{selected.size} Selected</p>
        <ScrollArea className="max-h-[50vh] px-8">
          <div className="space-y-1 py-4">
            {isLoading ? (
              <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary opacity-30" /></div>
            ) : candidates.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground uppercase text-[10px] font-black opacity-30">No matching library modifiers for this market</p>
            ) : candidates.map(mod => (
              <label key={mod.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={selected.has(mod.id!)} onCheckedChange={() => toggle(mod.id!)} />
                <span className="flex-1 text-[11px] font-bold uppercase">{mod.name}</span>
                <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-0", mod.required ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500")}>
                  {mod.required ? 'Required' : 'Optional'} &middot; {mod.selectionType === 'single' ? 'Single' : 'Multi'}
                </Badge>
              </label>
            ))}
          </div>
        </ScrollArea>
        <div className="p-8 pt-4">
          <Button onClick={handleImport} disabled={isImporting || selected.size === 0} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
            {isImporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Tags className="h-4 w-4" />}
            Import {selected.size > 0 ? `${selected.size} ` : ''}Modifier{selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
