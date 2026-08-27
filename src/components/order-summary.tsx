'use client';

import type { OrderItem } from '@/lib/types';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateItem?: (item: OrderItem) => void;
  onRemoveItem?: (cartId: string) => void;
}

/**
 * Responsive order summary optimized for horizontal mobile visibility.
 * Prevents text overflow and maintains interactive targets on narrow screens.
 */
export function OrderSummary({ 
  items, 
  onUpdateItem,
  onRemoveItem
}: OrderSummaryProps) {
  const handleQuantityChange = (item: OrderItem, delta: number) => {
    if (!onUpdateItem || !onRemoveItem) return;
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      onRemoveItem(item.cartId);
    } else {
      onUpdateItem({ ...item, quantity: newQuantity });
    }
  };

  if (items.length === 0) {
    return <p className="text-muted-foreground text-center py-8 font-bold uppercase text-[10px] tracking-widest">Your cart is empty.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">YOUR ORDER</h3>
      <div className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden divide-y">
        {items.map(item => {
          const modifierList = item.selectedModifiers ? 
            Object.values(item.selectedModifiers).flat().map(m => m.name).join(' · ') : '';
          
          const unitPriceWithMods = item.price + (item.selectedModifiers ? 
            Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.priceAdjustment, 0) : 0);

          return (
            <div key={item.cartId} className="p-3 sm:p-4 flex items-center gap-3 bg-white hover:bg-muted/5 transition-colors">
              {/* Quantity Indicator */}
              <div className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#213147] text-white shrink-0">
                <span className="font-black text-sm sm:text-base">{item.quantity}</span>
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-[#213147] text-[11px] sm:text-xs leading-tight truncate uppercase tracking-tight">{item.name}</p>
                {(modifierList || item.description) && (
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground font-bold truncate mt-0.5 uppercase tracking-tighter">
                    {modifierList || item.description}
                  </p>
                )}
              </div>

              {/* Price and Actions */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <span className="font-mono font-black text-[#213147] text-[10px] sm:text-xs">
                  ${(unitPriceWithMods * item.quantity).toFixed(2)}
                </span>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-destructive hover:bg-destructive/10"
                    onClick={() => handleQuantityChange(item, -1)}
                  >
                    <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary hover:bg-primary/10"
                    onClick={() => handleQuantityChange(item, 1)}
                  >
                    <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
