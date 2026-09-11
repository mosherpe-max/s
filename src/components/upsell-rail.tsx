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
 * Fixed (non-scrolling) band on the Review screen, between the order item
 * list and the tip/checkout footer - deliberately NOT inside the scrollable
 * item list, so it stays visible regardless of how long the order is.
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
    <div className="shrink-0 bg-white border-t-2 border-b-2 border-slate-100 px-4 py-2.5 animate-in fade-in duration-300">
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

      <div className={cn("grid gap-2", upsellItems.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {upsellItems.map(item => (
          <div key={item.id} className="bg-slate-50/50 rounded-xl border-2 border-slate-100 overflow-hidden flex flex-col">
            <div className="relative h-14 w-full bg-muted shrink-0">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <LucideImage className="w-4 h-4" />
                </div>
              )}
              <div className="absolute top-1 left-1 bg-[#213147] px-1.5 py-0.5 rounded-md shadow-sm">
                <span className="font-mono text-[9px] font-black text-white leading-none">${item.price.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-1.5 flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase text-[#213147] leading-tight truncate">{item.name}</p>
              <button
                onClick={() => handleAdd(item)}
                className="w-full h-6 rounded-md bg-primary text-white font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
