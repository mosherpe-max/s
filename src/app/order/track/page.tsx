'use client';

import { Suspense } from 'react';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { APIProvider } from '@vis.gl/react-google-maps';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PartyPopper, ShoppingBag, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { BrandingFooter } from '@/components/branding-footer';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const orderRef = useMemoFirebase(() => {
    if (!firestore || !orderId) return null;
    return doc(firestore, 'orders', orderId);
  }, [firestore, orderId]);
  
  const latestQuery = useMemoFirebase(() => {
    if (!firestore || orderId) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'), limit(1));
  }, [firestore, orderId]);

  const { data: specificOrder, isLoading: isLoadingSpecific } = useDoc<Order>(orderRef);
  const { data: latestOrders, isLoading: isLoadingLatest } = useCollection<Order>(latestQuery);

  const order = specificOrder || latestOrders?.[0];
  const isLoading = isLoadingSpecific || isLoadingLatest;

  const sellerRef = useMemoFirebase(() => {
    if (!firestore || !order?.sellerId) return null;
    return doc(firestore, 'sellers', order.sellerId);
  }, [firestore, order?.sellerId]);

  const { data: seller, isLoading: isLoadingSeller } = useDoc<Seller>(sellerRef);

  if (isLoading || (order && isLoadingSeller)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Tracking your order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="p-4 bg-muted rounded-full"><ShoppingBag className="h-12 w-12 opacity-20" /></div>
        <div className="space-y-2">
            <h2 className="text-2xl font-headline font-bold uppercase">No Active Order</h2>
            <p className="text-muted-foreground">We couldn't find your order. Try placing a new one!</p>
        </div>
        <Button asChild><Link href="/">Go Back Home</Link></Button>
      </div>
    );
  }

  const isDelivered = order.status === 'Delivered';
  const brandColor = seller?.brandColor || 'hsl(var(--primary))';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/10">
      
      {!isDelivered && (
        <div className="h-[45vh] relative shadow-inner overflow-hidden border-b-2">
          {seller && order ? (
            <MapView
              sellerLocation={{ latitude: seller.latitude, longitude: seller.longitude }}
              buyerLocation={order.deliveryLocation}
              interactive={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted"><MapPin className="animate-bounce h-8 w-8 text-muted-foreground" /></div>
          )}
          <div className="absolute top-4 left-4 z-10">
             <Button variant="secondary" size="sm" asChild className="rounded-full shadow-lg">
                <Link href={`/sellers/${order.sellerId}/order`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu</Link>
             </Button>
          </div>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full">
        {isDelivered && (
            <Card className="text-center shadow-xl border-green-200 bg-green-50 overflow-hidden">
                <div className="h-2 bg-green-500 w-full" />
                <CardContent className="p-8">
                    <PartyPopper className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h2 className="font-headline text-3xl font-bold text-green-800 uppercase tracking-tight">Delivered!</h2>
                    <p className="text-green-700/80 mt-2 mb-8 font-medium">Your refreshments have arrived. Enjoy!</p>
                    <Button asChild size="lg" className="rounded-full px-8 bg-green-600 hover:bg-green-700">
                        <Link href={`/sellers/${order.sellerId}/order`}>Order Again</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        <Card className="shadow-lg border-primary/10">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-muted-foreground">Order Tracking</h3>
                    <Badge variant="outline" className="font-mono text-[10px]">{order.id.slice(-6).toUpperCase()}</Badge>
                </div>
                <OrderStatus currentStatus={order.status} />
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><ShoppingBag className="w-3.5 h-3.5" /> Items</div>
                    <div className="space-y-2">
                        {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="font-medium">{item.name} <span className="text-muted-foreground font-normal ml-1">x{item.quantity}</span></span>
                                <span className="font-mono font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <Separator className="border-dashed" />
                <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="font-mono">${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Service Fee</span>
                        <span className="font-mono">${order.serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-bold text-lg">
                        <span className="font-headline uppercase">Total</span>
                        <span className="font-mono" style={{ color: brandColor }}>${order.total.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-6 p-4 bg-muted/30 rounded-xl border flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment Method</p>
                    <p className="text-xs font-medium text-foreground italic">"{order.paymentMethod}"</p>
                </div>
            </CardContent>
        </Card>
      </div>
      <BrandingFooter className="mt-8" />
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
        <OrderTrackingContent />
      </Suspense>
    </APIProvider>
  );
}