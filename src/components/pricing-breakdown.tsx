'use client';

import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PricingBreakdownProps {
  subtotal: number;
  serviceFee: number;
  tax: number;
  tip: number;
  taxRate: number;
}

/**
 * Standardized pricing display optimized for horizontal mobile visibility.
 * Prevents layout shifts and text overlap on narrow screens.
 */
export function PricingBreakdown({ 
  subtotal, 
  serviceFee, 
  tax, 
  tip, 
  taxRate 
}: PricingBreakdownProps) {
  const total = subtotal + serviceFee + tax + tip;

  return (
    <div className="space-y-4">
      <div className="space-y-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {/* SUBTOTAL */}
        <div className="flex justify-between items-center px-1 gap-2">
          <p className="truncate">Subtotal</p>
          <p className="font-mono text-foreground font-bold shrink-0">${subtotal.toFixed(2)}</p>
        </div>

        {/* TAX */}
        <div className="flex justify-between items-center px-1 gap-2">
          <p className="truncate">Estimated Tax ({taxRate}%)</p>
          <p className="font-mono text-foreground font-bold shrink-0">${tax.toFixed(2)}</p>
        </div>

        {/* TIP */}
        <div className="flex justify-between items-center px-1 gap-2">
          <p className="truncate">Gratuity / Tip</p>
          <p className="font-mono text-foreground font-bold shrink-0">${tip.toFixed(2)}</p>
        </div>

        {/* CONVENIENCE FEE WITH KOOP BADGE */}
        <div className="flex justify-between items-center px-1 gap-2">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <p className="truncate">Convenience Fee</p>
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center px-1 rounded-[4px] bg-slate-100 hover:bg-slate-200 transition-all active:scale-90 shrink-0"
                  aria-label="Convenience fee info"
                >
                  <span className="text-[7px] font-black text-slate-400 tracking-tighter">KOOP</span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="center"
                className="max-w-[260px] text-[11px] leading-relaxed font-medium p-4 shadow-2xl border-2 z-[150] rounded-xl bg-white normal-case tracking-normal"
              >
                <div className="space-y-2">
                  <p className="font-black uppercase text-[9px] tracking-widest text-primary border-b pb-1">Fee Policy</p>
                  <p className="text-muted-foreground">This fee supports the mobile ordering solution and real-time logistics.</p>
                  <p className="font-bold text-foreground italic">It is not a tip and does not go to the delivery staff.</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="font-mono text-foreground font-bold shrink-0">${serviceFee.toFixed(2)}</p>
        </div>
      </div>

      <Separator className="bg-slate-200" />

      {/* TOTAL */}
      <div className="flex justify-between items-center py-1 px-1 gap-4">
        <p className="font-headline font-black tracking-tight text-[#213147] text-base sm:text-lg">TOTAL</p>
        <p className="font-mono text-primary font-black text-lg sm:text-xl shrink-0">${total.toFixed(2)}</p>
      </div>
    </div>
  );
}
