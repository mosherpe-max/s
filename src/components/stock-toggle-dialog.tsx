'use client';

import { collection, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { MenuItem } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface StockToggleDialogProps {
  sellerId: string;
  mode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Lets on-shift staff mark a menu item out of stock ("86 it") for their
 * specific service mode, and un-86 it, without full menu-editing rights.
 * Independent of the admin's global isAvailable switch - this only affects
 * the current mode, so the same item can be in stock on Clubhouse while 86'd
 * on Beverage Cart.
 */
export function StockToggleDialog({ sellerId, mode, open, onOpenChange }: StockToggleDialogProps) {
  const firestore = useFirestore();

  const menuItemsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null),
    [firestore, sellerId]
  );
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modeItems = (menuItems || [])
    .filter(i => i.availableOn?.includes(mode) && i.isAvailable !== false)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleToggle = (item: MenuItem, outOfStock: boolean) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
    updateDoc(itemRef, {
      outOfStockModes: outOfStock ? arrayUnion(mode) : arrayRemove(mode),
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: itemRef.path,
        operation: 'update',
        requestResourceData: { outOfStockModes: mode },
      } satisfies SecurityRuleContext));
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl flex flex-col max-h-[80vh]">
        <DialogHeader className="p-6 bg-[#213147] text-white shrink-0">
          <DialogTitle className="font-headline font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Ban className="h-5 w-5" /> 86 an Item
          </DialogTitle>
          <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em]">{mode} · Out of stock right now</p>
        </DialogHeader>
        <div className="overflow-y-auto p-4 space-y-2">
          {modeItems.length === 0 ? (
            <p className="text-center py-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">No items assigned to this mode.</p>
          ) : (
            modeItems.map(item => {
              const isOutOfStock = item.outOfStockModes?.includes(mode) ?? false;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                    isOutOfStock ? "bg-destructive/5 border-destructive/20" : "bg-slate-50 border-slate-100"
                  )}
                >
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-black uppercase text-[#213147] truncate">{item.name}</p>
                    <p className={cn("text-[8px] font-bold uppercase tracking-widest", isOutOfStock ? "text-destructive" : "text-green-600")}>
                      {isOutOfStock ? '86\'d - Out of Stock' : 'In Stock'}
                    </p>
                  </div>
                  <Switch
                    checked={isOutOfStock}
                    onCheckedChange={(val) => handleToggle(item, val)}
                    className="data-[state=checked]:bg-destructive shrink-0"
                  />
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
