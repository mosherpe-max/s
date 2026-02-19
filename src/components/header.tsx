'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname, useSearchParams } from 'next/navigation';
import { ShoppingCart, Hash } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getNumericOrderId } from '@/lib/utils';

const KoopLogo = () => (
  <Link href="/" className="flex items-center transition-opacity hover:opacity-90 shrink-0">
    <div className="flex items-center gap-0.5 font-headline font-bold text-2xl tracking-tighter text-white">
      <span>KO</span>
      <div className="relative flex items-center justify-center w-6 h-6">
        <div className="absolute inset-0 border-[2px] border-red-600 rounded-full"></div>
        <div className="absolute w-[14px] h-[14px] border-[1.5px] border-red-600 rounded-full"></div>
        <div className="w-[4px] h-[4px] bg-red-600 rounded-full"></div>
      </div>
      <span>P</span>
    </div>
  </Link>
);

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { total, totalItems, setIsCartOpen } = useCart();
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
  const numericOrderId = useMemo(() => orderId ? getNumericOrderId(orderId) : null, [orderId]);

  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);

  const { data: seller } = useDoc(sellerRef);

  const isDriverPage = pathname?.includes('/bevcart') || pathname?.includes('/clubhouse') || pathname?.includes('/laneside');
  const isTrackingPage = pathname?.includes('/order/track');
  const isBuyerView = pathname?.includes('/order') && !isDriverPage;
  
  const showSellerName = (isBuyerView || isTrackingPage) && !isDriverPage;

  if (isDriverPage) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center min-w-0">
          {showSellerName && seller ? (
            <div className="flex flex-col min-w-0">
               <span className="font-headline text-lg font-bold text-white uppercase tracking-tight truncate">
                {seller.courseName}
              </span>
            </div>
          ) : (
            <KoopLogo />
          )}
        </div>
        
        <div className="flex items-center gap-3 shrink-0 overflow-x-auto no-scrollbar">
          {isMounted && isTrackingPage && numericOrderId ? (
            <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
              <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">Order ID</span>
                <span className="text-sm font-mono font-bold text-white">#{numericOrderId}</span>
              </div>
              <Hash className="h-4 w-4 text-primary" />
            </div>
          ) : isMounted && isBuyerView ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-10 px-4 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="flex flex-col items-end leading-none mr-2 hidden sm:flex">
                <span className="text-[9px] uppercase font-bold text-white/50 tracking-widest">My Order</span>
                <span className="text-sm font-mono font-bold text-white">${total.toFixed(2)}</span>
              </div>
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/admin">KOOP ADMIN</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-course">Seller Admin Public GC</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-bowling-alley">Seller Admin Bowling</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-golf-course-private">Seller Admin Private GC</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-course/bevcart">BEVCART</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-course/clubhouse">CLUBHOUSE</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-[9px] font-headline font-bold uppercase tracking-wider px-2">
                <Link href="/sellers/demo-bowling-alley/laneside">LANESIDE</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
