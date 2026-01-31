'use client'

import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function BevCartDriverDashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const sellerLocRef = useRef<LatLng | null>(null);
  const [zoomMode, setZoomMode] = useState<'radius' | 'all'>('all');
  const [now, setNow] = useState(Date.now());
  
  // Ref to track seen order IDs for "New Order" notifications
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Get current seller status from DB
  const sellerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sellers', '1');
  }, [firestore]);
  const { data: seller } = useDoc<Seller>(sellerRef);

  const isActive = seller?.status === 'Active';

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !isActive) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, isActive]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

  // Sound notification effect
  useEffect(() => {
    if (!activeOrders || !isActive) return;

    const currentOrderIds = new Set(activeOrders.map(o => o.id));
    
    // Check for newly "Placed" orders
    const newPlacedOrders = activeOrders.filter(o => o.status === 'Placed' && !lastOrderIdsRef.current.has(o.id));

    if (newPlacedOrders.length > 0 && !initialLoadRef.current) {
      // Play Sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log("Audio play blocked by browser. User interaction needed."));

      // Show Toast
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-bold text-lg">New Order Received!</span>
          </div>
        ),
        description: `You have ${newPlacedOrders.length} new order(s) waiting for confirmation.`,
      });
    }

    // Update the set of seen order IDs
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [activeOrders, isActive, toast]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sellerLocRef.current = sellerLocation;
  }, [sellerLocation]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setSellerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          setSellerLocation(mockSellerLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setSellerLocation(mockSellerLocation);
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isActive) return;

    const syncLocation = async () => {
      if (sellerLocRef.current) {
        const sellerRef = doc(firestore, 'sellers', '1');
        await updateDoc(sellerRef, {
          latitude: sellerLocRef.current.latitude,
          longitude: sellerLocRef.current.longitude
        }).catch(() => {});
      }
    };

    const intervalId = setInterval(syncLocation, 15000);
    return () => clearInterval(intervalId);
  }, [firestore, isActive]);

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    await updateDoc(orderRef, { status });
  };

  const handleToggleActive = async (checked: boolean) => {
    if (!firestore) return;
    const sellerRef = doc(firestore, 'sellers', '1');
    await updateDoc(sellerRef, { status: checked ? 'Active' : 'Inactive' });
  };

  const orders = isActive ? activeOrders || [] : [];
  const isLoading = areActiveOrdersLoading && isActive;

  const mappedBuyers = useMemo(() => {
    return orders.map(o => {
      let colorClass = "bg-green-600";
      
      if (o.createdAt) {
        const orderTime = o.createdAt.toDate().getTime();
        const minutesElapsed = (now - orderTime) / (1000 * 60);

        if (minutesElapsed > 10) {
          colorClass = "bg-red-600";
        } else if (minutesElapsed > 7) {
          colorClass = "bg-yellow-500";
        }
      }

      return {
        id: o.id,
        name: o.customerName,
        location: o.deliveryLocation,
        colorClass
      };
    });
  }, [orders, now]);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-[calc(100vh-6px)] overflow-hidden">
        <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b bg-background z-20 shadow-sm">
          <h1 className="font-headline text-lg md:text-xl font-bold text-foreground">
            {seller?.courseName || 'Demo Course'} - Driver Dashboard
          </h1>
          <div className="flex items-center space-x-3">
            <Switch 
              id="active-mode" 
              checked={isActive} 
              onCheckedChange={handleToggleActive} 
            />
            <Label htmlFor="active-mode" className="text-sm font-semibold whitespace-nowrap">
              {isActive ? 'Active' : 'Inactive'}
            </Label>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted shrink-0 md:shrink">
           <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setZoomMode(current => (current === 'radius' ? 'all' : 'radius'))}
              aria-label="Toggle map zoom"
            >
              <Focus className="h-5 w-5" />
            </Button>
            {sellerLocation ? (
              <MapView
                sellerLocation={sellerLocation}
                buyers={mappedBuyers}
                radius={1609.34}
                zoomMode={zoomMode}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
          
          <div className="w-full md:w-1/3 flex flex-col bg-background border-t md:border-t-0 md:border-l overflow-hidden min-h-0">
            <h2 className="font-headline text-lg font-semibold px-4 pt-3 pb-2 shrink-0 border-b flex items-center justify-between">
              <span>Active Orders</span>
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                {orders.length}
              </span>
            </h2>
            <ScrollArea className="flex-1 w-full">
              <div className="p-4 space-y-4 pb-12">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-20 text-center px-4">
                    <Package className="h-12 w-12 opacity-20 mb-2" />
                    <p className="italic">
                      {isActive ? 'No active orders right now.' : 'Cart is currently inactive.'}
                    </p>
                  </div>
                ) : (
                  orders.map((order, index) => (
                    <OrderCard 
                      key={order.id}
                      order={order} 
                      orderNumber={index + 1}
                      onUpdateStatus={handleUpdateOrderStatus}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
