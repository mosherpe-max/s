'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { MenuItem, ModifierGroup, ModifierOption, OrderItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Plus, Minus, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ModifierSelectorProps {
  item: MenuItem;
  onConfirm: (item: OrderItem) => void;
  onCancel: () => void;
}

export function ModifierSelector({ item, onConfirm, onCancel }: ModifierSelectorProps) {
  const firestore = useFirestore();
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, ModifierOption[]>>({});
  const [quantity, setQuantity] = useState(1);

  // Fetch all relevant modifier groups for this item
  const groupsQuery = useMemoFirebase(() => {
    if (!firestore || !item.modifierGroupIds?.length) return null;
    return query(
      collection(firestore, 'modifier_groups'),
      where('id', 'in', item.modifierGroupIds)
    );
  }, [firestore, item.modifierGroupIds]);

  const { data: groups, isLoading } = useCollection<ModifierGroup>(groupsQuery);

  const handleToggleOption = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedModifiers(prev => {
      const currentSelections = prev[group.id] || [];
      const isSelected = currentSelections.some(o => o.id === option.id);
      
      let nextSelections: ModifierOption[];
      
      if (isSelected) {
        nextSelections = currentSelections.filter(o => o.id !== option.id);
      } else {
        // Enforce max selection
        if (group.maxSelection === 1) {
          nextSelections = [option];
        } else if (currentSelections.length < group.maxSelection) {
          nextSelections = [...currentSelections, option];
        } else {
          return prev; // At capacity
        }
      }
      
      return { ...prev, [group.id]: nextSelections };
    });
  };

  const isGroupValid = (group: ModifierGroup) => {
    const selections = selectedModifiers[group.id] || [];
    return selections.length >= group.minSelection && selections.length <= group.maxSelection;
  };

  const isAllValid = useMemo(() => {
    if (!groups) return false;
    return groups.every(isGroupValid);
  }, [groups, selectedModifiers]);

  const totalPrice = useMemo(() => {
    const base = item.price;
    const mods = Object.values(selectedModifiers).flat().reduce((acc, m) => acc + m.priceAdjustment, 0);
    return (base + mods) * quantity;
  }, [item.price, selectedModifiers, quantity]);

  const handleConfirm = () => {
    if (!isAllValid) return;
    
    // Create a unique cart ID based on item and selections
    const modString = Object.values(selectedModifiers)
      .flat()
      .map(m => m.id)
      .sort()
      .join('-');
    const cartId = `${item.id}-${modString}`;

    onConfirm({
      ...item,
      quantity,
      cartId,
      selectedModifiers,
      price: item.price // Base price (modifiers summed in total logic elsewhere)
    } as OrderItem);
  };

  if (isLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fetching Customizations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-left">
      <ScrollArea className="flex-1">
        <div className="px-6 py-8 space-y-10 pb-32">
          {/* Header */}
          <div className="flex gap-4">
            <div className="relative h-20 w-20 rounded-2xl border-2 border-slate-100 overflow-hidden shrink-0 shadow-sm">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                  <Plus className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="font-headline font-black text-lg uppercase tracking-tight text-[#213147] leading-tight">
                {item.name}
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                ${item.price.toFixed(2)} base price
              </p>
            </div>
          </div>

          {/* Modifier Groups */}
          <div className="space-y-10">
            {groups?.map(group => {
              const isValid = isGroupValid(group);
              const selections = selectedModifiers[group.id] || [];
              
              return (
                <section key={group.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2 px-1">
                    <div className="space-y-0.5">
                      <h3 className="font-headline font-black text-xs uppercase tracking-widest text-[#213147]">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "text-[8px] font-black uppercase px-1.5 h-4 border-0",
                          group.minSelection > 0 ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                        )}>
                          {group.minSelection > 0 ? 'Required' : 'Optional'}
                        </Badge>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">
                          Select {group.minSelection === group.maxSelection ? group.minSelection : `${group.minSelection}-${group.maxSelection}`}
                        </p>
                      </div>
                    </div>
                    {isValid && <Check className="h-4 w-4 text-green-500" />}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {group.options.map(option => {
                      const isSelected = selections.some(o => o.id === option.id);
                      return (
                        <button
                          key={option.id}
                          disabled={!option.isAvailable}
                          onClick={() => handleToggleOption(group, option)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                            isSelected 
                              ? "bg-primary/5 border-primary shadow-sm" 
                              : (option.isAvailable ? "bg-white border-slate-100 hover:border-slate-200" : "bg-slate-50 border-transparent opacity-50 cursor-not-allowed")
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected ? "bg-primary border-primary" : "bg-white border-slate-200"
                            )}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-[11px] font-black uppercase text-[#213147]">
                              {option.name}
                              {!option.isAvailable && " (86'D)"}
                            </span>
                          </div>
                          {option.priceAdjustment > 0 && (
                            <span className="text-[10px] font-bold text-primary font-mono">
                              +${option.priceAdjustment.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Persistent Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t z-20">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl border-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-8 text-center font-black text-sm">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
             </div>
             <div className="text-right">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Price</p>
                <p className="text-xl font-black text-primary font-mono">${totalPrice.toFixed(2)}</p>
             </div>
          </div>

          <Button 
            size="lg" 
            disabled={!isAllValid}
            onClick={handleConfirm}
            className="w-full h-14 font-black uppercase tracking-[0.15em] text-xs shadow-xl gap-2"
          >
            {isAllValid ? 'Add to Order' : 'Make Selections'}
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
