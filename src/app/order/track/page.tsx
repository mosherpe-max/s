'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import type { Order, Seller } from '@/lib/types';
import { MapView } from '@/components/map-view';
import { OrderStatus } from '@/components/order-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PartyPopper, ShoppingBag, MapPin, Loader2, ArrowLeft, Store, ClipboardList, Satellite, Edit2, ChevronLeft, Smartphone, BellRing } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { IosInstallPrompt } from '@/components/ios-install-prompt';
import { getNumericOrderId } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { APIProvider } from '@vis.gl/react-google-maps';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { loadOrder } = useCart();
  
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [initialLocations, setInitialLocations] = useState<{ buyer: { latitude: number, longitude: number }, seller: { latitude: number, longitude: number } } | null>(null);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  
  const wakeLockRef = useRef<any>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (order && seller && !initialLocations) {
      setInitialLocations({
        buyer: order.deliveryLocation,
        seller: { latitude: seller.latitude, longitude: seller.longitude }
      });
    }
  }, [order, seller, initialLocations]);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Wake Lock request failed:', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (order && order.status === 'Out for Delivery') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [order?.status]);

  useEffect(() => {
    const updateLocation = () => {
      if (!navigator.geolocation || !order || !firestore) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const orderDocRef = doc(firestore, 'orders', order.id);
          updateDoc(orderDocRef, { deliveryLocation: newLocation }).catch(() => {});
        },
        (error) => console.warn('GPS Update Failed:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    if (order?.status === 'Out for Delivery') {
      setIsTrackingActive(true);
      updateLocation();
      locationIntervalRef.current = setInterval(updateLocation, 15000);
    } else {
      setIsTrackingActive(false);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [order?.status, order?.id, firestore]);

  const handleModifyOrder = () => {
    if (order) {
      loadOrder(order);
      router.push(`/sellers/${order.sellerId}/order`);
    }
  };

  if (isLoading || (order && isLoadingSeller)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm uppercase tracking-widest">TRACKING YOUR ORDER...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="p-4 bg-muted rounded-full"><ShoppingBag className="h-12 w-12 opacity-20" /></div>
        <div className="space-y-2">
            <h2 className="text-2xl font-headline text-bold uppercase">NO ACTIVE ORDER</h2>
            <p className="text-muted-foreground">We couldn't find your order. Try placing a new one!</p>
        </div>
        <Button asChild><Link href="/">GO BACK HOME</Link></Button>
      </div>
    );
  }

  const isDelivered = order.status === 'Delivered';
  const isOutForDelivery = order.status === 'Out for Delivery';
  const isEditable = order.status === 'Placed' || order.status === 'Preparing';
  const brandColor = seller?.brandColor || 'hsl(var(--primary))';
  const numericId = getNumericOrderId(order.id);
  const isBowlingAlley = seller?.type === 'Bowling Alley';

  const mapBuyerLocation = isOutForDelivery ? order.deliveryLocation : initialLocations?.buyer;
  const mapSellerLocation = isOutForDelivery ? { latitude: seller?.latitude || 0, longitude: seller?.longitude || 0 } : initialLocations?.seller;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/10 overflow-y-auto">
      <IosInstallPrompt open={isInstallPromptOpen} onOpenChange={setIsInstallPromptOpen} />

      {!isDelivered && !isBowlingAlley && (
        <div className="h-[40vh] relative shadow-inner overflow-hidden border-b-2 shrink-0">
          {mapSellerLocation && mapBuyerLocation ? (
            <MapView
              sellerLocation={mapSellerLocation}
              buyerLocation={mapBuyerLocation}
              interactive={true}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted"><MapPin className="animate-bounce h-8 w-8 text-muted-foreground" /></div>
          )}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
             <Button variant="secondary" size="sm" asChild className="rounded-full shadow-lg h-9 border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
                <Link href={`/sellers/${order.sellerId}/order`} className="flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" /> 
                  <span className="text-[10px] font-bold uppercase tracking-wider">BACK TO MENU</span>
                </Link>
             </Button>
             
             {isEditable && (
               <Button 
                variant="default" 
                size="sm" 
                onClick={handleModifyOrder}
                className="rounded-full shadow-lg h-9 bg-primary text-white font-bold uppercase text-[10px] tracking-widest px-4 border-2 border-white/20"
               >
                 <Edit2 className="mr-2 h-3 w-3" />
                 Modify Order
               </Button>
             )}
          </div>
        </div>
      )}

      {/* Alternative Header for Bowling Alleys or No Map Views */}
      {!isDelivered && isBowlingAlley && (
        <div className="bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
           <Button variant="ghost" size="sm" asChild className="rounded-full h-8 px-3">
              <Link href={`/sellers/${order.sellerId}/order`} className="flex items-center">
                <ChevronLeft className="mr-1 h-4 w-4" /> 
                <span className="text-[10px] font-bold uppercase tracking-wider">Back to Menu</span>
              </Link>
           </Button>
           {isEditable && (
             <Button 
              variant="outline" size="sm" 
              onClick={handleModifyOrder}
              className="rounded-full h-8 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
             >
               <Edit2 className="mr-1.5 h-3 w-3" />
               Modify Order
             </Button>
           )}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto w-full pb-20">
        {isDelivered && (
            <Card className="text-center shadow-xl border-green-200 bg-green-50 overflow-hidden">
                <div className="h-2 bg-green-500 w-full" />
                <CardContent className="p-8">
                    <PartyPopper className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h2 className="font-headline text-3xl font-bold text-green-800 uppercase tracking-tight">ORDER COMPLETE!</h2>
                    <p className="text-green-700/80 mt-2 mb-8 font-medium">Your refreshments have arrived. Enjoy!</p>
                    <Button asChild size="lg" className="rounded-full px-8 bg-green-600 hover:bg-green-700 font-headline font-bold uppercase">
                        <Link href={`/sellers/${order.sellerId}/order`}>ORDER AGAIN</Link>
                    </Button>
                </CardContent>
            </Card>
        )}

        {isTrackingActive && isOutForDelivery && !isBowlingAlley && (
          <div className="px-1">
             <Alert className="bg-primary/95 text-white border-none shadow-xl backdrop-blur-md py-3 rounded-xl">
                <Satellite className="h-5 w-5 text-white animate-pulse" />
                <AlertTitle className="text-xs font-bold uppercase tracking-[0.2em] mb-0.5">Live Location Active</AlertTitle>
                <AlertDescription className="text-[11px] opacity-90 leading-tight">
                  The driver is using your location to find you on the course.
                </AlertDescription>
              </Alert>
          </div>
        )}

        <Card className="shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-muted-foreground">ORDER TRACKING</h3>
                    <Badge variant="outline" className="font-mono text-[10px] h-6 px-3 border-primary/20 bg-primary/5">#{numericId}</Badge>
                </div>
                <OrderStatus currentStatus={order.status} menuType={order.menuType} />
            </CardHeader>
            <Separator />
            <CardContent className="pt-6 space-y-6">
                {!isDelivered && (
                  <div className="bg-[#213147] rounded-2xl p-5 border-b-4 border-primary shadow-inner space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/20 p-2.5 rounded-xl shrink-0">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-white uppercase tracking-tight">For Apple iOS Users</p>
                        <p className="text-[10px] text-white/70 font-medium leading-tight">
                          Get live Tracking and Notifications by adding KOOP to your home screen.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsInstallPromptOpen(true)}
                      className="w-full bg-primary text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl"
                    >
                      <BellRing className="mr-2 h-3.5 w-3.5" />
                      Setup Tracking
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-muted/30 rounded-xl border border-dashed">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                      <Store className="w-3 h-3" /> ESTABLISHMENT
                    </p>
                    <p className="text-xs font-bold truncate">{seller?.courseName || 'Loading...'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5 justify-end">
                      <ClipboardList className="w-3 h-3" /> SERVICE MODE
                    </p>
                    <p className="text-xs font-bold">{order.menuType}</p>
                  </div>
                </div>

                {order.menuTypeLocation && (
                  <div className="px-4 py-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isBowlingAlley ? 'Lane Number' : 'Location Detail'}
                    </span>
                    <span className="text-sm font-black text-primary uppercase">{order.menuTypeLocation}</span>
                  </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><ShoppingBag className="w-3.5 h-3.5" /> ORDER ITEMS</div>
                    <div className="space-y-2">
                        {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-xs">{item.name} <span className="text-muted-foreground font-normal ml-1 text-[10px]">x{item.quantity}</span></span>
                                <span className="font-mono font-bold text-xs">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <Separator className="border-dashed" />
                
                <div className="space-y-1.5 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span className="font-mono text-foreground">${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>PLATFORM FEE</span>
                        <span className="font-mono text-foreground">${order.serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>EST. TAX (6%)</span>
                        <span className="font-mono text-foreground">${(order.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GRATUITY / TIP</span>
                        <span className="font-mono text-foreground">${(order.tip || 0).toFixed(2)}</span>
                    </div>
                    <Separator className="my-2 border-dashed" />
                    <div className="flex justify-between items-center pt-1 font-black text-lg">
                        <span className="font-headline uppercase tracking-tight text-base text-foreground">TOTAL PAID</span>
                        <span className="font-mono" style={{ color: brandColor }}>${order.total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl border flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PAYMENT METHOD</p>
                    <p className="text-xs font-black text-foreground uppercase italic tracking-tight">"{order.paymentMethod}"</p>
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
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
        <OrderTrackingContent />
      </Suspense>
    </APIProvider>
  );
}
