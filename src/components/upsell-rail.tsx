'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Image as LucideImage, Plus, X, Sparkles } from 'lucide-react';
import type { MenuItem, OrderItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UpsellRailProps {
  upsellItemIds: string[];
  menuItems: MenuItem[];
  orderItems: OrderItem[];
  onAdd: (item: OrderItem) => void;
}

/**
 * Rendered inside the Review screen's scrollable content, directly below
 * the order item list - a natural next section the patron scrolls past,
 * rather than a fixed band competing with the tip/checkout footer for
 * screen space on every visit.
 * "No Thanks" dismisses both picks at once; adding one still leaves the
 * other offered. No persistence across visits - a one-shot nudge.
 */
export function UpsellRail({ upsellItemIds, menuItems, orderItems, onAdd }: UpsellRailProps) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [dismissedAll, setDismissedAll] = useState(false);

  const upsellItems = upsellItemIds
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .map(id => menuItems.find(m => m.id === id))
    .filter((item): item is MenuItem => !!item && item.isAvailable !== false && !addedIds.has(item.id));

  if (dismissedAll || upsellItems.length === 0) return null;

  const handleAdd = (item: MenuItem) => {
    const existing = orderItems.find(i => i.cartId === item.id);
    onAdd({ ...item, quantity: (existing?.quantity || 0) + 1, cartId: item.id } as OrderItem);
    setAddedIds(prev => new Set(prev).add(item.id));
  };

  return (
    <div className="bg-white border-t-2 border-slate-100 py-2.5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Add to Your Order?
        </h3>
        <button
          onClick={() => setDismissedAll(true)}
          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-1 active:scale-95 transition-all"
        >
          No Thanks <X className="h-3 w-3" />
        </button>
      </div>

      <div className={cn("grid gap-3", upsellItems.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {upsellItems.map(item => (
          <div key={item.id} className="bg-white rounded-[1.25rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="relative aspect-square w-full bg-muted shrink-0 border-b-2 border-slate-100 overflow-hidden">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <LucideImage className="w-8 h-8" />
                </div>
              )}
              <div className="absolute top-2 left-2 bg-[#213147] px-2.5 py-1 rounded-lg shadow-md z-10">
                <span className="font-mono text-[12px] font-black text-white leading-none">${item.price.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-3 flex flex-col flex-1 gap-2">
              <p className="font-black text-[12px] leading-tight text-[#213147] uppercase tracking-tight truncate">{item.name}</p>
              <button
                onClick={() => handleAdd(item)}
                className="w-full h-10 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.97] transition-transform mt-auto"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
