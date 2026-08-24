
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  LogIn, 
  Settings, 
  Truck, 
  Building, 
  Users, 
  Smartphone, 
  ChevronRight,
  ExternalLink,
  Store,
  LayoutDashboard,
  ShoppingCart,
  ShieldCheck
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SolutionConfig } from '@/lib/types';
import { useCart } from '@/lib/cart-context';

/**
 * High-fidelity logo component used across the solution.
 */
export function StylizedKoopLogo({ size = 'md', colorClass = 'text-white' }: { size?: 'sm' | 'md' | 'lg', colorClass?: string }) {
  const firestore = useFirestore();
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config, isLoading } = useDoc<SolutionConfig>(configRef);

  const sizes = {
    sm: { text: 'text-[13px]', svg: 'w-[18px] h-[18px]', img: 'h-5 w-auto', gap: 'gap-0.5' },
    md: { text: 'text-xl', svg: 'w-6 h-6', img: 'h-8 w-auto', gap: 'gap-1' },
    lg: { text: 'text-4xl', svg: 'w-10 h-10', img: 'h-14 w-auto', gap: 'gap-2' }
  };
  const s = sizes[size];

  if (isLoading) {
    return (
      <div 
        className={cn("animate-pulse bg-white/10 rounded-lg", s.img)} 
        style={{ width: size === 'lg' ? '140px' : '80px' }} 
      />
    );
  }

  if (config?.logoUrl) {
    return (
      <div className={cn("flex items-center justify-center select-none", s.img)}>
        <img 
          src={config.logoUrl} 
          alt="KOOP" 
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center font-headline font-black tracking-tighter leading-none select-none uppercase", colorClass, s.text, s.gap)}>
      <span>K</span>
      <span>O</span>
      <div className={cn("relative flex items-center justify-center shrink-0", s.svg)}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="12" cy="12" r="10.5" stroke="#E50000" strokeWidth="2.8" />
          <circle cx="12" cy="12" r="6" stroke="#E50000" strokeWidth="2.4" />
          <circle cx="12" cy="12" r="2.2" fill="#E50000" />
        </svg>
      </div>
      <span>P</span>
    </div>
  );
}

function HomeNavigationMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 border-l-4 border-primary/20 bg-[#213147] text-white">
        <SheetHeader className="p-6 border-b border-white/5 text-left">
          <StylizedKoopLogo size="md" />
          <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Solution Navigator</SheetTitle>
          <SheetDescription className="text-xs text-white/40">Access demo environments and administrative portals.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-8 pb-20">
            <div className="space-y-3">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Authentication</p>
              <Button asChild variant="outline" className="w-full justify-start h-12 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white border-2 gap-3 group">
                <Link href="/login">
                  <LogIn className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-widest">Internal Login</span>
                  <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Public Golf Demo</p>
              </div>
              <div className="grid gap-2">
                <MenuLink href="/sellers/demo-course" label="Venue Admin" icon={LayoutDashboard} />
                <MenuLink href="/sellers/demo-course/staff-login" label="Staff Entry" icon={ShieldCheck} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Bowling Alley Demo</p>
              </div>
              <div className="grid gap-2">
                <MenuLink href="/sellers/demo-bowling-alley" label="Venue Admin" icon={LayoutDashboard} />
                <MenuLink href="/sellers/demo-bowling-alley/staff-login" label="Staff Entry" icon={ShieldCheck} />
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function MenuLink({ href, label, icon: Icon }: { href: string, label: string, icon: any }) {
  return (
    <Button asChild variant="ghost" className="w-full justify-start h-11 text-white/70 hover:text-white hover:bg-white/5 font-bold text-[10px] uppercase tracking-widest gap-3 px-3">
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
        <ExternalLink className="ml-auto h-3 w-3 opacity-20" />
      </Link>
    </Button>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const { total, totalItems, setIsCartOpen } = useCart();

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

  const { data: seller, isLoading: isSellerLoading } = useDoc(sellerRef);
  const { data: order } = useDoc(orderRef);

  // Early returns must come AFTER all hook calls
  if (!isMounted) return null;

  const isMenuPage = pathname?.endsWith('/order');
  const isTrackPage = pathname?.endsWith('/order/track');
  const isHomePage = pathname === '/';
  
  const isAdminRoute = pathname?.startsWith('/admin') || 
                      (pathname?.startsWith('/sellers/') && !pathname.includes('/order') && !pathname.includes('/staff-login'));

  // On the Ordering and Tracking Screen, we remove the top Koop header entirely to focus on the venue/order
  if (isMenuPage || isTrackPage || isAdminRoute) return null;

  if (isHomePage) {
    return (
      <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md h-20 flex items-center justify-between px-6 shrink-0">
        <div className="w-10" /> 
        <div className="flex-1 flex justify-center">
          <StylizedKoopLogo size="lg" />
        </div>
        <HomeNavigationMenu />
      </header>
    );
  }

  const activeMenuType = menuTypeParam || order?.menuType;

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md h-16 shrink-0">
      <div className="container mx-auto h-full flex items-center px-4">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            {isSellerLoading ? (
              <div className="h-4 w-32 bg-white/10 animate-pulse rounded-full" />
            ) : (
              <h1 className="font-headline text-sm font-black text-white uppercase tracking-tight truncate leading-tight w-full">
                {seller?.courseName || 'KOOP Solution'}
              </h1>
            )}
            {activeMenuType && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] leading-none">
                  {activeMenuType}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end shrink-0">
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 h-11 px-3 text-white relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5 text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
