'use client';

import { useState } from 'react';
import { collection, query, orderBy, limit, where, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { APIProvider } from '@vis.gl/react-google-maps';
import { mockSellerLocation } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

function OrderSummaryCard({ order }: { order: Order }) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
              <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <p className="text-muted-foreground">Subtotal</p>
            <p className="font-mono">${order.subtotal.toFixed(2)}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-muted-foreground">Service Fee</p>
            <p className="font-mono">${order.serviceFee.toFixed(2)}</p>
          </div>
          <div className="flex justify-between font-bold">
            <p>Total</p>
            <p className="font-mono">${order.total.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderTrackingPage() {
  const firestore = useFirestore();

  // Query for the most recent order placed by our public user
  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      where('customerId', '==', 'public-user'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: orders, isLoading: isLoadingOrder } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];

  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId) return null;
    return doc(firestore, 'sellers', order.sellerId);
  }, [firestore, order?.sellerId]);

  const { data: seller, isLoading: isLoadingSeller } = useDoc<Seller>(sellerRef);

  // For this prototype, we'll use a mock location for the driver.
  // In a real app, this would come from a real-time database listener.
  const driverLocation = mockSellerLocation;

  const isLoading = isLoadingOrder || (order && isLoadingSeller);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20">
        {/* Map View */}
        <div className="flex-grow h-1/2 bg-muted">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : order && seller ? (
            <MapView
              sellerLocation={driverLocation}
              buyerLocation={order.deliveryLocation}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">Waiting for order...</p>
            </div>
          )}
        </div>

        {/* Status & Summary Section */}
        <div className="flex-shrink-0 p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : order ? (
            <>
              <div className="bg-card p-4 rounded-lg shadow">
                 <OrderStatus currentStatus={order.status} />
              </div>
              <OrderSummaryCard order={order} />
            </>
          ) : (
             <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Active Order</AlertTitle>
              <AlertDescription>
                We couldn&apos;t find your latest order. Please place a new order from the menu.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
