'use client';

import { Suspense, useEffect, useRef, useState, use } from 'react';
import { collection, query, orderBy, limit, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, MapPin, Loader2, Store, ClipboardList, Satellite, Info, Smartphone, Zap, Edit2 } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { getNumericOrderId } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { toast } = useToast();
  
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const orderRef = useMemoFirebase(() => (firestore && orderId ? doc(firestore, 'orders', orderId) : null), [firestore, orderId]);
  const { data: order, isLoading: isOrderLoading } = useDoc<Order>(orderRef);

  const sellerRef = useMemoFirebase(() => (firestore && order?.sellerId ? doc(firestore, 'sellers', order.sellerId) : null), [firestore, order?.sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const isGolf = seller?.type?.toLowerCase().includes('golf');
  const isBowling = seller?.type?.toLowerCase().includes('bowling');

  // Implement Screen Wake Lock - ONLY FOR GOLF COURSES
  useEffect(() => {
    const requestWakeLock = async () => {
      // Only request wake lock for golf courses where tracking is active
      if ('wakeLock' in navigator && order && order.status !== 'Delivered' && isGolf) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error('Wake Lock failed:', err);
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [order?.status, isGolf]);

  useEffect(() => {
    if (!order || !firestore || order.status === 'Delivered') return;

    if (navigator.geolocation) {
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
  }, [order?.status, order?.id, firestore]);

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

  const orderStatusNotice = isGolf 
    ? "A convenience fee was applied to this order for mobile ordering on the course."
    : isBowling 
    ? "A convenience fee was applied to this order for lane-side mobile ordering."
    : "A small convenience fee was applied to support mobile ordering logistics.";

  const isLoading = isOrderLoading || isSellerLoading;

  if (isLoading) return <div className="flex-1 flex items-center justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!order) return <div className="p-8 text-center"><p>Order not found.</p><Button asChild className="mt-4"><Link href="/">Back Home</Link></Button></div>;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      {/* Map View - Only shown for non-bowling venues (e.g., Golf Courses) */}
      {!isBowling && (
        <div className="h-[40vh] relative border-b-2">
          <MapView sellerLocation={seller ? { latitude: seller.latitude, longitude: seller.longitude } : undefined} buyerLocation={order.deliveryLocation} interactive={true} />
        </div>
      )}

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">
        
        {/* WAKE LOCK & LIVE SYNC NOTIFICATION - ONLY FOR GOLF COURSES */}
        {order.status !== 'Delivered' && isGolf && (
          <div className="bg-[#213147] rounded-2xl p-4 shadow-xl border-t-2 border-primary/30 flex items-center gap-4 animate-in slide-in-from-top-4 duration-700">
            <div className="bg-primary/20 p-2.5 rounded-xl shrink-0">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Live Sync Active</p>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-white/60 uppercase leading-relaxed">
                Screen is locked open for precision. Keep this page visible for the best delivery service.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center">
              <Smartphone className="h-5 w-5 text-white/20 mb-0.5" />
              <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">Locked</span>
            </div>
          </div>
        )}

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="py-4 px-6 flex flex-row items-center justify-between border-b bg-muted/20">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Status</span>
              {isBowling && order.menuTypeLocation && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary text-white font-black uppercase tracking-tight text-[11px] px-3">
                    {order.menuTypeLocation}
                  </Badge>
                  {order.status !== 'Delivered' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 text-[9px] font-black uppercase text-primary hover:text-primary/80 transition-colors">
                          <Edit2 className="h-2.5 w-2.5" /> Change
                        </button>
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
            <Badge variant="outline" className="font-mono text-[9px]">#{getNumericOrderId(order.id)}</Badge>
          </CardHeader>
          <CardContent className="px-6 py-8">
            <OrderStatus currentStatus={order.status} />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="py-3 px-6 bg-muted/30 border-b">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Details</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[9px] font-black text-muted-foreground uppercase">Venue</p><p className="text-xs font-bold">{seller?.courseName}</p></div>
              <div className="text-right"><p className="text-[9px] font-black text-muted-foreground uppercase">Service</p><p className="text-xs font-bold">{order.menuType}</p></div>
            </div>
            
            <div className="space-y-2">
              <p className="text-[9px] font-black text-muted-foreground uppercase">Items</p>
              {order.items.map(i => (
                <div key={i.cartId} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{i.quantity}x {i.name}</span>
                    <span className="font-mono">${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                  {i.selectedModifiers && Object.values(i.selectedModifiers).flat().length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-4">
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
                   <span>Convenience Fee</span>
                   <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-slate-300 hover:text-primary transition-colors">
                        <Info className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="text-[10px] normal-case tracking-normal p-3 rounded-xl max-w-[200px]">
                      This fee supports the mobile ordering platform and real-time delivery logistics.
                    </PopoverContent>
                   </Popover>
                 </div>
                 <span className="font-mono">${order.serviceFee.toFixed(2)}</span>
               </div>
            </div>

            <Separator />
            
            <div className="flex justify-between font-black text-lg uppercase tracking-tight text-[#213147]">
              <span>Total</span>
              <span className="text-primary">${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Convenience Fee Notice */}
        <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight leading-relaxed">
            {orderStatusNotice}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
        <OrderTrackingContent />
      </Suspense>
    </APIProvider>
  );
}
