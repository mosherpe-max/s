'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, Building, LayoutList, Focus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/map-view';
import { cn } from '@/lib/utils';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function ClubhouseDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [now, setNow] = useState<number>(Date.now());
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const lastOrderIdsRef = useRef<Set<string>>(new Set());

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const isGolf = primarySeller?.type?.toLowerCase().includes('golf');
  const isClubhouseActive = primarySeller?.clubhouseActive === true;

  // Track Server Location for Golf Courses
  useEffect(() => {
    if (isGolf && navigator.geolocation && firestore && sellerId) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setSellerLocation({ latitude: lat, longitude: lng });
          
          // BROADCAST LIVE GPS TO FIRESTORE
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
  }, [isGolf, firestore, sellerId]);

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { clubhouseActive: checked }).catch(() => {});
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

  const clubhouseOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Clubhouse' || o.menuType === 'Take Out');
  }, [activeOrders]);

  useEffect(() => {
    if (!clubhouseOrders || !now) return;
    const currentOrderIds = new Set(clubhouseOrders.map(o => o.id));
    const newOrders = clubhouseOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && lastOrderIdsRef.current.size > 0) {
      toast({ title: "NEW CLUBHOUSE ORDER!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
  }, [clubhouseOrders, now, toast]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

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
    if (!now || !clubhouseOrders) return [];
    // Only map delivery orders (not Take Out) for the satellite view
    return clubhouseOrders
      .filter(o => o.menuType === 'Clubhouse')
      .map(o => ({ 
        id: o.id, 
        name: o.customerName, 
        location: o.deliveryLocation, 
        colorClass: o.status === 'Out for Delivery' ? "bg-blue-600" : "bg-indigo-600" 
      }));
  }, [clubhouseOrders, now]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight">CLUBHOUSE PORTAL</h1>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 text-white border-white/10 uppercase">
            {primarySeller?.courseName || 'Loading...'}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isClubhouseActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        {/* Map View - Only for Golf Delivery */}
        {isGolf && (
          <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
            <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
            {primarySeller ? (
              <MapView 
                sellerLocation={sellerLocation || { latitude: primarySeller.latitude, longitude: primarySeller.longitude }} 
                buyers={mappedBuyers} 
                radius={1609.34} 
                fitTrigger={fitTrigger}
                showPrimaryMarker={isClubhouseActive} 
                primaryDriverId={sellerId} 
              />
            ) : <Skeleton className="w-full h-full" />}
          </div>
        )}

        <div className={cn(
          "flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0",
          isGolf ? "w-full md:w-1/3" : "w-full max-w-4xl mx-auto"
        )}>
          <h2 className="font-headline text-xs font-black px-4 py-3 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span>Orders Queue</span>
            </div>
            <Badge variant="secondary" className="font-black">{clubhouseOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1 px-2">
            <div className={cn(
              "py-2.5 gap-3",
              isGolf ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4"
            )}>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : clubhouseOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground opacity-40">
                  <Building className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No active orders</p>
                </div>
              ) : (
                clubhouseOrders.map((order, index) => (
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
