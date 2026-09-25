'use client';

import { useState, use, useEffect, useMemo, Suspense } from 'react';
import { collection, doc, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import type { Seller, MenuItem, OrderItem, SolutionConfig, Venue, StaffMember, Order } from '@/lib/types';
import { categories } from '@/lib/types';
import { BuyerMenu } from '@/components/buyer-menu';
import { ModifierSelector } from '@/components/modifier-selector';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Store,
  MapPin,
  AlertTriangle,
  Info,
  ShoppingCart,
  Zap,
  X,
  ChevronRight,
  ArrowLeft,
  Lock,
  RotateCcw
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { cn, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Zap,
  'Clubhouse': Zap,
  'Lane Delivery': MapPin,
};

const SERVICE_INSTRUCTIONS: Record<string, string> = {
  'Beverage Cart': 'Drinks & snacks delivered on course — a small convenience fee applies.',
  'Clubhouse': 'Food & drinks delivered on course — a small convenience fee applies.',
  'Lane Delivery': 'Food & drinks delivered to your lane — a small convenience fee applies.',
};

function BuyerOrderContent({ sellerId }: { sellerId: string }) {
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { toast } = useToast();
  const { orderItems, updateItem, clearCart, totalItems, total } = useCart();
  
  const menuTypeFromUrl = searchParams.get('menuType');
  const keyParam = searchParams.get('key');
  const selectedMenuType = menuTypeFromUrl || '';
  const [activeCategory, setActiveCategory] = useState<string>('Featured');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig, isLoading: isConfigLoading } = useDoc<SolutionConfig>(configRef);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { isLoading: isVenueLoading } = useDoc<Venue>(venueRef);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffQuery);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  // SECURE ACCESS CHECK WITH SIMPLE PROTOTYPING BYPASS
  const isAccessValid = useMemo(() => {
    if (!seller || isSellerLoading) return true;
    
    // Prototyping Bypass: Always allow demo venues for simple preview
    if (sellerId.startsWith('demo-')) return true;

    // Legacy support for venues without keys
    if (!seller.qrSecret) return true;
    // If QR is explicitly deactivated, deny access
    if (seller.qrActive === false) return false;
    // If key exists, it must match the URL param
    return seller.qrSecret === keyParam;
  }, [seller, isSellerLoading, keyParam, sellerId]);

  // FETCH ACTIVE ORDERS FOR CURRENT PATRON SESSION
  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'orders'),
      where('buyerProfileId', '==', user.uid),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, user?.uid]);
  const { data: userActiveOrders } = useCollection<Order>(activeOrdersQuery);

  // All of this patron's currently in-progress orders, most recent first - not
  // just the latest one, since they may have placed a second order (e.g. they
  // forgot something) before the first one showed up.
  const activeTrackingOrders = useMemo(() => {
    if (!userActiveOrders || userActiveOrders.length === 0) return [];
    return [...userActiveOrders].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [userActiveOrders]);

  // FETCH PAST ORDERS FOR REORDER - scoped to this venue AND this specific
  // service mode, so a patron who orders at multiple Koop locations (or uses
  // Beverage Cart at one visit and Clubhouse the next) only ever sees reorder
  // suggestions relevant to what they're looking at right now. No orderBy
  // here deliberately - sorting client-side (like activeTrackingOrders above)
  // avoids needing a Firestore composite index for this many equality filters.
  const pastOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !selectedMenuType) return null;
    return query(
      collection(firestore, 'orders'),
      where('buyerProfileId', '==', user.uid),
      where('sellerId', '==', sellerId),
      where('menuType', '==', selectedMenuType),
      where('status', '==', 'Delivered')
    );
  }, [firestore, user?.uid, sellerId, selectedMenuType]);
  const { data: pastOrders } = useCollection<Order>(pastOrdersQuery);

  // A past order's items are a frozen snapshot from when it was placed - the
  // menu may have changed since (item moved to a different mode, deleted,
  // admin-disabled, or 86'd by staff). Only suggest a reorder if every item
  // in it is still genuinely orderable on THIS mode right now, so we never
  // one-tap-add something that's no longer actually available here.
  const reorderSuggestions = useMemo(() => {
    if (!pastOrders || pastOrders.length === 0 || !menuItems) return [];
    const isStillOrderable = (pastItem: OrderItem) => {
      const current = menuItems.find((m) => m.id === pastItem.id);
      return !!current
        && current.isAvailable !== false
        && !!current.availableOn?.includes(selectedMenuType)
        && !current.outOfStockModes?.includes(selectedMenuType);
    };
    return [...pastOrders]
      .filter((order) => order.items.every(isStillOrderable))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 2);
  }, [pastOrders, menuItems, selectedMenuType]);

  const handleReorder = (pastOrder: Order) => {
    pastOrder.items.forEach((pastItem) => {
      const existing = orderItems.find((i) => i.cartId === pastItem.cartId);
      updateItem({ ...pastItem, quantity: (existing?.quantity || 0) + pastItem.quantity });
    });
    toast({
      title: 'Added to Cart',
      description: `${pastOrder.items.length} item${pastOrder.items.length > 1 ? 's' : ''} from your last order added.`,
    });
  };

  const updateMenuType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('menuType', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isModeAvailable = (type: string) => {
    if (!seller) return false;

    // Prototyping Bypass: Demos are always "Online" to allow exploration
    if (sellerId.startsWith('demo-')) return true;

    const isGloballyAuthorized = !solutionConfig || (solutionConfig.enabledModes?.includes(type) ?? true);
    if (!isGloballyAuthorized) return false;
    const isVenueAuthorized = seller.menuTypes.includes(type);
    if (!isVenueAuthorized) return false;
    
    let isChannelOpen = true;
    switch(type) {
      case 'Beverage Cart': isChannelOpen = !!seller.bevcartActive; break;
      case 'Clubhouse': isChannelOpen = !!seller.clubhouseActive; break;
      case 'Lane Delivery': isChannelOpen = !!seller.lanedeliveryActive; break;
    }
    if (!isChannelOpen) return false;

    if (isModeBusy(type)) return false;

    // Production constraint: Staff must be active to take orders
    const activeStaff = staffList?.filter(s => s.activeMode === type && s.isActive !== false);
    return (activeStaff && activeStaff.length > 0) || false;
  };

  // A staff-initiated pause or an auto-throttle trip (queue too full) - kept
  // distinct from the *Active/no-staff checks above so the "unavailable"
  // screen can tell a patron this is temporary instead of implying the
  // venue is closed or unstaffed.
  const isModeBusy = (type: string) => {
    if (!seller || sellerId.startsWith('demo-')) return false;
    switch (type) {
      case 'Beverage Cart': return !!seller.bevcartPausedByStaff || !!seller.bevcartAutoThrottled;
      case 'Clubhouse': return !!seller.clubhousePausedByStaff || !!seller.clubhouseAutoThrottled;
      case 'Lane Delivery': return !!seller.lanedeliveryPausedByStaff || !!seller.lanedeliveryAutoThrottled;
      default: return false;
    }
  };

  useEffect(() => {
    if (!menuTypeFromUrl && seller && !isSellerLoading && staffList && isAccessValid) {
      let defaultType = seller.type.toLowerCase().includes('bowling') ? 'Lane Delivery' : 'Beverage Cart';
      if (isModeAvailable(defaultType)) updateMenuType(defaultType);
      else {
        const firstAvailable = (seller.menuTypes || []).find(t => isModeAvailable(t));
        if (firstAvailable) updateMenuType(firstAvailable);
      }
    }
  }, [seller, solutionConfig, menuTypeFromUrl, isSellerLoading, staffList, isAccessValid]);

  useEffect(() => {
    const options = { root: null, rootMargin: '-160px 0px -50% 0px', threshold: 0 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const catId = entry.target.id;
          const catName = currentCategories.find(c => c.toLowerCase().replace(/\s+/g, '-') === catId);
          if (catName) setActiveCategory(catName);
        }
      });
    }, options);
    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [seller, menuItems, selectedMenuType]);

  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !selectedMenuType) return [];
    return menuItems.filter(item => item.isAvailable !== false && (item.availableOn?.includes(selectedMenuType) || item.featuredOn?.includes(selectedMenuType)));
  }, [menuItems, selectedMenuType]);

  const currentCategories = useMemo(() => {
    if (!seller || !filteredMenuItems.length) return [];
    const hasExplicitFeatured = filteredMenuItems.some(i => i.featuredOn?.includes(selectedMenuType));
    const visibleCategories = categories.filter(c => {
      if (c === 'Featured') return hasExplicitFeatured;
      const hasItemsInCat = filteredMenuItems.some(i => i.category === c && i.availableOn?.includes(selectedMenuType));
      return hasItemsInCat && (seller.categoryVisibility?.[selectedMenuType]?.includes(c) ?? true);
    });
    return visibleCategories.sort((a, b) => (a === 'Featured' ? -1 : (b === 'Featured' ? 1 : 0)));
  }, [seller, filteredMenuItems, selectedMenuType]);

  const handleOrderComplete = (orderId: string) => {
    router.push(`/order/track?id=${orderId}&sellerId=${sellerId}`);
    clearCart();
  };

  const goToReview = () => {
    router.push(`/sellers/${sellerId}/order/review?${searchParams.toString()}`);
  };

  const scrollToCategory = (category: string) => {
    const element = document.getElementById(category.toLowerCase().replace(/\s+/g, '-'));
    if (element) {
      const offset = 140; 
      const elementPosition = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      setActiveCategory(category);
    }
  };

  const handleConfirmModifiers = (orderItem: OrderItem) => {
    updateItem(orderItem);
    setCustomizingItem(null);
  };

  const isLoading = isSellerLoading || areItemsLoading || isVenueLoading || (isConfigLoading && !solutionConfig);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking_widest text-muted-foreground">Initializing Menu...</p>
      </div>
    );
  }

  // ACCESS DENIED RENDER
  if (!isAccessValid) {
    return (
      <div className="flex flex-col min-h-screen bg-[#213147] items-center justify-center p-8 text-center text-white">
        <div className="bg-red-500/10 p-10 rounded-[3rem] border-2 border-red-500/20 shadow-2xl mb-8 animate-in zoom-in-95 duration-500">
           <Lock className="h-16 w-16 text-red-500 mx-auto mb-6" />
           <h2 className="font-headline font-black text-2xl uppercase tracking-tight mb-3">Secure Access Required</h2>
           <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
             This QR code link is either expired or invalid. Please scan the official Koop signage at your location.
           </p>
        </div>
        <Button variant="ghost" asChild className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest gap-2">
           <Link href="/"><ArrowLeft className="h-3 w-3" /> Return to Home</Link>
        </Button>
      </div>
    );
  }

  const availableModes = (seller?.menuTypes || []).filter(t => AUTHORIZED_SERVICE_MODES.includes(t)).filter(t => isModeAvailable(t));

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F0F0] relative">
      <header className="relative w-full flex flex-col bg-[#213147] overflow-hidden shrink-0 pt-4 pb-4 px-6 text-left">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[30px] border-white" />
        </div>
        <div className="relative z-10 flex flex-col items-start text-left space-y-4 max-w-2xl w-full mx-auto pt-2">
          <div className="flex items-center justify-between w-full gap-4">
            <h1 className="font-headline text-2xl font-black text-white uppercase tracking-tight leading-none truncate flex-1">{seller?.courseName}</h1>
            <Button 
              variant="ghost"
              className="flex items-center gap-2 h-11 px-3 text-white hover:bg-white/10 relative group bg-white/5 rounded-xl border border-white/10 shrink-0"
              onClick={goToReview}
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end leading-none mr-0.5">
                  <span className="text-[8px] uppercase font-black text-white/40 tracking-widest group-hover:text-white/60">Cart</span>
                  <span className="text-xs font-mono font-black text-white">${total.toFixed(2)}</span>
                </div>
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 text-white" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                      {totalItems}
                    </span>
                  )}
                </div>
              </div>
            </Button>
          </div>

          <div className="flex wrap gap-2">
            {(seller?.menuTypes || [])
              .filter(t => AUTHORIZED_SERVICE_MODES.includes(t))
              .map((type) => {
                const Icon = serviceTypeIcons[type] || Store;
                const available = availableModes.includes(type);
                const isSelected = selectedMenuType === type;
                return (
                  <button key={type} disabled={!available} onClick={() => updateMenuType(type)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg", isSelected ? "bg-primary text-white scale-105" : (available ? "bg-white/10 text-white hover:bg-white/20" : "bg-white/5 text-white/20 grayscale cursor-not-allowed border border-white/5"))}>
                    <Icon className="h-3.5 w-3.5" /> {type}
                  </button>
                );
              })}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white flex items-center gap-1.5">
              <Info className="h-2.5 w-2.5 shrink-0 text-primary" />
              {availableModes.includes(selectedMenuType) ? (SERVICE_INSTRUCTIONS[selectedMenuType] || 'Select items to begin your order') : 'Service currently unavailable.'}
            </p>
          </div>

          {/* REORDER - past orders at this venue, for this service mode, before Track Active Order */}
          {reorderSuggestions.length > 0 && (
            <div className="w-full mt-2 space-y-2 animate-in slide-in-from-bottom-2 duration-500">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40 px-1">
                Reorder
              </p>
              {reorderSuggestions.map((pastOrder) => (
                <button
                  key={pastOrder.id}
                  onClick={() => handleReorder(pastOrder)}
                  className="w-full group block bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl p-3 flex items-center gap-3 transition-all active:scale-[0.98] text-left"
                >
                  <div className="bg-white/10 p-2 rounded-xl shrink-0">
                    <RotateCcw className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-wide truncate flex-1 min-w-0">
                    {pastOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* ACTIVE ORDER PERSISTENCE LINKS */}
          {activeTrackingOrders.length > 0 && (
            <div className="w-full mt-2 space-y-2 animate-in slide-in-from-bottom-2 duration-500">
              {activeTrackingOrders.length > 1 && (
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40 px-1">
                  {activeTrackingOrders.length} Active Orders
                </p>
              )}
              {activeTrackingOrders.map((activeOrder) => (
                <Link
                  key={activeOrder.id}
                  href={`/order/track?id=${activeOrder.id}&sellerId=${sellerId}`}
                  className="w-full group block"
                >
                  <div className="bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-2xl p-3 flex items-center justify-between transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary p-2 rounded-xl animate-pulse shadow-lg">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1.5">Track Active Order</p>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[7px] font-black uppercase border-white/20 bg-white/5 text-white/80 h-3.5 px-1.5">{activeOrder.status}</Badge>
                           <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Live Delivery Updates</p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {availableModes.includes(selectedMenuType) ? (
        <>
          <div className="sticky top-0 z-[35] bg-white/95 backdrop-blur-md border-b-2 shadow-sm w-full">
            <div className="max-w-2xl auto px-0 py-3 space-y-3">
              <div className="flex items-center justify-center text-center px-4 py-0.5 animate-in fade-in slide-in-from-top-1 duration-500">
                <p className="text-[9px] font-black uppercase tracking-tight text-[#213147]">
                  <span className="opacity-40">Ordering from:</span> {seller?.courseName} <span className="text-primary">{selectedMenuType}</span>
                </p>
              </div>

              <div className="relative overflow-hidden">
                <div 
                  className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-4 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)]"
                >
                  {/* Featured has no jump pill - it's a small curated highlight reel, not a
                      section venues expect patrons to navigate to directly. */}
                  {currentCategories.filter((cat) => cat !== 'Featured').map((cat) => (
                    <button
                      key={cat}
                      onClick={() => scrollToCategory(cat)}
                      className={cn(
                        "whitespace-nowrap px-4 py-1.5 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0",
                        activeCategory === cat
                          ? "bg-primary border-primary text-white shadow-md scale-105"
                          : "bg-slate-50 border-slate-100 text-slate-500 hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 pt-8 pb-32 max-w-2xl mx-auto w-full">
            <BuyerMenu orderItems={orderItems} onUpdateItem={updateItem} onOpenModifiers={setCustomizingItem} currentCategories={currentCategories} menuItems={filteredMenuItems} selectedMenuType={selectedMenuType} />
          </main>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-slate-100 max-w-sm">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-6" />
            {isModeBusy(selectedMenuType) ? (
              <>
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-[#213147] mb-3">Very Busy Right Now</h2>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  {selectedMenuType || 'This channel'} has paused new orders while it catches up. Please check back shortly.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-[#213147] mb-3">Service Offline</h2>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  We don't have any staff active for {selectedMenuType || 'this channel'} at the moment. Please select another mode or check back soon.
                </p>
              </>
            )}
          </div>
          <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest border-2 h-12 px-8 rounded-full" onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      )}

      <Sheet open={!!customizingItem} onOpenChange={(o) => !o && setCustomizingItem(null)}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[90vh] flex flex-col p-0 overflow-hidden outline-none">
          <SheetHeader className="px-6 py-5 border-b bg-[#213147] text-white shrink-0 text-left">
            <div className="max-w-xl mx-auto w-full flex flex-col items-start relative pr-10">
              <SheetTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Customize Item</SheetTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{customizingItem?.name}</p>
              <SheetClose className="absolute right-0 top-0 text-white/40 hover:text-white"><X className="h-6 w-6" /></SheetClose>
            </div>
          </SheetHeader>
          {customizingItem && <ModifierSelector item={customizingItem} onConfirm={handleConfirmModifiers} onCancel={() => setCustomizingItem(null)} />}
        </SheetContent>
      </Sheet>

      {totalItems > 0 && !customizingItem && (
        <div className="fixed bottom-7 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-40">
          <div className="max-w-xl mx-auto px-2">
            <Button
              size="lg"
              className="w-full h-14 font-black uppercase tracking-widest shadow-xl flex justify-between px-6 sm:px-8"
              onClick={goToReview}
            >
              <div className="flex items-center gap-2 sm:gap-3"><span>REVIEW ORDER</span><span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full">{totalItems} ITEMS</span></div>
              <span className="bg-white/20 px-3 py-1 rounded-lg">${total.toFixed(2)}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuyerOrderPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);

  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-[10px] font-black uppercase tracking_widest text-muted-foreground">Initializing Menu Feed...</p>
      </div>
    }>
      <BuyerOrderContent sellerId={sellerId} />
    </Suspense>
  );
}
