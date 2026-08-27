'use client';

import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { collection, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order, Seller, StaffMember, SolutionConfig } from '@/lib/types';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  ShoppingBag, 
  Loader2, 
  Info, 
  Smartphone, 
  Zap, 
  PartyPopper, 
  ArrowRight, 
  MapPin, 
  ChevronLeft,
  Store,
  RefreshCcw,
  Satellite,
  Sun,
  Moon
} from 'lucide-react';
import { cn, getNumericOrderId, calculateDistance } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FEE_DISCLOSURES, getDisclosureCategory } from '@/config/fee-disclosures';
import { differenceInSeconds } from 'date-fns';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { toast } = useToast();
  
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const [now, setNow] = useState<Date>(new Date());
  const [isWakeLockActive, setIsWakeLockActive] = useState(true);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  const orderRef = useMemoFirebase(() => (firestore && orderId ? doc(firestore, 'orders', orderId) : null), [firestore, orderId]);
  const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderRef);

  const sellerRef = useMemoFirebase(() => (firestore && order?.sellerId ? doc(firestore, 'sellers', order.sellerId) : null), [firestore, order?.sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const staffRef = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId || !order?.assignedStaffId) return null;
    return doc(firestore, 'sellers', order.sellerId, 'staff', order.assignedStaffId);
  }, [firestore, order?.sellerId, order?.assignedStaffId]);
  const { data: assignedStaff } = useDoc<StaffMember>(staffRef);

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId || !order?.menuType) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', order.sellerId),
      where('menuType', '==', order.menuType),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, order?.sellerId, order?.menuType]);
  const { data: activeOrders } = useCollection<Order>(activeOrdersQuery);

  const queuePosition = useMemo(() => {
    if (!activeOrders || !order) return null;
    const sortedOrders = [...activeOrders].sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
    const position = sortedOrders.findIndex(o => o.id === order.id);
    return position === -1 ? null : position + 1;
  }, [activeOrders, order]);

  const isGolf = seller?.type?.toLowerCase().includes('golf');
  const isBowling = seller?.type?.toLowerCase().includes('bowling');
  const isDelivered = order?.status === 'Delivered';

  // HIGH-PRECISION COUNTER: Update 'now' every second for the signal counter
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
    
    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          console.warn('Wake Lock release failed:', err);
        }
      }
    };

    const requestLock = async () => {
      if (isEmbedded || typeof window === 'undefined') return;
      
      if (!isWakeLockActive) {
        await releaseLock();
        return;
      }

      if ('wakeLock' in navigator && order && !isDelivered && isGolf) {
        try {
          const nav = navigator as any;
          if (nav.wakeLock && !wakeLockRef.current) {
            wakeLockRef.current = await nav.wakeLock.request('screen');
          }
        } catch (err) {
          console.warn('Wake Lock request denied:', err);
        }
      }
    };

    requestLock();

    return () => {
      releaseLock();
    };
  }, [order?.status, isGolf, isDelivered, isWakeLockActive]);

  const broadcastCurrentLocation = (position: GeolocationPosition) => {
    if (!order || !firestore || isDelivered) return;
    const nowTime = Date.now();
    const syncInterval = (solutionConfig?.gpsRefreshIntervalSeconds || 30) * 1000;
    
    if (nowTime - lastBroadcastTimeRef.current < syncInterval) return;

    lastBroadcastTimeRef.current = nowTime;
    updateDoc(doc(firestore, 'orders', order.id), { 
      deliveryLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      lastGpsUpdate: serverTimestamp() 
    });
  };

  useEffect(() => {
    if (!order || !firestore || isDelivered) return;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        broadcastCurrentLocation,
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [order?.status, order?.id, firestore, isDelivered, solutionConfig?.gpsRefreshIntervalSeconds]);

  const handleManualRefresh = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      toast({ title: "Refreshing Signal", description: "Updating your location on the map..." });
      navigator.geolocation.getCurrentPosition(
        (p) => {
          broadcastCurrentLocation(p);
          toast({ title: "Signal Restored", description: "Your location is now up to date." });
        },
        () => toast({ variant: "destructive", title: "Signal Failed", description: "Please check your GPS settings." }),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleUpdateLane = (lane: string) => {
    if (!firestore || !order) return;
    const newLocation = `Lane ${lane}`;
    updateDoc(doc(firestore, 'orders', order.id), { 
      menuTypeLocation: newLocation,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({ title: "Lane Updated", description: `Staff will now deliver to ${newLocation}.` });
    });
  };

  const disclosureCategory = getDisclosureCategory(seller?.type);
  const statusNotice = FEE_DISCLOSURES[disclosureCategory].status;

  const isLoading = isOrderLoading || isSellerLoading;

  if (isLoading) return <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-[#213147]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!order) return <div className="p-8 text-center min-h-screen bg-[#213147] flex flex-col items-center justify-center text-white"><p>Order not found.</p><Button asChild className="mt-4"><Link href="/">Back Home</Link></Button></div>;

  const isDriverAttached = order.status !== 'Placed' && order.status !== 'Cancelled';
  const driverLocation = assignedStaff?.latitude ? { latitude: assignedStaff.latitude, longitude: assignedStaff.longitude } : (seller?.latitude ? { latitude: seller.latitude, longitude: seller.longitude } : null);
  const showBilateral = isDriverAttached && !!driverLocation;

  const lastGpsTime = order.lastGpsUpdate?.toDate();
  const secondsSinceUpdate = lastGpsTime ? differenceInSeconds(now, lastGpsTime) : 999;
  const staleThreshold = solutionConfig?.patronGpsStaleThresholdSeconds || 120;
  const isSignalStale = secondsSinceUpdate >= staleThreshold;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 1. PRIMARY STATUS TILE AT TOP - Koop Blue Background */}
      <div className="bg-[#213147] border-b-2 border-primary/20 shadow-lg shrink-0 z-20">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="font-headline text-sm font-black uppercase tracking-tight text-white leading-tight max-w-[90%] mx-auto">
              Thanks for ordering from {seller?.courseName} {order.menuType} Service
            </h2>
            {queuePosition !== null && !isDelivered && (
              <Badge variant="outline" className="text-[10px] font-black uppercase border-white/20 bg-white/5 text-white rounded-md px-3 h-6">
                {queuePosition === 1 ? 'You are Next' : `${queuePosition}${queuePosition === 2 ? 'nd' : queuePosition === 3 ? 'rd' : 'th'} in Delivery Queue`}
              </Badge>
            )}
          </div>
          <OrderStatus currentStatus={order.status} isDark />
        </div>
      </div>

      {/* 2. MAP / COMPLETION VIEW */}
      {!isBowling && (
        <div className="h-[35vh] relative border-b shadow-sm shrink-0 overflow-hidden bg-slate-900">
          {!isDelivered && isGolf && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsWakeLockActive(!isWakeLockActive)}
              className="absolute top-3 left-3 z-30 h-8 px-3 rounded-full bg-white/90 backdrop-blur-md shadow-lg border-2 border-white flex items-center gap-2 group hover:bg-white transition-all active:scale-95"
            >
              {isWakeLockActive ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#213147]">Screen staying on</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-400 fill-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Screen can sleep</span>
                </>
              )}
            </Button>
          )}

          {isDelivered ? (
            <div className="absolute inset-0 bg-[#213147] flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in duration-700">
               <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[30px] border-white" />
              </div>
              <div className="relative z-10 space-y-4 flex flex-col items-center">
                <div className="bg-primary/20 p-4 rounded-[2rem] border-2 border-primary/30">
                  <PartyPopper className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="font-headline text-2xl font-black uppercase text-white tracking-tight leading-none">Order Delivered</h2>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-3">Enjoy your time at {seller?.courseName}</p>
                </div>
                <Button asChild className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest gap-2 shadow-2xl rounded-full">
                  <Link href={`/sellers/${order.sellerId}/order`}>
                    Order Again <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <MapView 
              sellerLocation={showBilateral ? driverLocation! : undefined} 
              buyerLocation={order.deliveryLocation} 
              primaryType={order.menuType}
              primaryDriverId={order.assignedStaffId}
              radius={order.status === 'Placed' ? 804.672 : undefined}
              zoomMode={order.status === 'Placed' ? 'radius' : 'all'}
              showPrimaryMarker={showBilateral}
              interactive={false} 
            />
          )}
        </div>
      )}

      {/* 3. DETAILS & CONTROLS */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-24 flex-1">
        
        {!isDelivered && isGolf && (
          <div className={cn(
            "rounded-2xl p-4 shadow-md border-2 transition-all duration-500 flex items-center justify-between gap-4",
            isSignalStale ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                isSignalStale ? "bg-red-500 text-white animate-pulse" : "bg-green-500 text-white"
              )}>
                <Satellite className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isSignalStale ? "text-red-700" : "text-green-700"
                )}>
                  Location update {secondsSinceUpdate}s ago
                </p>
                <p className={cn(
                  "text-[8px] font-bold uppercase",
                  isSignalStale ? "text-red-600/70" : "text-green-600/70"
                )}>
                  {isSignalStale ? "Driver may struggle to find you" : "High-precision lock active"}
                </p>
              </div>
            </div>
            {isSignalStale && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleManualRefresh}
                className="h-9 px-3 bg-white border-red-200 text-red-600 font-black uppercase text-[9px] gap-2 hover:bg-red-50"
              >
                <RefreshCcw className="h-3 w-3" /> Refresh
              </Button>
            )}
          </div>
        )}

        <Card className="shadow-md border-2 border-slate-100">
          <CardHeader className="py-3 px-6 bg-muted/30 border-b flex flex-row items-center justify-between">
            <div className="flex flex-col text-left">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Order Details</h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Ticket #{getNumericOrderId(order.id)}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {!isDelivered && (
                <Link 
                  href={`/sellers/${order.sellerId}/order`} 
                  className="flex items-center gap-1 text-[9px] font-black uppercase text-primary hover:underline transition-all"
                >
                  <ChevronLeft className="h-3 w-3" /> Return to Menu
                </Link>
              )}
              
              {isBowling && order.menuTypeLocation && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary text-white font-black uppercase text-[10px] px-2">
                    {order.menuTypeLocation}
                  </Badge>
                  {!isDelivered && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-[9px] font-black uppercase text-primary underline">Edit</button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 rounded-[1.5rem]">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Correct Your Lane</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {Array.from({ length: seller?.laneCount || 20 }, (_, i) => (i + 1).toString()).map(l => (
                              <Button 
                                key={l} 
                                variant={order.menuTypeLocation === `Lane ${l}` ? 'default' : 'outline'} 
                                size="sm" 
                                onClick={() => handleUpdateLane(l)} 
                                className="h-8 p-0 text-[10px] font-bold"
                              >
                                {l}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-left">
            <div className="space-y-2">
              <p className="text-[9px] font-black text-muted-foreground uppercase">Items</p>
              {order.items.map(i => (
                <div key={i.cartId} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="font-bold uppercase">{i.quantity}x {i.name}</span>
                    <span className="font-mono text-muted-foreground">${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                  {i.selectedModifiers && Object.values(i.selectedModifiers).flat().length > 0 && (
                    <div className="flex wrap gap-1 pl-4">
                      {Object.values(i.selectedModifiers).flat().map((mod, idx) => (
                        <span key={`${i.cartId}-mod-${idx}`} className="text-[8px] font-bold text-muted-foreground uppercase">
                          + {mod.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator className="border-dashed" />

            <div className="space-y-2.5">
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span>Subtotal</span>
                 <span className="font-mono">${order.subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span>Tax</span>
                 <span className="font-mono">${order.tax.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span>Gratuity</span>
                 <span className="font-mono">${order.tip.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <div className="flex items-center gap-1.5">
                   <span>Platform Fee</span>
                   <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-slate-300 hover:text-primary"><Info className="h-3 w-3" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="text-[10px] normal-case p-3 rounded-xl max-w-[200px]">
                      Supports the mobile ordering solution and real-time delivery logistics.
                    </PopoverContent>
                   </Popover>
                 </div>
                 <span className="font-mono">${order.serviceFee.toFixed(2)}</span>
               </div>
            </div>

            <Separator />
            
            <div className="flex justify-between font-black text-lg uppercase tracking-tight text-[#213147]">
              <span>Total Paid</span>
              <span className="text-primary">${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed text-left">
            {statusNotice}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#213147]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
      <OrderTrackingContent />
    </Suspense>
  );
}
