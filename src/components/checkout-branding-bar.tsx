'use client';

import { StylizedKoopLogo } from '@/components/header';

export function CheckoutBrandingBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-7 bg-[#213147] text-white flex items-center justify-center z-[60] w-full border-t border-white/5">
      <div className="max-w-xl mx-auto w-full px-4 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Secure Order</span>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Powered by</span>
          <StylizedKoopLogo size="sm" />
        </div>
      </div>
    </div>
  );
}
