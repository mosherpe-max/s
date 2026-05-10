
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, MapPin, Loader2, Store, ClipboardList, Satellite } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { getNumericOrderId } from '@/lib/utils';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  
  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const orderRef = useMemoFirebase(() => (firestore && orderId ? doc(firestore, 'orders', orderId) : null), [firestore, orderId]);
  const { data: order, isLoading } = useDoc<Order>(orderRef);

  const sellerRef = useMemoFirebase(() => (firestore && order?.sellerId ? doc(firestore, 'sellers', order.sellerId) : null), [firestore, order?.sellerId]);
  const { data: seller } = useDoc<Seller>(sellerRef);

  useEffect(() => {
    if (!order || !firestore || order.status === 'Delivered') return;

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          updateDoc(doc(firestore, 'orders', order.id), { 
            deliveryLocation: { latitude: position.coords.latitude, longitude: position.coords.longitude },
            lastGpsUpdate: serverTimestamp() 
          });
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [order?.status, order?.id, firestore]);

  if (isLoading) return <div className="flex-1 flex items-center justify-center p-8"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  if (!order) return <div className="p-8 text-center"><p>Order not found.</p><Button asChild className="mt-4"><Link href="/">Back Home</Link></Button></div>;

  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      <div className="h-[40vh] relative border-b-2">
        <MapView sellerLocation={seller ? { latitude: seller.latitude, longitude: seller.longitude } : undefined} buyerLocation={order.deliveryLocation} interactive={true} />
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">
        <Card className="shadow-lg">
          <CardHeader className="py-4 px-6 flex flex-row items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Status</span>
            <Badge variant="outline" className="font-mono text-[9px]">#{getNumericOrderId(order.id)}</Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <OrderStatus currentStatus={order.status} />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="py-3 px-6 bg-muted/30 border-b">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Details</h3>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[9px] font-black text-muted-foreground uppercase">Venue</p><p className="text-xs font-bold">{seller?.courseName}</p></div>
              <div className="text-right"><p className="text-[9px] font-black text-muted-foreground uppercase">Service</p><p className="text-xs font-bold">{order.menuType}</p></div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black text-muted-foreground uppercase">Items</p>
              {order.items.map(i => (
                <div key={i.cartId} className="flex justify-between text-xs font-medium">
                  <span>{i.quantity}x {i.name}</span>
                  <span className="font-mono">${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-black text-lg uppercase tracking-tight">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Suspense fallback={<Loader2 className="animate-spin" />}><OrderTrackingContent /></Suspense>
    </APIProvider>
  );
}
