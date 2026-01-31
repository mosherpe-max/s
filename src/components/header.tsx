'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';

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
    <header className="sticky top-0 z-40 bg-[#213147] border-b border-[#E50000]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
            <KoopLogo />
          </Link>
          {!isOrderPage && (
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
              <Link href="/#features" className="text-white hover:text-white/80 transition-colors">Features</Link>
              <Link href="/#pricing" className="text-white hover:text-white/80 transition-colors">Pricing</Link>
              <Link href="/sellers/demo-course/order" className="text-white hover:text-white/80 transition-colors">Demo Menu</Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {isMounted && isOrderPage ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-10 px-4 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="flex flex-col items-end leading-none mr-2 hidden sm:flex">
                <span className="text-[10px] uppercase font-bold text-white/60">My Order</span>
                <span className="text-sm font-mono font-bold text-white">${total.toFixed(2)}</span>
              </div>
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="sm:hidden font-mono font-bold ml-1 text-white">${total.toFixed(2)}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-white hover:bg-white/10 hover:text-white">
                <Link href="/admin">Admin</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/seller/bevcartdriver">Driver</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
                <Link href="/sellers/demo-course">Seller Admin</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
