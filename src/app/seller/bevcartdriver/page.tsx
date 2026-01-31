'use client'

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { Focus, Bell, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BrandingFooter } from '@/components/branding-footer';

type LatLng = {
  latitude: number;
  longitude: number;
};

const getDriverColorClass = (id: string) => {
  const driverColors = [
    'bg-indigo-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-cyan-600',
    'bg-slate-700',
  ];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % driverColors.length;
  return driverColors[index];
};

export default function BevCartDriverDashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const sellerLocRef = useRef<LatLng | null>(null);
  const [zoomMode, setZoomMode] = useState<'radius' | 'all'>('all');
  const [now, setNow] = useState<number | null>(null);
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sellers', 'demo-course');
  }, [firestore]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const activeSellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), where('status', '==', 'Active'));
  }, [firestore]);
  const { data: activeSellers, isLoading: areSellersLoading } = useCollection<Seller>(activeSellersQuery);

  const isPrimaryActive = primarySeller?.status === 'Active';

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

  const driverOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => 
      o.sellerId === 'demo-course' && 
      o.menuType === 'Beverage Cart'
    );
  }, [activeOrders]);

  useEffect(() => {
    const handleUnload = () => {
      if (firestore && isPrimaryActive) {
        const sellerDocRef = doc(firestore, 'sellers', 'demo-course');
        updateDoc(sellerDocRef, { status: 'Inactive' }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [firestore, isPrimaryActive]);

  useEffect(() => {
    if (!driverOrders) return;

    const currentOrderIds = new Set(driverOrders.map(o => o.id));
    const newPlacedOrders = driverOrders.filter(o => o.status === 'Placed' && !lastOrderIdsRef.current.has(o.id));

    if (newPlacedOrders.length > 0 && !initialLoadRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-bold text-lg text-primary">New Order Received!</span>
          </div>
        ),
        description: `There are ${newPlacedOrders.length} new order(s) for your Beverage Cart.`,
      });
    }

    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [driverOrders, toast]);

  useEffect(() => {
    setNow(Date.now());
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
    if (!firestore || !isPrimaryActive) return;

    const syncLocation = async () => {
      if (sellerLocRef.current) {
        const sellerDocRef = doc(firestore, 'sellers', 'demo-course');
        updateDoc(sellerDocRef, {
          latitude: sellerLocRef.current.latitude,
          longitude: sellerLocRef.current.longitude,
          status: 'Active',
          lastActive: serverTimestamp()
        }).catch(() => {});
      }
    };

    const intervalId = setInterval(syncLocation, 30000);
    return () => clearInterval(intervalId);
  }, [firestore, isPrimaryActive]);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updates: any = { status };
    if (status === 'Delivered') {
      updates.deliveredAt = serverTimestamp();
    }
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
    if (!firestore) return;
    const sellerDocRef = doc(firestore, 'sellers', 'demo-course');
    const updates = { 
      status: checked ? 'Active' : 'Inactive',
      lastActive: checked ? serverTimestamp() : null
    };
    updateDoc(sellerDocRef, updates)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerDocRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
      });
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading || areSellersLoading;

  const mappedSellers = useMemo(() => {
    if (!activeSellers || !now) return [];
    
    // Heartbeat Threshold: 2 minutes (120,000 ms)
    const threshold = 120000;

    return activeSellers
        .filter(s => {
            // Exclude self (already shown by primary pin)
            if (s.id === 'demo-course') return false;
            
            // Filter by lastActive heartbeat to prevent ghost markers
            if (!s.lastActive) return false;
            const lastActiveTime = s.lastActive.toDate().getTime();
            return (now - lastActiveTime) < threshold;
        })
        .map(s => ({
            id: s.id,
            name: s.courseName,
            location: { latitude: s.latitude, longitude: s.longitude },
            colorClass: getDriverColorClass(s.id)
        }));
  }, [activeSellers, now]);

  const mappedBuyers = useMemo(() => {
    if (!now || !activeOrders) return [];
    return activeOrders.map(o => {
      let colorClass = "bg-green-600";
      if (o.createdAt) {
        const orderTime = o.createdAt.toDate().getTime();
        const minutesElapsed = (now - orderTime) / (1000 * 60);
        if (minutesElapsed > 10) colorClass = "bg-red-600";
        else if (minutesElapsed > 7) colorClass = "bg-yellow-500";
      }
      return {
        id: o.id,
        name: o.customerName,
        location: o.deliveryLocation,
        colorClass
      };
    });
  }, [activeOrders, now]);

  if (!isPrimaryLoading && !primarySeller) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-8 text-center space-y-6">
              <AlertCircle className="h-16 w-16 text-muted-foreground opacity-20" />
              <h1 className="text-2xl font-headline font-bold uppercase">KOOP Driver Interface</h1>
              <p className="text-muted-foreground max-w-sm">
                  Initialize your seller profile to access driver tools.
              </p>
              <Button asChild>
                  <Link href="/sellers/demo-course">Initialize Driver Profile</Link>
              </Button>
          </div>
      );
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
          <div className="flex flex-col">
            <h1 className="font-headline text-lg md:text-xl font-bold text-white uppercase">
              Beverage Cart Driver Dashboard
            </h1>
            <span className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none">
              DRIVER: Demo Golf Course - Public
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Switch 
              id="active-mode" 
              checked={isPrimaryActive} 
              onCheckedChange={handleToggleActive} 
              className="data-[state=checked]:bg-[#E50000]"
            />
            <Label htmlFor="active-mode" className="text-sm font-semibold whitespace-nowrap text-white">
              {isPrimaryActive ? 'CART: ACTIVE' : 'CART: INACTIVE'}
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
            >
              <Focus className="h-5 w-5" />
            </Button>
            {sellerLocation ? (
              <MapView
                sellerLocation={sellerLocation}
                sellers={mappedSellers}
                buyers={mappedBuyers}
                radius={1609.34}
                zoomMode={zoomMode}
                showPrimaryMarker={isPrimaryActive}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
          
          <div className="w-full md:w-1/3 flex flex-col bg-background border-t md:border-t-0 md:border-l overflow-hidden min-h-0">
            <h2 className="font-headline text-lg font-semibold px-4 pt-3 pb-2 shrink-0 border-b flex items-center justify-between">
              <span>Your Active Orders</span>
              <span className="bg-[#E50000] text-white text-xs rounded-full px-2 py-0.5">
                {driverOrders.length}
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
                ) : driverOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-20 text-center px-4">
                    <Package className="h-12 w-12 opacity-20 mb-2" />
                    <p className="italic">
                      No active beverage cart orders.
                    </p>
                  </div>
                ) : (
                  driverOrders.map((order, index) => (
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

        <BrandingFooter />
      </div>
    </APIProvider>
  );
}
