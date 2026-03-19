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
 * Renders the financial calculation lines (Subtotal, Fees, Tax, Tip, and Final Total).
 * Redesigned to feature the "KOOP" convenience fee badge.
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
      <div className="space-y-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {/* SUBTOTAL */}
        <div className="flex justify-between items-center px-1">
          <p>Subtotal</p>
          <p className="font-mono text-foreground">${subtotal.toFixed(2)}</p>
        </div>

        {/* CONVENIENCE FEE WITH KOOP BADGE */}
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <p className="normal-case text-sm font-medium text-slate-500 tracking-tight">Convenience Fee</p>
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  type="button" 
                  className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all focus:outline-none touch-manipulation border border-slate-200/50 shadow-sm"
                  aria-label="Convenience fee information"
                >
                  <span className="text-[9px] font-black text-slate-400 tracking-tighter">KOOP</span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="top" 
                align="center"
                className="max-w-[260px] text-[11px] leading-relaxed font-medium p-4 shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-2 z-[150] rounded-xl bg-white normal-case tracking-normal"
              >
                <div className="space-y-2">
                  <p className="font-black uppercase text-[9px] tracking-widest text-primary border-b pb-1">Convenience Fee Policy</p>
                  <p className="text-muted-foreground">This fee helps us provide the mobile ordering technology and real-time tracking at your venue.</p>
                  <p className="font-bold text-foreground italic">It is not a tip and does not go to the delivery staff.</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="font-mono text-slate-500 text-sm font-medium">${serviceFee.toFixed(2)}</p>
        </div>

        {/* TAX */}
        <div className="flex justify-between items-center px-1">
          <p>Estimated Tax ({taxRate}%)</p>
          <p className="font-mono text-foreground">${tax.toFixed(2)}</p>
        </div>

        {/* TIP */}
        <div className="flex justify-between items-center px-1">
          <p>Gratuity / Tip</p>
          <p className="font-mono text-foreground">${tip.toFixed(2)}</p>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* TOTAL */}
      <div className="flex justify-between items-center font-black text-lg py-1 px-1">
        <p className="font-headline tracking-tight text-[#213147]">TOTAL</p>
        <p className="font-mono text-primary text-xl">${total.toFixed(2)}</p>
      </div>
    </div>
  );
}
