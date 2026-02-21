
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, Package, AlertCircle, Clock, MapPin, DollarSign, Timer, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format, isToday } from 'date-fns';

export default function LaneSideServerDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [now, setNow] = useState<number>(Date.now());
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  // For Laneside, we use "clubhouseActive" as the toggle for simplicity in prototyping
  const isServerActive = primarySeller?.clubhouseActive === true;
  const thresholds = primarySeller?.orderThresholds?.['Lane Delivery'] || { warning: 7, max: 10 };

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
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', sellerId)
    );
  }, [firestore, sellerId]);

  const { data: allOrders } = useCollection<Order>(allOrdersQuery);

  const lanesideOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Lane Delivery');
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders || !primarySeller) return null;
    
    const laneOrdersToday = allOrders.filter(o => 
      o.menuType === 'Lane Delivery' && 
      o.createdAt && 
      isToday(o.createdAt.toDate())
    );

    const activeCount = lanesideOrders.length;
    const deliveredToday = laneOrdersToday.filter(o => o.status === 'Delivered');
    const totalDollars = deliveredToday.reduce((acc, o) => acc + (o.total || 0), 0);
    
    let totalMinutes = 0;
    deliveredToday.forEach(o => {
      if (o.deliveredAt && o.createdAt) {
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        totalMinutes += duration;
      }
    });
    
    const avgTime = deliveredToday.length > 0 ? totalMinutes / deliveredToday.length : 0;
    const thresholdMax = thresholds.max;
    
    const exceededCount = laneOrdersToday.filter(o => {
      if (o.status === 'Delivered' && o.deliveredAt && o.createdAt) {
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        return duration > thresholdMax;
      }
      if (o.createdAt) {
        const duration = (now - o.createdAt.toDate().getTime()) / 60000;
        return duration > thresholdMax;
      }
      return false;
    }).length;

    return {
      activeCount,
      totalDollars,
      avgTime,
      exceededCount
    };
  }, [allOrders, lanesideOrders, primarySeller, now, thresholds.max]);

  useEffect(() => {
    if (!lanesideOrders || !now) return;

    const currentOrderIds = new Set(lanesideOrders.map(o => o.id));
    const newOrders = lanesideOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-bold text-lg text-primary uppercase">NEW LANE ORDER!</span>
          </div>
        ),
        description: `New order for ${newOrders[0].menuTypeLocation || 'a lane'}.`,
      });
    }
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [lanesideOrders, now, toast]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status'], driverId?: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updates: any = { status };
    if (driverId) updates.assignedDriverId = driverId;
    if (status === 'Delivered') updates.deliveredAt = serverTimestamp();
    
    updateDoc(orderRef, updates)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
      });
  };

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    updateDoc(sellerDocRef, { clubhouseActive: checked })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerDocRef.path,
          operation: 'update',
          requestResourceData: { clubhouseActive: checked }
        }));
      });
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  if (!isPrimaryLoading && !primarySeller) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center space-y-6 text-muted-foreground">
        <AlertCircle className="h-16 w-16 opacity-20" />
        <h1 className="text-2xl font-headline font-bold uppercase text-[#213147]">LANESIDE SERVER INTERFACE</h1>
        <p className="max-w-sm">Please ensure the bowling alley seller profile is initialized.</p>
        <Button asChild><Link href="/admin">Go to Admin</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0 flex-1 mr-4">
          <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold text-white uppercase tracking-tight truncate">
            LANESIDE SERVER
          </h1>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none truncate">
            {primarySeller?.courseName || 'Bowling Alley'}
          </span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <Switch id="server-active" checked={isServerActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Label htmlFor="server-active" className="text-[10px] sm:text-sm font-semibold whitespace-nowrap text-white uppercase">
            {isServerActive ? 'ONLINE' : 'OFFLINE'}
          </Label>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
           <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full shrink-0"><Package className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Active Orders</p>
                <p className="text-xl font-headline font-bold">{metrics?.activeCount ?? 0}</p>
              </div>
           </div>
           <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full shrink-0"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Delivered Today</p>
                <p className="text-xl font-headline font-bold">${metrics?.totalDollars.toFixed(2) ?? '0.00'}</p>
              </div>
           </div>
           <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full shrink-0"><Timer className="h-5 w-5 text-blue-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Avg Delivery Time</p>
                <p className="text-xl font-headline font-bold">{metrics?.avgTime.toFixed(1) ?? 0}m</p>
              </div>
           </div>
           <div className="p-4 bg-white rounded-xl border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full shrink-0"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Over Threshold</p>
                <p className="text-xl font-headline font-bold text-red-600">{metrics?.exceededCount ?? 0}</p>
              </div>
           </div>
        </div>

        <div className="flex-1 bg-white border-2 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">
          <h2 className="font-headline text-base font-semibold px-4 py-3 border-b flex items-center justify-between uppercase bg-muted/10">
            <span>Pending Deliveries</span>
            <Badge variant="secondary" className="font-mono">{lanesideOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
              {isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
              ) : lanesideOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-32 text-center">
                  <MapPin className="h-12 w-12 opacity-10 mb-4" />
                  <p className="font-medium italic">No active lane deliveries.</p>
                  <p className="text-xs mt-1">Orders will appear here once placed by customers.</p>
                </div>
              ) : (
                lanesideOrders.map((order, index) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={index + 1} 
                    onUpdateStatus={handleUpdateOrderStatus} 
                    currentDriverId={sellerId} 
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
