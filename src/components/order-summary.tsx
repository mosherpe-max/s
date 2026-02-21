
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
}

export function OrderSummary({ items, serviceFee = 0, tax = 0, tip = 0 }: OrderSummaryProps) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal + serviceFee + tax + tip;

  return (
    <>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Quantity: {item.quantity}</p>
                </div>
                <p className="font-mono font-bold text-xs">${(item.price * item.quantity).toFixed(2)}</p>
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
                      className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5 transition-colors focus:outline-none"
                      aria-label="Convenience fee information"
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="top" 
                    align="center"
                    className="max-w-[240px] text-[10px] leading-tight font-medium p-3 shadow-xl border-2 z-[100]"
                  >
                    <p>This Convenience Fee helps us provide the mobile ordering technology. It is not a tip and does not go to the delivery staff.</p>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="font-mono text-foreground">${serviceFee.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p>Estimated Tax (6%)</p>
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
