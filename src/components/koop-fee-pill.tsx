'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// The small KOOP pill next to the Convenience Fee line. Tapping it explains the fee. Shared by the review screen and
// the order status screen so the two always match.
export function KoopFeePill() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] bg-slate-200 hover:bg-slate-300 transition-all active:scale-90 shrink-0"
          aria-label="Koop convenience fee info"
        >
          <span className="text-[9px] font-black text-slate-700 tracking-tight">KOOP</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="max-w-[260px] text-[11px] leading-relaxed font-medium p-4 shadow-2xl border-2 z-[150] rounded-xl bg-white normal-case tracking-normal"
      >
        <div className="space-y-2">
          <p className="font-black uppercase text-[9px] tracking-widest text-primary border-b pb-1">Koop Convenience Fee</p>
          <p className="text-muted-foreground">This fee supports the mobile ordering solution and real-time logistics.</p>
          <p className="font-bold text-foreground italic">It is not a tip and does not go to the delivery staff.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
