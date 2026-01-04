'use client'

import { collection, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, MenuItem } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DailySummaryCard } from '@/components/daily-summary';
import { startOfDay } from 'date-fns';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function SellerDashboardPage() {
  const firestore = useFirestore();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

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
  
  const dailyOrdersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const todayStart = startOfDay(new Date());
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      where('createdAt', '>=', Timestamp.fromDate(todayStart))
    );
  }, [firestore]);

  const { data: dailyOrders, isLoading: areDailyOrdersLoading } = useCollection<Order>(dailyOrdersQuery);


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

  const summaryStats = useMemo(() => {
    if (!dailyOrders) return { completedOrders: 0, totalRevenue: 0, topItems: [] };

    const completed = dailyOrders.filter(order => order.status === 'Delivered');
    const revenue = completed.reduce((acc, order) => acc + order.total, 0);

    const itemCounts = completed
      .flatMap(order => order.items)
      .reduce((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = { name: item.name, quantity: 0 };
        }
        acc[item.name].quantity += item.quantity;
        return acc;
      }, {} as Record<string, {name: string; quantity: number}>);

    const topSellingItems = Object.values(itemCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
      
    return {
      completedOrders: completed.length,
      totalRevenue: revenue,
      topItems: topSellingItems,
    };
  }, [dailyOrders]);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-headline text-4xl font-bold text-foreground">Driver Dashboard</h1>
            <p className="text-sm text-muted-foreground">Demo Course 1</p>
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
                  {showOrders ? 'View Map' : `View ${orders.length} Active Orders`}
                </Button>
              </CardHeader>
              <CardContent>
                <div className={cn('h-full min-h-[400px] md:min-h-0', showOrders ? 'hidden md:block' : '')}>
                  {sellerLocation ? (
                    <MapView
                      sellerLocation={sellerLocation}
                      buyers={orders.map(o => ({ name: o.customerName, location: o.deliveryLocation }))}
                      radius={1.5 * 1609.34} // 1.5 miles in meters
                    />
                  ) : (
                    <Skeleton className="w-full h-full rounded-lg" />
                  )}
                </div>
                <div className={cn('md:hidden', showOrders ? 'block' : 'hidden')}>
                    {isLoading ? (
                      <div className="text-center text-muted-foreground py-10">Loading orders...</div>
                    ) : orders.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">
                        No active orders.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order, index) => (
                          <OrderCard 
                            key={order.id} 
                            order={order}
                            orderNumber={index + 1}
                            onUpdateStatus={handleUpdateOrderStatus}
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
                <CardTitle className="font-headline text-2xl">Active Orders ({orders.length})</CardTitle>
                <p className="text-muted-foreground">Orders waiting for delivery.</p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                    <div className="text-center text-muted-foreground py-10">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    No active orders.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, index) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        orderNumber={index + 1}
                        onUpdateStatus={handleUpdateOrderStatus}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="mt-8">
            <DailySummaryCard 
                isLoading={areDailyOrdersLoading}
                stats={summaryStats}
            />
        </div>
      </div>
    </APIProvider>
  );
}
