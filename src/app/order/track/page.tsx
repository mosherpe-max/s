'use client';

import { useEffect, Suspense } from 'react';
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
import { useSearchParams } from 'next/navigation';
import { PartyPopper } from 'lucide-react';
import { BrandingFooter } from '@/components/branding-footer';

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

function OrderTrackingContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  // 1. Fetch specific order if ID is provided
  const specificOrderRef = useMemoFirebase(() => {
    if (!firestore || !orderId) return null;
    return doc(firestore, 'orders', orderId);
  }, [firestore, orderId]);
  const { data: specificOrder, isLoading: isLoadingSpecific } = useDoc<Order>(specificOrderRef);

  // 2. Fallback to latest order if no ID (for general demo tracking)
  const latestOrderQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [firestore]);
  const { data: latestOrders, isLoading: isLoadingLatest } = useCollection<Order>(latestOrderQuery);

  const order = specificOrder || latestOrders?.[0];
  const isLoadingOrder = isLoadingSpecific || isLoadingLatest;
  
  useEffect(() => {
    if (!firestore || !order) return;

    let intervalTime: number | null = null;
    if (order.status === 'Preparing') {
      intervalTime = 60000;
    } else if (order.status === 'Out for Delivery') {
      intervalTime = 15000;
    }

    if (!intervalTime) return;

    const trackLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const orderRef = doc(firestore, 'orders', order.id);
            updateDoc(orderRef, {
              deliveryLocation: { latitude, longitude }
            }).catch(() => {});
          },
          () => {},
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    };

    trackLocation();
    const intervalId = setInterval(trackLocation, intervalTime);
    return () => clearInterval(intervalId);
  }, [firestore, order?.id, order?.status]);


  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId) return null;
    return doc(firestore, 'sellers', order.sellerId);
  }, [firestore, order?.sellerId]);

  const { data: seller, isLoading: isLoadingSeller } = useDoc<Seller>(sellerRef);

  const isLoading = isLoadingOrder || (order && isLoadingSeller);
  const isDelivered = order?.status === 'Delivered';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/20">
      
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

      <div className="flex-1 p-4 space-y-4">
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
              </CardContent>
           </Card>
        )}
      </div>
      <BrandingFooter />
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
        <OrderTrackingContent />
      </Suspense>
    </APIProvider>
  );
}
