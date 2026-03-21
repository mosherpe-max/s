'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  User as UserIcon,
  KeyRound,
  LogOut,
  Briefcase
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState, useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
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

export const StylizedKoopLogo = ({ size = 'md', className = "", colorClass = "text-white" }: { size?: 'sm' | 'md' | 'lg', className?: string, colorClass?: string }) => {
  const sizes = {
    sm: { text: 'text-xl', icon: 'w-5 h-5', stroke: '2.5' },
    md: { text: 'text-3xl', icon: 'w-7 h-7', stroke: '3' },
    lg: { text: 'text-5xl', icon: 'w-12 h-12', stroke: '4' }
  };
  const s = sizes[size];
  
  return (
    <div className={cn("flex items-center font-headline font-black tracking-tighter leading-none", colorClass, className, s.text)}>
      <span>KO</span>
      <div className={cn("relative flex items-center justify-center mx-0.5 shrink-0", s.icon)}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="12" cy="12" r="10" stroke="#FF0000" strokeWidth={s.stroke} />
          <circle cx="12" cy="12" r="5" stroke="#FF0000" strokeWidth={s.stroke} />
          <circle cx="12" cy="12" r="2" fill="#FF0000" />
        </svg>
      </div>
      <span>P</span>
    </div>
  );
};

const KoopLogoLink = () => (
  <Link href="/" className="flex items-center transition-opacity hover:opacity-90 shrink-0">
    <StylizedKoopLogo size="md" />
  </Link>
);

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { total, totalItems, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Signed Out" });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;
  const isHomePage = pathname === '/';

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

  if (isDriverPage) return null;

  const NavigationLinks = ({ mobile = false }: { mobile?: boolean }) => {
    const itemClass = mobile 
      ? "flex items-center gap-3 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors border-b last:border-0"
      : "flex items-center gap-2 cursor-pointer py-2 w-full text-foreground hover:text-primary transition-colors";
    
    const labelClass = mobile
      ? "text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-6 mb-2 px-4"
      : "text-[10px] font-bold uppercase tracking-widest text-muted-foreground";

    const homeLinkClass = mobile
      ? "flex items-center gap-3 py-4 px-6 text-sm font-black uppercase tracking-widest border-b hover:bg-muted/50 transition-colors"
      : "text-[11px] font-black uppercase tracking-[0.15em] text-white/80 hover:text-white transition-colors mx-4";

    if (isHomePage) {
      return (
        <div className={mobile ? "flex flex-col py-2" : "flex items-center"}>
          <a href="#venues" onClick={() => setIsMobileMenuOpen(false)} className={homeLinkClass}>Venues</a>
          <a href="#how" onClick={() => setIsMobileMenuOpen(false)} className={homeLinkClass}>How It Works</a>
          <a href="#why" onClick={() => setIsMobileMenuOpen(false)} className={homeLinkClass}>Why Koop</a>
          <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className={homeLinkClass}>Pricing</a>
        </div>
      );
    }

    return (
      <div className={mobile ? "flex flex-col pb-10" : "flex items-center gap-1"}>
        {/* PLATFORM ADMIN */}
        {!mobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-headline font-black uppercase tracking-wider px-3 h-9">
                Platform <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
              <DropdownMenuLabel className={labelClass}>Internal Tools</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/sales/dashboard" className={itemClass}>
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span className="font-black text-[10px] uppercase tracking-widest">SALES PORTAL</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin" className={itemClass}>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-black text-[10px] uppercase tracking-widest">KOOP ADMIN</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sales" className={itemClass}>
                  <Target className="h-4 w-4 text-indigo-600" />
                  <span className="font-black text-[10px] uppercase tracking-widest">SALES CRM</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <p className={labelClass}>Platform</p>
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className={cn(itemClass, "bg-indigo-50 border-indigo-100 mb-2")}>
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <span className="font-black text-xs uppercase tracking-widest text-indigo-700">Admin Login</span>
              <ChevronRight className="ml-auto h-4 w-4 text-indigo-300" />
            </Link>
            <Link href="/sales/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Briefcase className="h-5 w-5 text-indigo-600" />
              <span className="font-black text-xs uppercase tracking-widest">SALES PORTAL</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest">KOOP ADMIN</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sales" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Target className="h-5 w-5 text-indigo-600" />
              <span className="font-black text-xs uppercase tracking-widest">SALES CRM</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
          </>
        )}

        {/* STAFF VIEWS */}
        {!mobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-[10px] font-headline font-black uppercase tracking-wider px-3 h-9">
                Staff <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 shadow-xl border-2">
              <DropdownMenuLabel className={labelClass}>Service Interfaces</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-course/bevcart" className={itemClass}>
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Public BevCart</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-course/clubhouse" className={itemClass}>
                  <LayoutDashboard className="h-4 w-4 text-primary" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Public Clubhouse</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sellers/demo-bowling-alley/laneside" className={itemClass}>
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-black text-[10px] uppercase tracking-widest">Laneside Server</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <p className={labelClass}>Staff Interfaces</p>
            <Link href="/sellers/demo-course/bevcart" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Truck className="h-5 w-5 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest">Public BevCart</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-course/clubhouse" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <LayoutDashboard className="h-5 w-5 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest">Public Clubhouse</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
            <Link href="/sellers/demo-bowling-alley/laneside" onClick={() => setIsMobileMenuOpen(false)} className={itemClass}>
              <Users className="h-5 w-5 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest">Laneside Server</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30" />
            </Link>
          </>
        )}

        {mobile && user && (
          <div className="mt-auto pt-6 px-4">
            <Button variant="destructive" onClick={handleLogout} className="w-full h-12 gap-2 font-black uppercase tracking-widest rounded-xl">
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#213147] border-b-2 border-[#E50000] shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 min-w-0">
          <KoopLogoLink />
          
          {isMounted && showServiceSubtext && seller && (
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-white/10 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="font-headline text-xs font-black text-white uppercase tracking-tight truncate leading-tight">
                  {seller.courseName}
                </span>
                {activeMenuType && (
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">
                    {activeMenuType}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {isMounted && isHomePage && (
          <div className="hidden lg:flex flex-1 justify-center">
            <NavigationLinks />
          </div>
        )}
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isMounted && isBuyerView && !isTrackingPage && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2 h-10 px-3 sm:px-4 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent rounded-full transition-all"
              onClick={() => setIsCartOpen(true)}
            >
              <div className="flex flex-col items-end leading-none mr-1 hidden sm:flex">
                <span className="text-[9px] uppercase font-black text-white/50 tracking-widest">Order</span>
                <span className="text-sm font-mono font-black text-white">${total.toFixed(2)}</span>
              </div>
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg">
                    {totalItems}
                  </span>
                )}
              </div>
            </Button>
          )}

          {isMounted && isHomePage && (
            <Button asChild className="h-9 px-6 font-headline font-black uppercase text-[11px] tracking-widest bg-[#E50000] hover:bg-[#c40000] text-white rounded-full transition-all shadow-lg">
              <Link href="/login">LOGIN</Link>
            </Button>
          )}

          {isMounted && !isHomePage && (
            <div className="hidden lg:flex items-center gap-2">
              <NavigationLinks />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-9 rounded-full border-white/20 bg-transparent text-white p-0 hover:bg-white/10">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 shadow-xl border-2">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center gap-3 py-2 cursor-pointer font-black text-[10px] uppercase tracking-widest">
                      <UserIcon className="h-4 w-4 text-primary" />
                      <span>{user ? 'Manage Profile' : 'Login / Register'}</span>
                    </Link>
                  </DropdownMenuItem>
                  {user && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 py-2 cursor-pointer font-black text-[10px] uppercase tracking-widest text-destructive">
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {isMounted && (
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0 border-l-2 border-[#E50000] bg-background">
                  <SheetHeader className="px-6 py-8 border-b bg-[#213147] text-white">
                    <div className="flex justify-center">
                      <StylizedKoopLogo size="lg" />
                    </div>
                    <SheetTitle className="text-center text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mt-4">
                      PLATFORM NAV
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-160px)]">
                    <NavigationLinks mobile />
                    {!isHomePage && (
                      <div className="p-4 border-t mt-4">
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 bg-muted/50 rounded-xl">
                          <UserIcon className="h-5 w-5 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-black text-xs uppercase tracking-widest">{user ? 'Account Settings' : 'Authentication'}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{user?.email || 'Guest Session'}</span>
                          </div>
                        </Link>
                      </div>
                    )}
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
