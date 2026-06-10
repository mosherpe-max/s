'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * High-fidelity logo component used across the platform.
 */
export function StylizedKoopLogo({ size = 'md', colorClass = 'text-white' }: { size?: 'sm' | 'md' | 'lg', colorClass?: string }) {
  const sizes = {
    sm: { text: 'text-xs', svg: 'w-4 h-4', spacing: 'mx-0.5' },
    md: { text: 'text-xl', svg: 'w-6 h-6', spacing: 'mx-0.5' },
    lg: { text: 'text-3xl', svg: 'w-8 h-8', spacing: 'mx-1' }
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center font-headline font-black tracking-tighter leading-none", colorClass, s.text)}>
      <span>KO</span>
      <div className={cn("relative flex items-center justify-center shrink-0", s.spacing, s.svg)}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="12" cy="12" r="10" stroke="#FF0000" strokeWidth="3" />
          <circle cx="12" cy="12" r="5" stroke="#FF0000" strokeWidth="3" />
          <circle cx="12" cy="12" r="2" fill="#FF0000" />
        </svg>
      </div>
      <span>P</span>
    </div>
  );
}

/**
 * A simplified, high-fidelity header for the patron experience.
 * Focused exclusively on Venue and Service context.
 */
export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sellerId = useMemo(() => {
    if (pathname) {
      const parts = pathname.split('/');
      const sellerIndex = parts.indexOf('sellers');
      if (sellerIndex !== -1 && parts[sellerIndex + 1]) {
        return parts[sellerIndex + 1];
      }
    }
    return searchParams.get('sellerId');
  }, [pathname, searchParams]);

  const orderId = searchParams.get('id');
  const menuTypeParam = searchParams.get('menuType');

  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !orderId) return null;
    return doc(firestore, 'orders', orderId);
  }, [firestore, orderId]);

  const { data: seller } = useDoc(sellerRef);
  const { data: order } = useDoc(orderRef);

  const isHomePage = pathname === '/';
  const activeMenuType = menuTypeParam || order?.menuType;

  if (!isMounted) return null;

  // On the landing page, we show a simplified "home" branding
  if (isHomePage) {
    return (
      <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md h-16 flex items-center justify-center">
        <StylizedKoopLogo size="lg" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md h-16 shrink-0">
      <div className="container mx-auto h-full flex items-center justify-center px-4">
        <div className="flex items-center gap-3 min-w-0 max-w-full">
          <div className="flex flex-col items-center text-center min-w-0">
            <h1 className="font-headline text-sm font-black text-white uppercase tracking-tight truncate leading-tight w-full max-w-[280px]">
              {seller?.courseName || 'KOOP Platform'}
            </h1>
            {activeMenuType && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] leading-none">
                  {activeMenuType}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
