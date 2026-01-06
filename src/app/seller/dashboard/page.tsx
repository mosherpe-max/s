
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

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function SellerDashboardPage() {
  const firestore = useFirestore();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [isActive, setIsActive] = useState(true);

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
          maximumAge: 0,
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
      <div className="flex flex-col">
        <header className="flex-shrink-0 px-4 py-4 flex items-center justify-between border-b bg-background sticky top-16 z-20">
          <div>
            <h1 className="font-headline text-2xl font-bold text-foreground">Driver Dashboard</h1>
            <p className="text-sm text-muted-foreground">Demo Course 1</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="active-mode" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active-mode">{isActive ? 'Active' : 'Inactive'}</Label>
          </div>
        </header>

        <div className="h-[60vh] bg-muted">
          {sellerLocation ? (
            <MapView
              sellerLocation={sellerLocation}
              buyers={orders.map(o => ({ id: o.id, name: o.customerName, location: o.deliveryLocation }))}
              radius={1609.34} // 1 mile in meters
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>

        <div className="bg-background border-t">
            <h2 className="font-headline text-lg font-semibold px-4 pt-3 pb-2">Active Orders ({orders.length})</h2>
              <div className="space-y-4 p-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex items-center justify-center text-muted-foreground py-10">
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
        </div>
      </div>
    </APIProvider>
  );
}
