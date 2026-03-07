'use client';

import type { OrderItem } from '@/lib/types';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderSummaryProps {
  items: OrderItem[];
  onUpdateItem?: (item: OrderItem) => void;
  onRemoveItem?: (cartId: string) => void;
}

/**
 * Focuses exclusively on listing the cart items and providing quantity controls.
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

  return (
    <>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.cartId} className="flex flex-col gap-2 p-3 rounded-xl border bg-background/50">
              <div className="flex justify-between items-start text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-foreground">{item.name}</p>
                  {item.selectedModifiers && Object.values(item.selectedModifiers).flat().length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(item.selectedModifiers).map(([groupId, options]) => (
                        options.map(opt => (
                          <span key={`${item.cartId}-${groupId}-${opt.id}`} className="text-[8px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">
                            + {opt.name} {opt.price > 0 ? `($${opt.price.toFixed(2)})` : ''}
                          </span>
                        ))
                      ))}
                    </div>
                  )}
                </div>
                <p className="font-mono font-bold text-xs">
                  ${((item.price + (item.selectedModifiers ? Object.values(item.selectedModifiers).flat().reduce((s, m) => s + m.price, 0) : 0)) * item.quantity).toFixed(2)}
                </p>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border shadow-sm h-8">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-md hover:bg-background"
                    onClick={() => handleQuantityChange(item, -1)}
                  >
                    {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : <Minus className="h-3 w-3" />}
                  </Button>
                  <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-md hover:bg-background text-primary"
                    onClick={() => handleQuantityChange(item, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {onRemoveItem && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[9px] font-bold uppercase text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onRemoveItem(item.cartId)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
