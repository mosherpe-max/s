'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Image as LucideImage, Plus, X, Sparkles } from 'lucide-react';
import type { MenuItem, OrderItem } from '@/lib/types';

interface UpsellRailProps {
  upsellItemIds: string[];
  menuItems: MenuItem[];
  orderItems: OrderItem[];
  onAdd: (item: OrderItem) => void;
}

/**
 * Compact "quick add" prompts shown on the Review screen, right after the
 * order summary and before tip. Each card disappears the moment the patron
 * acts on it (add or dismiss) - there's no persistence across visits, this
 * is a one-shot nudge per checkout, not a recurring banner.
 */
export function UpsellRail({ upsellItemIds, menuItems, orderItems, onAdd }: UpsellRailProps) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set());

  const upsellItems = upsellItemIds
    .filter((id, index, arr) => arr.indexOf(id) === index)
    .map(id => menuItems.find(m => m.id === id))
    .filter((item): item is MenuItem => !!item && item.isAvailable !== false && !handledIds.has(item.id));

  if (upsellItems.length === 0) return null;

  const handleAdd = (item: MenuItem) => {
    const existing = orderItems.find(i => i.cartId === item.id);
    onAdd({ ...item, quantity: (existing?.quantity || 0) + 1, cartId: item.id } as OrderItem);
    setHandledIds(prev => new Set(prev).add(item.id));
  };

  const handleDismiss = (itemId: string) => {
    setHandledIds(prev => new Set(prev).add(itemId));
  };

  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-1.5 px-1">
        <Sparkles className="h-3 w-3" /> Add to Your Order?
      </h3>
      <div className="space-y-2">
        {upsellItems.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-xl border-2 border-slate-100 shadow-sm flex items-center gap-2.5 p-2 pr-2.5"
          >
            <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-muted shrink-0">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <LucideImage className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-[11px] leading-tight text-[#213147] uppercase tracking-tight truncate">
                {item.name}
              </p>
              <span className="font-mono text-[10px] font-black text-primary">${item.price.toFixed(2)}</span>
            </div>

            <button
              onClick={() => handleDismiss(item.id)}
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 active:scale-95 transition-all"
              aria-label="No thanks"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleAdd(item)}
              className="h-8 px-3 shrink-0 rounded-lg bg-primary text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
