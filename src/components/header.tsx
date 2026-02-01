'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState, useEffect } from 'react';

const KoopLogo = () => (
  <div className="flex items-center gap-0.5 font-headline font-bold text-2xl tracking-tighter text-white">
    <span>KO</span>
    <div className="relative flex items-center justify-center w-6 h-6">
      <div className="absolute inset-0 border-[2px] border-red-600 rounded-full"></div>
      <div className="absolute w-[14px] h-[14px] border-[1.5px] border-red-600 rounded-full"></div>
      <div className="w-[4px] h-[4px] bg-red-600 rounded-full"></div>
    </div>
    <span>P</span>
  </div>
);

export function AppHeader() {
  const pathname = usePathname();
  const { total, totalItems, setIsCartOpen } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isOrderPage = pathname?.includes('/order') && !pathname?.includes('/track');
  const isDriverPage = pathname === '/seller/bevcartdriver';

  if (isDriverPage) return null;

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-90 shrink-0">
          <KoopLogo />
        </Link>
        
        <div className="flex items-center gap-3">
          {isMounted && isOrderPage ? (
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-white hover:bg-white/10 text-xs font-headline uppercase tracking-wider">
                <Link href="/admin">KOOP ADMIN</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 text-xs font-headline uppercase tracking-wider">
                <Link href="/seller/bevcartdriver">BEVCART DRIVER</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-white hover:bg-white/10 text-xs font-headline uppercase tracking-wider">
                <Link href="/sellers/demo-course">SELLER ADMIN</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
