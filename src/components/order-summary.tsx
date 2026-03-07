
'use client';

import { Separator } from '@/components/ui/separator';
import type { OrderItem } from '@/lib/types';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface OrderSummaryProps {
  items: OrderItem[];
  serviceFee?: number;
  tax?: number;
  tip?: number;
  taxRate?: number;
}

export function OrderSummary({ items, serviceFee = 0, tax = 0, tip = 0, taxRate = 6.0 }: OrderSummaryProps) {
  const subtotal = items.reduce((acc, item) => {
    const basePrice = item.price;
    const modifiersPrice = item.selectedModifiers ? 
      Object.values(item.selectedModifiers).flat().reduce((sum, mod) => sum + mod.price, 0) : 0;
    return acc + (basePrice + modifiersPrice) * item.quantity;
  }, 0);
  
  const total = subtotal + serviceFee + tax + tip;

  return (
    <>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.cartId} className="flex justify-between items-start text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tight">Quantity: {item.quantity}</p>
                  
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
            ))}
          </div>
          <Separator className="bg-border/50" />
          <div className="space-y-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <div className="flex justify-between items-center">
              <p>Subtotal</p>
              <p className="font-mono text-foreground">${subtotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <p>Convenience Fee</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      type="button" 
                      className="inline-flex items-center justify-center rounded-full hover:bg-muted active:bg-muted p-1 transition-colors focus:outline-none touch-manipulation"
                      aria-label="Convenience fee information"
                    >
                      <Info className="h-4 w-4 text-primary cursor-pointer" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="top" 
                    align="center"
                    className="max-w-[260px] text-[11px] leading-relaxed font-medium p-4 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-2 z-[150] rounded-xl bg-white"
                  >
                    <div className="space-y-2">
                      <p className="font-black uppercase text-[9px] tracking-widest text-primary border-b pb-1">Convenience Fee Policy</p>
                      <p>This Convenience Fee helps us provide the mobile ordering technology and real-time tracking.</p>
                      <p className="font-bold text-foreground italic">It is not a tip and does not go to the delivery staff.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="font-mono text-foreground">${serviceFee.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p>Estimated Tax ({taxRate}%)</p>
              <p className="font-mono text-foreground">${tax.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p>Gratuity / Tip</p>
              <p className="font-mono text-foreground">${tip.toFixed(2)}</p>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between items-center font-black text-lg py-1">
            <p className="font-headline tracking-tight">TOTAL</p>
            <p className="font-mono text-primary">${total.toFixed(2)}</p>
          </div>
        </div>
      )}
    </>
  );
}
