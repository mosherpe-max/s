'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, MapPin, Focus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/map-view';

export default function LaneSideServerDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [now, setNow] = useState<number>(Date.now());
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const lastOrderIdsRef = useRef<Set<string>>(new Set());

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const isServerActive = primarySeller?.lanedeliveryActive === true;

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { lanedeliveryActive: checked }).catch(() => {});
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

  const lanesideOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Lane Delivery');
  }, [activeOrders]);

  useEffect(() => {
    if (!lanesideOrders || !now) return;
    const currentOrderIds = new Set(lanesideOrders.map(o => o.id));
    const newOrders = lanesideOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && lastOrderIdsRef.current.size > 0) {
      toast({ title: "NEW LANE ORDER!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
  }, [lanesideOrders, now, toast]);

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
    return lanesideOrders.map(o => ({ 
      id: o.id, 
      name: o.customerName, 
      location: o.deliveryLocation, 
      colorClass: "bg-pink-600" 
    }));
  }, [lanesideOrders]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight">LANESIDE PORTAL</h1>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 text-white border-white/10 uppercase">
            {primarySeller?.courseName || 'Venue'}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isServerActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        {/* Map View for Laneside (mostly symbolic but shows layout density) */}
        <div className="relative w-full md:w-1/2 h-[35vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
          <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
          {primarySeller?.latitude ? (
            <MapView 
              sellerLocation={{ latitude: primarySeller.latitude, longitude: primarySeller.longitude }} 
              buyers={mappedBuyers} 
              fitTrigger={fitTrigger}
              showPrimaryMarker={true} 
            />
          ) : <Skeleton className="w-full h-full" />}
        </div>

        <div className="w-full md:w-1/2 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0">
          <h2 className="font-headline text-xs font-black px-4 py-3 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10">
            <span>Pending Deliveries</span>
            <Badge variant="secondary">{lanesideOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 gap-4">
              {isLoading ? <Skeleton className="h-48 w-full" /> : lanesideOrders.length === 0 ? (
                <div className="py-32 text-center text-muted-foreground opacity-40">
                  <MapPin className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase">No active lane deliveries</p>
                </div>
              ) : (
                lanesideOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} orderNumber={index + 1} now={now} onUpdateStatus={handleUpdateOrderStatus} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
