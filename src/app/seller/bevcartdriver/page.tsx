'use client'

import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus } from 'lucide-react';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function BevCartDriverDashboardPage() {
  const firestore = useFirestore();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [zoomMode, setZoomMode] = useState<'radius' | 'all'>('all');

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !isActive) return null;
    // For now, hardcode the sellerId to '1' for "Demo Course 1"
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, isActive]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

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
          // Fallback to mock location if geolocation fails
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
      // Fallback for browsers that don't support geolocation
      setSellerLocation(mockSellerLocation);
    }
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    await updateDoc(orderRef, { status });
  };

  const orders = isActive ? activeOrders || [] : [];
  const isLoading = areActiveOrdersLoading && isActive;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <header className="flex-shrink-0 px-4 py-4 flex items-center justify-between border-b bg-background z-20">
          <div>
            <h1 className="font-headline text-2xl font-bold text-foreground">Driver Dashboard</h1>
            <p className="text-sm text-muted-foreground">Demo Course 1</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="active-mode" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active-mode">{isActive ? 'Active' : 'Inactive'}</Label>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Map Container */}
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
                buyers={orders.map(o => ({ id: o.id, name: o.customerName, location: o.deliveryLocation }))}
                radius={1609.34} // 1 mile in meters
                zoomMode={zoomMode}
              />
            ) : (
              <Skeleton className="w-full h-full" />
            )}
          </div>
          
          {/* Orders List */}
          <div className="w-full md:w-1/3 flex flex-col bg-background border-t md:border-t-0 md:border-l overflow-hidden min-h-0">
            <h2 className="font-headline text-lg font-semibold px-4 pt-3 pb-2 shrink-0 border-b">
              Active Orders ({orders.length})
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
                  <div className="flex items-center justify-center text-muted-foreground py-10 italic">
                    No active orders.
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
