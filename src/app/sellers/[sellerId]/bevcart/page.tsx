'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { MapView } from '@/components/map-view';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus, Package, LogOut, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function BevCartDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const wakeLockRef = useRef<any>(null);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  // Initialize seller location from venue coordinates immediately
  useEffect(() => {
    if (primarySeller?.latitude && primarySeller?.longitude && !sellerLocation) {
      setSellerLocation({ latitude: primarySeller.latitude, longitude: primarySeller.longitude });
    }
  }, [primarySeller, sellerLocation]);

  const isBevCartActive = primarySeller?.bevcartActive === true;

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { bevcartActive: checked }).catch(() => {});
  };

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', sellerId),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, sellerId]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

  const allOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(collection(firestore, 'orders'), where('sellerId', '==', sellerId));
  }, [firestore, sellerId]);

  const { data: allOrders } = useCollection<Order>(allOrdersQuery);

  const driverOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Beverage Cart');
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    const bevOrdersToday = allOrders.filter(o => o.menuType === 'Beverage Cart' && o.createdAt && isToday(o.createdAt.toDate()));
    const deliveredToday = bevOrdersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);
    return { dailyTips, count: deliveredToday.length };
  }, [allOrders]);

  useEffect(() => {
    if (!driverOrders || !now) return;
    const currentOrderIds = new Set(driverOrders.map(o => o.id));
    const newOrders = driverOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      toast({ title: "NEW ORDER RECEIVED!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [driverOrders, now, toast]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (navigator.geolocation && firestore && sellerId) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setSellerLocation({ latitude: lat, longitude: lng });
          
          // BROADCAST LIVE GPS TO FIRESTORE FOR ADMIN MONITORING
          updateDoc(doc(firestore, 'sellers', sellerId), {
            latitude: lat,
            longitude: lng,
            lastActive: serverTimestamp()
          }).catch(err => console.error("GPS Broadcast Failed", err));
        },
        null,
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [firestore, sellerId]);

  const handleUpdateOrderStatus = (orderId: string, currentStatus: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(currentStatus as any) + 1;
    
    if (nextIdx < stages.length) {
      const nextStatus = stages[nextIdx];
      updateDoc(doc(firestore, 'orders', orderId), { 
        status: nextStatus, 
        deliveredAt: nextStatus === 'Delivered' ? serverTimestamp() : null 
      }).catch((err) => {
        console.error("Status update failed:", err);
      });
    }
  };

  const mappedBuyers = useMemo(() => {
    if (!now || !driverOrders) return [];
    return driverOrders.map(o => ({ 
      id: o.id, 
      name: o.customerName, 
      location: o.deliveryLocation, 
      colorClass: o.status === 'Out for Delivery' ? "bg-blue-600" : "bg-green-600" 
    }));
  }, [driverOrders, now]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight">BEVCART PORTAL</h1>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 text-white border-white/10 uppercase">
            {primarySeller?.courseName || 'Loading...'}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isBevCartActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 py-2 bg-background border-b flex items-center justify-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Daily Tips</span>
          <span className="text-xs font-bold">${metrics?.dailyTips.toFixed(2) || '0.00'}</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Deliveries</span>
          <span className="text-xs font-bold">{metrics?.count || '0'}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
         <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
          {sellerLocation ? (
            <MapView 
              sellerLocation={sellerLocation} 
              buyers={mappedBuyers} 
              radius={1609.34} 
              fitTrigger={fitTrigger}
              showPrimaryMarker={isBevCartActive} 
              primaryDriverId={sellerId} 
            />
          ) : <Skeleton className="w-full h-full" />}
        </div>
        <div className="w-full md:w-1/3 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0">
          <h2 className="font-headline text-xs font-black px-4 py-3 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <span>Active Orders</span>
            <span className="bg-[#E50000] text-white text-[10px] font-black rounded-full px-2 py-0.5">{driverOrders.length}</span>
          </h2>
          <ScrollArea className="flex-1 px-2">
            <div className="py-2.5 space-y-3">
              {isLoading ? <Skeleton className="h-40 w-full" /> : driverOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40">
                  <Package className="h-10 w-10 mb-2" />
                  <p className="text-[10px] font-black uppercase">No active orders</p>
                </div>
              ) : (
                driverOrders.map((order, index) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={index + 1} 
                    now={now} 
                    onUpdateStatus={handleUpdateOrderStatus}
                    thresholds={primarySeller?.orderThresholds?.[order.menuType]}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
