
'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  ShoppingCart, 
  ChevronDown, 
  ShieldCheck, 
  Building, 
  Truck, 
  LayoutDashboard,
  Store,
  Menu,
  ChevronRight,
  Target,
  Users,
  LogIn,
  User as UserIcon
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';

const KoopLogo = () => (
  <Link href="/" className="flex items-center transition-opacity hover:opacity-90 shrink-0">
    <div className="flex items-center gap-0.5 font-headline font-black text-2xl tracking-tighter text-white">
      <span>KO</span>
      <div className="relative flex items-center justify-center w-6 h-6 mx-0.5">
        <div className="absolute inset-0 border-[2.5px] border-red-600 rounded-full"></div>
        <div className="absolute w-[12px] h-[14px] border-[2px] border-red-600 rounded-full"></div>
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
  const { user } = useUser();
  const { total, totalItems, setIsCartOpen } = useCart();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;

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

  const isDriverPage = pathname?.includes('/bevcart') || pathname?.includes('/clubhouse') || pathname?.includes('/laneside');
  const isTrackingPage = pathname?.includes('/order/track');
  const isBuyerView = pathname?.includes('/order') && !isDriverPage;
  
  const showServiceSubtext = (isBuyerView || isTrackingPage) && !isDriverPage;
  const activeMenuType = menuTypeParam || order?.menuType;

  const isHomePage = pathname === '/';
  const isKoopAdmin = pathname === '/admin';
  const isSalesCrm = pathname === '/sales';
  const showHamburger = true; // Always show hamburger for navigation accessibility

  if (isDriverPage) return null;

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => {
    const itemClass = mobile 
      ? "flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors border-b last:border-0"
      : "flex items-center gap-2 cursor-pointer py-2 w-full";
    
    const labelClass = mobile
      ? "text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-6 mb-2 px-4"
      : "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

    return (
      <div className={mobile ? "flex flex-col pb-10" : ""}>
        {/* AUTH SECTION */}
        {mobile && <p className={labelClass}>Account</p>}
        <Link 
          href="/login" 
          onClick={() => setIsMobileMenuOpen(false)} 
          className={cn(itemClass, !mobile && "hidden")}
        >
          {user ? (
            <>
              <UserIcon className="h-5 w-5 text-green-600" />
              <div className="flex flex-col">
                <span className="font-bold text-sm uppercase tracking-tight">Account Settings</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{user.email || 'Guest Session'}</span>
              </div>
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Login / Authenticate</span>
            </>
          )}
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
        </Link>

        {/* PLATFORM ADMIN */}
        {mobile && <p className={labelClass}>Platform</p>}
        {!mobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-headline font-bold uppercase tracking-wider px-3 h-9">
                Platform <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className={labelClass}>Internal Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin" className={itemClass}>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">KOOP ADMIN</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sales" className={itemClass}>
                  <Target className="h-4 w-4 text-indigo-600" />
                  <span className="font-bold text-xs uppercase tracking-tight">SALES CRM</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">KOOP ADMIN</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sales" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Target className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-sm uppercase tracking-tight">SALES CRM</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
          </>
        )}

        {/* MANAGE SELLERS */}
        {mobile && <p className={labelClass}>Seller Portals</p>}
        {!mobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-headline font-bold uppercase tracking-wider px-3 h-9">
                Sellers <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className={labelClass}>Seller Admin Access</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-course" className={itemClass}>
                  <Building className="h-4 w-4 text-indigo-600" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-tight">Public GC Admin</span>
                    <span className="text-[9px] text-muted-foreground">demo-course</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-bowling-alley" className={itemClass}>
                  <Store className="h-4 w-4 text-indigo-600" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-tight">Bowling Admin</span>
                    <span className="text-[9px] text-muted-foreground">demo-bowling-alley</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-golf-course-private" className={itemClass}>
                  <Building className="h-4 w-4 text-indigo-600" />
                  <div className="flex flex-col">
                    <span className="font-bold text-xs uppercase tracking-tight">Private Club Admin</span>
                    <span className="text-[9px] text-muted-foreground">demo-private</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/sellers/demo-course" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Building className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-sm uppercase tracking-tight">Public GC Admin</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-bowling-alley" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Store className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-sm uppercase tracking-tight">Bowling Admin</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-golf-course-private" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Building className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-sm uppercase tracking-tight">Private Club Admin</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
          </>
        )}

        {/* STAFF VIEWS */}
        {mobile && <p className={labelClass}>Staff Interfaces</p>}
        {!mobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-headline font-bold uppercase tracking-wider px-3 h-9">
                Staff <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className={labelClass}>Public GC & Bowling</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-course/bevcart" className={itemClass}>
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">Public BevCart Driver</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-course/clubhouse" className={itemClass}>
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">Public Clubhouse Portal</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-bowling-alley/laneside" className={itemClass}>
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">Laneside Server</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={labelClass}>Private Club Demo</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-golf-course-private/bevcart" className={itemClass}>
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">Private BevCart Driver</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-golf-course-private/clubhouse" className={itemClass}>
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-tight">Private Clubhouse Driver</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Link href="/sellers/demo-course/bevcart" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Public BevCart Driver</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-course/clubhouse" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Public Clubhouse Portal</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-bowling-alley/laneside" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Users className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Laneside Server</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <div className="h-4" />
            <Link href="/sellers/demo-golf-course-private/bevcart" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Private BevCart Driver</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-golf-course-private/clubhouse" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm uppercase tracking-tight">Private Clubhouse Driver</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
          </>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center min-w-0">
          {showServiceSubtext && seller ? (
            <div className="flex flex-col min-w-0">
               <span className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate leading-tight">
                {seller.courseName}
              </span>
              {activeMenuType && (
                <span className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest leading-none">
                  {activeMenuType} Menu
                </span>
              )}
            </div>
          ) : (
            <KoopLogo />
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isMounted && isBuyerView && !isTrackingPage ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-10 px-3 sm:px-4 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="flex flex-col items-end leading-none mr-1 hidden sm:flex">
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
          ) : null}

          {isMounted && (
            <div className="hidden lg:flex items-center gap-2">
              <NavigationLinks />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 w-9 rounded-full border-white/20 bg-transparent text-white p-0">
                      <UserIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">My Session</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">Account</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="outline" size="sm" className="h-9 px-4 border-white/20 bg-transparent text-white hover:bg-white/10 rounded-full font-headline font-bold uppercase text-[10px] tracking-widest">
                  <Link href="/login">Login</Link>
                </Button>
              )}
            </div>
          )}

          {isMounted && showHamburger && (
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 border-l-2 border-primary">
                  <SheetHeader className="px-6 py-6 border-b bg-[#213147] text-white">
                    <div className="flex justify-center">
                      <KoopLogo />
                    </div>
                    <SheetTitle className="text-center text-[10px] uppercase font-bold tracking-[0.3em] text-white/60 mt-4">
                      PLATFORM NAVIGATION
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-140px)]">
                    <NavigationLinks mobile />
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
