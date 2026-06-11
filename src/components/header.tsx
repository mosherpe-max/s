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
  LayoutDashboard
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
import type { PlatformConfig } from '@/lib/types';

/**
 * High-fidelity logo component used across the platform.
 * Supports custom branding upload with SVG wordmark fallback.
 */
export function StylizedKoopLogo({ size = 'md', colorClass = 'text-white' }: { size?: 'sm' | 'md' | 'lg', colorClass?: string }) {
  const firestore = useFirestore();
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  const sizes = {
    sm: { text: 'text-[13px]', svg: 'w-[18px] h-[18px]', img: 'h-5 w-auto', gap: 'gap-0.5' },
    md: { text: 'text-xl', svg: 'w-6 h-6', img: 'h-8 w-auto', gap: 'gap-1' },
    lg: { text: 'text-3xl', svg: 'w-8 h-8', img: 'h-12 w-auto', gap: 'gap-1.5' }
  };
  const s = sizes[size];

  // Render custom uploaded logo if available
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

  // Fallback to stylized SVG wordmark matching K-O-[Target]-P
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

/**
 * Navigation menu for the landing page containing demo and admin links.
 */
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
          <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Platform Navigator</SheetTitle>
          <SheetDescription className="hidden">KOOP Platform Demo Links</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-8 pb-20">
            {/* Platform Gateway */}
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

            {/* Public Golf Demo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Public Golf Demo</p>
              </div>
              <div className="grid gap-2">
                <MenuLink href="/sellers/demo-course" label="Venue Admin" icon={LayoutDashboard} />
                <MenuLink href="/sellers/demo-course/bevcart" label="BevCart Driver" icon={Truck} />
                <MenuLink href="/sellers/demo-course/clubhouse" label="Clubhouse Staff" icon={Building} />
              </div>
            </div>

            {/* Private Golf Demo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Private Golf Demo</p>
              </div>
              <div className="grid gap-2">
                <MenuLink href="/sellers/demo-private-course" label="Venue Admin" icon={LayoutDashboard} />
                <MenuLink href="/sellers/demo-private-course/clubhouse" label="Clubhouse Staff" icon={Building} />
              </div>
            </div>

            {/* Bowling Demo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Bowling Alley Demo</p>
              </div>
              <div className="grid gap-2">
                <MenuLink href="/sellers/demo-bowling-alley" label="Venue Admin" icon={LayoutDashboard} />
                <MenuLink href="/sellers/demo-bowling-alley/laneside" label="Laneside Server" icon={Users} />
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

  // On the landing page, we show branding and the demo navigation menu
  if (isHomePage) {
    return (
      <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md h-16 flex items-center justify-between px-6 shrink-0">
        <div className="w-10" /> 
        <StylizedKoopLogo size="lg" />
        <HomeNavigationMenu />
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
