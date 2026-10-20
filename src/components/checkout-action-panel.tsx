'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// The bar pinned to the bottom of the checkout screen (save-my-info, terms, and the Place Order / Pay button).
// It reports its own height as --checkout-action-h so the page can leave exactly that much room under the last
// field, and it steps out of the way while the patron is typing, since the on-screen keyboard leaves little room.
export function CheckoutActionPanel({ hidden = false, children }: { hidden?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const write = () => { if (el.offsetHeight > 0) root.style.setProperty('--checkout-action-h', `${el.offsetHeight}px`); };
    write();
    const observer = new ResizeObserver(write);
    observer.observe(el);
    return () => { observer.disconnect(); root.style.removeProperty('--checkout-action-h'); };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden={hidden || undefined}
      className={cn(
        'fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50 animate-in slide-in-from-bottom-4 duration-500 transition-transform',
        hidden && 'translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none',
      )}
    >
      <div className="max-w-xl mx-auto px-2 space-y-3">{children}</div>
    </div>
  );
}
