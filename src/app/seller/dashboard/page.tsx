'use client'

import { mockOrders } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from '@/components/map-view';
import { mockSellerLocation } from '@/lib/data';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function SellerDashboardPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

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

  const activeOrders = isActive ? orders : [];

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-4xl font-bold text-foreground">Driver Dashboard</h1>
            <p className="text-lg text-muted-foreground">Demo 1 Golf Course</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="active-mode" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active-mode">Active</Label>
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
                {sellerLocation ? (
                  <div className={showOrders ? 'hidden md:block' : ''}>
                    <MapView
                      sellerLocation={sellerLocation}
                      buyers={activeOrders.map(o => ({ name: o.customerName, location: o.deliveryLocation }))}
                      radius={1.5 * 1609.34} // 1.5 miles in meters
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center aspect-video bg-muted rounded-lg">
                    <p>Loading map...</p>
                  </div>
                )}
                {showOrders && !sellerLocation && (
                    <div className="text-center text-muted-foreground py-10 md:hidden">
                        Loading orders...
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className={showOrders ? "md:col-span-1" : "hidden md:block md:col-span-1"}>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Active Orders ({activeOrders.length})</CardTitle>
                <p className="text-muted-foreground">Orders waiting for delivery.</p>
              </CardHeader>
              <CardContent>
                {activeOrders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    No active orders.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <OrderCard key={order.orderId} order={order} />
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
