'use client';

import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { collection, query, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order, Seller, StaffMember } from '@/lib/types';
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
  Heart, 
  BellRing, 
  ArrowRight, 
  MapPin, 
  User, 
  ChevronLeft,
  Store
} from 'lucide-react';
import { getNumericOrderId, playNotificationSound } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { FEE_DISCLOSURES, getDisclosureCategory } from '@/config/fee-disclosures';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { toast } = useToast();
  
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
    const requestWakeLock = async () => {
      if (isEmbedded || typeof window === 'undefined') return;
      if ('wakeLock' in navigator && order && !isDelivered && isGolf) {
        try {
          const nav = navigator as any;
          if (nav.wakeLock) {
            wakeLockRef.current = await nav.wakeLock.request('screen');
          }
        } catch (err) {
          console.warn('Wake Lock request denied:', err);
        }
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [order?.status, isGolf, isDelivered]);

  useEffect(() => {
    if (!order || !firestore || isDelivered) return;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          updateDoc(doc(firestore, 'orders', order.id), { 
            deliveryLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
            lastGpsUpdate: serverTimestamp() 
          });
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [order?.status, order?.id, firestore, isDelivered]);

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

  const handleEnableNotifications = () => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          playNotificationSound();
          toast({ title: "Alerts Enabled", description: "You will now receive sound alerts when your driver arrives." });
        }
      });
    }
  };

  const disclosureCategory = getDisclosureCategory(seller?.type);
  const statusNotice = FEE_DISCLOSURES[disclosureCategory].status;

  const isLoading = isOrderLoading || isSellerLoading;

  if (isLoading) return <div className="flex-1 flex items-center justify-center p-8 min-h-screen bg-[#213147]"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!order) return <div className="p-8 text-center min-h-screen bg-[#213147] flex flex-col items-center justify-center text-white"><p>Order not found.</p><Button asChild className="mt-4"><Link href="/">Back Home</Link></Button></div>;

  const isDriverAttached = order.status !== 'Placed' && order.status !== 'Cancelled';
  const driverLocation = assignedStaff?.latitude ? { latitude: assignedStaff.latitude, longitude: assignedStaff.longitude } : (seller?.latitude ? { latitude: seller.latitude, longitude: seller.longitude } : null);
  const showBilateral = isDriverAttached && !!driverLocation;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* 1. MAP / COMPLETION VIEW (Primary focus at top) */}
      {!isBowling && (
        <div className="h-[35vh] relative border-b-2 shadow-sm shrink-0 overflow-hidden bg-slate-900">
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

      {/* 2. DETAILS & STATUS */}
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-24 flex-1">
        
        {/* RE-INTEGRATED STATUS BAR CARD */}
        <Card className="shadow-md overflow-hidden border-2 border-slate-100 animate-in slide-in-from-top-4 duration-500">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Delivery Feed</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-[#213147] text-white font-black text-xs px-3">#{getNumericOrderId(order.id)}</Badge>
                  {queuePosition !== null && !isDelivered && (
                    <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/20 bg-primary/5 text-primary">
                      {queuePosition === 1 ? 'Next' : `${queuePosition}${queuePosition === 2 ? 'nd' : queuePosition === 3 ? 'rd' : 'th'}`} in Queue
                    </Badge>
                  )}
                </div>
              </div>
              <Link href={`/sellers/${order.sellerId}/order`} className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:underline">
                <ChevronLeft className="h-3 w-3" /> New Order
              </Link>
            </div>
            <OrderStatus currentStatus={order.status} />
          </CardContent>
        </Card>

        {/* WAKE LOCK & LIVE SYNC NOTIFICATION */}
        {!isDelivered && isGolf && (
          <div className="bg-[#213147] rounded-2xl p-4 shadow-xl border-t-2 border-primary/30 flex items-center gap-4">
            <div className="bg-primary/20 p-2.5 rounded-xl shrink-0">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Signal Precision Active</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-white/60 uppercase leading-relaxed">
                Your device is locked open for precise delivery.
              </p>
            </div>
            <Smartphone className="h-5 w-5 text-white/20" />
          </div>
        )}

        {/* NOTIFICATION STATUS INDICATOR */}
        {notificationPermission !== 'granted' && !isDelivered && (
          <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <BellRing className="h-5 w-5 text-amber-600" />
               <div className="text-left">
                 <p className="text-[10px] font-black uppercase text-amber-700">Arrival Alerts</p>
                 <p className="text-[8px] font-bold text-amber-600/70 uppercase">Get sound alerts for driver arrival</p>
               </div>
             </div>
             <Button size="sm" className="bg-amber-600 h-8 text-[9px] font-black uppercase tracking-widest" onClick={handleEnableNotifications}>Enable</Button>
          </div>
        )}

        {/* VENUE IDENTITY CARD */}
        {!isDelivered && (
          <div className="bg-white rounded-2xl p-5 border-2 border-slate-100 shadow-sm flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-xl shrink-0">
              <Heart className="h-5 w-5 text-primary fill-primary/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-black text-sm uppercase tracking-tight text-[#213147]">
                Ordering from {seller?.courseName}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Store className="h-2.5 w-2.5" /> {order.menuType} Service
              </p>
            </div>
          </div>
        )}

        {isBowling && isDelivered && (
          <Card className="bg-[#213147] border-0 shadow-xl overflow-hidden rounded-[2.5rem]">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="bg-primary/20 p-4 rounded-3xl">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl font-black uppercase text-white tracking-tight leading-none">Order Filled</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-3">Thanks for ordering from your lane</p>
              </div>
              <Button asChild size="lg" className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest gap-2 shadow-2xl rounded-2xl">
                <Link href={`/sellers/${order.sellerId}/order`}>
                  New Order <ShoppingBag className="h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader className="py-3 px-6 bg-muted/30 border-b flex flex-row items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Order Details</h3>
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
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
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

        {/* FEE DISCLOSURE */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl flex items-start gap-3">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed">
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
