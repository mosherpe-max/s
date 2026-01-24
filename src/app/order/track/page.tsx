'use client';

import { useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PartyPopper, Package, CookingPot, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function OrderSummaryCard({ order }: { order: Order }) {
    return (
        <Card className="shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-headline">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                 {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                        <span>{item.name} <span className='text-muted-foreground'>x{item.quantity}</span></span>
                        <span className='font-mono'>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                <Separator />
                <div className='flex justify-between items-center font-bold'>
                    <span>Total</span>
                    <span className='font-mono'>${order.total.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function OrderTrackingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const prevStatusRef = useRef<Order['status']>();

  // Query for the most recent order placed.
  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);

  const { data: orders, isLoading: isLoadingOrder } = useCollection<Order>(latestOrderQuery);
  const order = orders?.[0];
  
  useEffect(() => {
    if (order && prevStatusRef.current && order.status !== prevStatusRef.current) {
        let title = '';
        let description = '';
        let Icon: React.ElementType = Package;

        switch (order.status) {
            case 'Preparing':
                title = 'Order Confirmed!';
                description = 'The cart is now preparing your items.';
                Icon = CookingPot;
                break;
            case 'Out for Delivery':
                title = 'On The Way!';
                description = 'Your order is out for delivery.';
                Icon = Navigation;
                break;
            case 'Delivered':
                title = 'Order Delivered!';
                description = 'Enjoy your refreshments.';
                Icon = PartyPopper;
                break;
        }

        if (title) {
            toast({
                title: (
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span>{title}</span>
                    </div>
                ),
                description: description,
            });
        }
    }

    if (order) {
        prevStatusRef.current = order.status;
    }
  }, [order, toast]);

  // Effect to track buyer's location every 30 seconds when 'Out for Delivery'
  useEffect(() => {
    if (!firestore || !order || order.status !== 'Out for Delivery') {
      return; // Do nothing if no order, or status is not 'Out for Delivery'
    }

    const trackLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const orderRef = doc(firestore, 'orders', order.id);
            // Update the document in Firestore
            updateDoc(orderRef, {
              deliveryLocation: { latitude, longitude }
            }).catch((err) => {
              console.error("Failed to update buyer location:", err);
            });
          },
          (error) => {
            console.error("Error getting buyer location:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    };

    // Set up the interval
    const intervalId = setInterval(trackLocation, 30000); // 30 seconds

    // Cleanup function to clear the interval
    return () => {
      clearInterval(intervalId);
    };
  }, [firestore, order]);


  // Once we have the order, get the seller's information.
  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId) return null;
    return doc(firestore, 'sellers', order.sellerId);
  }, [firestore, order?.sellerId]);

  const { data: seller, isLoading: isLoadingSeller } = useDoc<Seller>(sellerRef);

  const isLoading = isLoadingOrder || (orders && orders.length > 0 && isLoadingSeller);

  const isDelivered = order?.status === 'Delivered';

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/20">
        
        {/* Map View - Top 50% */}
        {!isDelivered && (
          <div className="h-[50vh] bg-muted">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : seller && order ? (
              <MapView
                sellerLocation={{ latitude: seller.latitude, longitude: seller.longitude }}
                buyerLocation={order.deliveryLocation}
                interactive={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Waiting for order data...</p>
              </div>
            )}
          </div>
        )}

        {/* Status and Summary - Bottom 50% or full height */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : order ? (
            <>
              {isDelivered && (
                  <Card className="text-center shadow-lg bg-green-50 border-green-200">
                      <CardContent className="p-6">
                          <PartyPopper className="h-12 w-12 text-green-600 mx-auto mb-2" />
                          <h2 className="font-headline text-2xl font-bold text-green-800">Order Delivered!</h2>
                          <p className="text-muted-foreground mt-1 mb-4">Enjoy your refreshments.</p>
                          <Button asChild>
                              <Link href={`/sellers/${order.sellerId}/order`}>Place Another Order</Link>
                          </Button>
                      </CardContent>
                  </Card>
              )}
              <div className='py-2'>
                <OrderStatus currentStatus={order.status} />
              </div>
              <OrderSummaryCard order={order} />
            </>
          ) : (
             <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>No active order found.</p>
                    <p className="text-xs mt-2">Place an order from the sample menu to see tracking information here.</p>
                </CardContent>
             </Card>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
