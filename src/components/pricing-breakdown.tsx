'use client';

import { Separator } from '@/components/ui/separator';
import { KoopFeePill } from '@/components/koop-fee-pill';

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
      <div className="space-y-3 text-xs font-bold uppercase tracking-wide text-slate-600">
        {/* SUBTOTAL */}
        <div className="flex justify-between items-center px-1 gap-2">
          <p className="truncate">Subtotal</p>
          <p className="font-mono text-[13px] text-foreground font-bold shrink-0">${subtotal.toFixed(2)}</p>
        </div>

        {/* TAX - not shown when the venue doesn't charge tax on this service */}
        {taxRate > 0 && (
          <div className="flex justify-between items-center px-1 gap-2">
            <p className="truncate">Estimated Tax ({taxRate}%)</p>
            <p className="font-mono text-[13px] text-foreground font-bold shrink-0">${tax.toFixed(2)}</p>
          </div>
        )}

        {/* TIP */}
        <div className="flex justify-between items-center px-1 gap-2">
          <p className="truncate">Gratuity / Tip</p>
          <p className="font-mono text-[13px] text-foreground font-bold shrink-0">${tip.toFixed(2)}</p>
        </div>

        {/* CONVENIENCE FEE WITH KOOP BADGE */}
        <div className="flex justify-between items-center px-1 gap-2">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <p className="truncate">Convenience Fee</p>
            <KoopFeePill />
          </div>
          <p className="font-mono text-[13px] text-foreground font-bold shrink-0">${serviceFee.toFixed(2)}</p>
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
