'use client'

import { OrderStatus } from "@/components/order-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, User, Truck } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { APIProvider } from "@vis.gl/react-google-maps";
import { MapView } from "@/components/map-view";
import { mockSellerLocation } from "@/lib/data";
import { useState, useEffect } from "react";

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function OrderTrackingPage() {
  const firestore = useFirestore();
  const [buyerLocation, setBuyerLocation] = useState<LatLng | null>(null);

  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', '1'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: orders, isLoading } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  useEffect(() => {
    if (order?.deliveryLocation) {
        setBuyerLocation(order.deliveryLocation);
    } else {
        // Fallback for when order is not yet loaded or doesn't have a location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setBuyerLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => {},
            { enableHighAccuracy: true }
        );
    }
  }, [order]);


  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-foreground">Track Your Order</h1>
        <p className="text-lg text-muted-foreground mt-2">It's on the way!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="font-headline text-2xl">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            ) : order ? (
                <OrderStatus currentStatus={order.status} />
            ) : (
                <p className="text-muted-foreground text-center">No recent order found.</p>
            )}
            </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Live Locations</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-around items-center text-center">
                    <div className="flex flex-col items-center gap-2">
                        <User className="w-8 h-8 text-primary" />
                        <span className="font-semibold">Your Location</span>
                    </div>
                     <div className="flex-1 border-t-2 border-dashed mx-4"></div>
                    <div className="flex flex-col items-center gap-2">
                        <Truck className="w-8 h-8 text-primary" />
                        <span className="font-semibold">Driver</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

       <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <div className="h-[40vh] bg-muted rounded-lg overflow-hidden shadow-lg mb-8">
                {buyerLocation ? (
                    <MapView 
                        buyerLocation={buyerLocation} 
                        sellerLocation={mockSellerLocation} 
                    />
                ) : (
                   <Skeleton className="w-full h-full" />
                )}
            </div>
      </APIProvider>
      
      <div className="text-center">
          <p className="text-muted-foreground mb-4">Your order has been placed. You can view the delivery status on the driver's dashboard.</p>
           <Button asChild>
            <Link href="/seller/dashboard">
              Go to Driver Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
      </div>
    </div>
  );
}
