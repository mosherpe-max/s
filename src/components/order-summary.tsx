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
 * Redesigned to match the reference image: Rounded white card with sub-items.
 * Now includes both plus and minus controls for real-time checkout adjustments.
 * Optimized for horizontal mobile visibility.
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
    return <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">YOUR ORDER</h3>
      <div className="bg-white rounded-[1.5rem] border shadow-sm overflow-hidden divide-y">
        {items.map(item => {
          const modifierList = item.selectedModifiers ? 
            Object.values(item.selectedModifiers).flat().map(m => m.name).join(' · ') : '';
          
          const unitPriceWithMods = item.price + (item.selectedModifiers ? 
            Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.price, 0) : 0);

          return (
            <div key={item.cartId} className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 bg-white hover:bg-muted/5 transition-colors">
              {/* Quantity Circle */}
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#213147] text-white shrink-0">
                <span className="font-black text-sm sm:text-base">{item.quantity}</span>
              </div>

              {/* Item Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#213147] text-xs sm:text-sm leading-tight truncate uppercase">{item.name}</p>
                {(modifierList || item.description) && (
                  <p className="text-[9px] text-muted-foreground font-medium truncate mt-0.5 uppercase">
                    {modifierList || item.description}
                  </p>
                )}
              </div>

              {/* Price and Actions */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="font-mono font-bold text-[#213147] text-xs sm:text-sm mr-1 sm:mr-2">
                  ${(unitPriceWithMods * item.quantity).toFixed(2)}
                </span>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-destructive hover:bg-destructive/10 border border-destructive/10"
                    onClick={() => handleQuantityChange(item, -1)}
                  >
                    <MinusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-primary hover:bg-primary/10 border border-primary/10"
                    onClick={() => handleQuantityChange(item, 1)}
                  >
                    <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
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
