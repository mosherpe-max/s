'use client'

import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function SellerDashboardPage() {
  const firestore = useFirestore();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !isActive) return null;
    // For now, hardcode the sellerId to '1' for "Demo Course 1"
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, isActive]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

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
  
  const handleNavigate = (location: {latitude: number, longitude: number}) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const activeOrders = isActive ? orders || [] : [];
  const isLoading = areOrdersLoading && isActive;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-headline text-4xl font-bold text-foreground">Driver Dashboard</h1>
            <p className="text-sm text-muted-foreground">Demo 1 Golf Course</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="active-mode" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active-mode">{isActive ? 'Active' : 'Inactive'}</Label>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card className="shadow-lg h-full">
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle className="font-headline text-2xl">Order Locations</CardTitle>
                <Button variant="outline" onClick={() => setShowOrders(!showOrders)} className="md:hidden">
                  {showOrders ? 'View Map' : `View ${activeOrders.length} Active Orders`}
                </Button>
              </CardHeader>
              <CardContent>
                <div className={cn('h-full min-h-[400px] md:min-h-0', showOrders ? 'hidden md:block' : '')}>
                  {sellerLocation ? (
                    <MapView
                      sellerLocation={sellerLocation}
                      buyers={activeOrders.map(o => ({ name: o.customerName, location: o.deliveryLocation }))}
                      radius={1.5 * 1609.34} // 1.5 miles in meters
                    />
                  ) : (
                    <Skeleton className="w-full h-full rounded-lg" />
                  )}
                </div>
                <div className={cn('md:hidden', showOrders ? 'block' : 'hidden')}>
                    {isLoading ? (
                      <div className="text-center text-muted-foreground py-10">Loading orders...</div>
                    ) : activeOrders.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">
                        No active orders.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeOrders.map((order) => (
                          <OrderCard 
                            key={order.id} 
                            order={order} 
                            onUpdateStatus={handleUpdateOrderStatus}
                            onNavigate={handleNavigate}
                          />
                        ))}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="hidden md:block md:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Active Orders ({activeOrders.length})</CardTitle>
                <p className="text-muted-foreground">Orders waiting for delivery.</p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                    <div className="text-center text-muted-foreground py-10">Loading orders...</div>
                ) : activeOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    No active orders.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        onUpdateStatus={handleUpdateOrderStatus}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
