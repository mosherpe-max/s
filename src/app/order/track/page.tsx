'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
import { PartyPopper, ShoppingBag, MapPin, Loader2, ArrowLeft, Store, ClipboardList, Satellite, Edit2, ChevronLeft, Smartphone, BellRing, Flag, CheckCircle2, Zap, Info, Eye, Sparkles } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { IosInstallPrompt } from '@/components/ios-install-prompt';
import { getNumericOrderId } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { APIProvider } from '@vis.gl/react-google-maps';
import { cn } from '@/lib/utils';

function OrderTrackingContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { loadOrder } = useCart();
  
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [initialLocations, setInitialLocations] = useState<{ buyer: { latitude: number, longitude: number }, seller: { latitude: number, longitude: number } } | null>(null);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isUpdatingHole, setIsUpdatingHole] = useState(false);
  const [forceIosView, setForceIosView] = useState(false);
  
  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);

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

  const isGolfService = order?.menuType === 'Beverage Cart' || order?.menuType === 'Clubhouse';
  const isGpsRequired = isGolfService;

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandaloneMode = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    const isAndroid = /android/.test(userAgent);
    
    setIsIos(isIosDevice);
    setIsStandalone(isStandaloneMode);

    if (orderId && firestore) {
      const status = isStandaloneMode ? 'standalone' : (isIosDevice ? 'ios-browser' : (isAndroid ? 'android' : 'standard'));
      updateDoc(doc(firestore, 'orders', orderId), { buyerDeviceStatus: status }).catch(() => {});
    }
  }, [orderId, firestore]);

  // Auto-scroll to top on completion
  useEffect(() => {
    if (order?.status === 'Delivered' && prevStatusRef.current && prevStatusRef.current !== 'Delivered') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevStatusRef.current = order?.status;
  }, [order?.status]);

  useEffect(() => {
    if (order && seller && !initialLocations && isGpsRequired) {
      setInitialLocations({
        buyer: order.deliveryLocation,
        seller: { latitude: seller.latitude, longitude: seller.longitude }
      });
    }
  }, [order, seller, initialLocations, isGpsRequired]);

  // Wide Wake Lock Window: Placed -> Delivered
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

    // Keep screen awake while order is active
    const isOrderActive = order && ['Placed', 'Preparing', 'Out for Delivery'].includes(order.status);

    if (isOrderActive) {
      requestWakeLock();
      
      const handleVisibilityChange = () => {
        // Re-initiate when user returns to app (e.g. via push notification click)
        if (document.visibilityState === 'visible' && isOrderActive) {
          requestWakeLock();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [order?.status]);

  useEffect(() => {
    if (!order || !firestore || !isGpsRequired) return;

    if (order.status === 'Out for Delivery') {
      setIsTrackingActive(true);
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            const orderDocRef = doc(firestore, 'orders', order.id);
            updateDoc(orderDocRef, { 
              deliveryLocation: newLocation,
              lastGpsUpdate: serverTimestamp() 
            }).catch(() => {});
          },
          (error) => console.warn('GPS Watcher Failed:', error),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
    } else {
      setIsTrackingActive(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [order?.status, order?.id, firestore, isGpsRequired]);

  const handleModifyOrder = () => {
    if (order) {
      loadOrder(order);
      router.push(`/sellers/${order.sellerId}/order`);
    }
  };

  const handleHoleUpdate = async (hole: string) => {
    if (!order || !firestore) return;
    setIsUpdatingHole(true);
    const updates = { menuTypeLocation: `Hole ${hole}` };
    updateDoc(doc(firestore, 'orders', order.id), updates)
      .then(() => {
        // Trigger the install bubble for iOS browser users upon manual location update
        if ((isIos || forceIosView) && !isStandalone) {
          setIsInstallPromptOpen(true);
        }
      })
      .finally(() => {
        setIsUpdatingHole(false);
      });
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
  const isOrderActive = !isDelivered && order.status !== 'Cancelled';
  const brandColor = seller?.brandColor || 'hsl(var(--primary))';
  const numericId = getNumericOrderId(order.id);
  const taxRatePercentage = seller?.taxRate || 6.0;

  const mapBuyerLocation = isOutForDelivery ? order.deliveryLocation : initialLocations?.buyer;
  const mapSellerLocation = isOutForDelivery ? { latitude: seller?.latitude || 0, longitude: seller?.longitude || 0 } : initialLocations?.seller;

  const showHoleSelection = !isDelivered && isGolfService && (forceIosView || (isIos && !isStandalone));

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/10 overflow-y-auto">
      <IosInstallPrompt open={isInstallPromptOpen} onOpenChange={setIsInstallPromptOpen} />

      {/* Prototype Preview Toggle - Visible only during chat session/dev */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant={forceIosView ? "default" : "secondary"}
          onClick={() => setForceIosView(!forceIosView)}
          className="rounded-full shadow-2xl h-10 px-4 font-black uppercase text-[10px] tracking-widest border-2 border-white"
        >
          <Eye className="mr-2 h-3.5 w-3.5" />
          {forceIosView ? "Showing iOS Preview" : "Preview iOS Browser UI"}
        </Button>
      </div>

      {!isDelivered && isGpsRequired && (
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
          
          {isTrackingActive && isOutForDelivery && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <Badge className="bg-primary/90 backdrop-blur-md text-white border-2 border-white/20 shadow-xl px-4 py-1.5 rounded-full flex items-center gap-2 animate-in zoom-in-90">
                <div className="relative">
                  <Satellite className="h-3.5 w-3.5 animate-pulse" />
                  <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">Live GPS Active</span>
              </Badge>
            </div>
          )}
        </div>
      )}

      {(!isGpsRequired || isDelivered) && (
        <div className="bg-background border-b px-4 py-3 flex items-center justify-end sticky top-0 z-10 shadow-sm shrink-0">
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
        {/* Order Tracking Card - Always at the top of content list */}
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
                {!isDelivered && isIos && !isStandalone && isGpsRequired && (
                  <div className="bg-[#213147] rounded-2xl p-5 border-b-4 border-primary shadow-inner space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/20 p-2.5 rounded-xl shrink-0">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-white uppercase tracking-tight">Pro Tip: Background Tracking</p>
                        <p className="text-[10px] text-white/70 font-medium leading-tight">
                          Standard browsers stop tracking when you lock your screen. Install the KOOP app to keep the GPS active in your pocket.
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setIsInstallPromptOpen(true)}
                      className="w-full bg-primary text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg"
                    >
                      <BellRing className="mr-2 h-3.5 w-3.5" />
                      Switch to Background GPS
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
                  <div className="px-4 py-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between animate-in fade-in duration-300">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Current Landmark
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
                        <span>CONVENIENCE FEE</span>
                        <span className="font-mono text-foreground">${order.serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>EST. TAX ({taxRatePercentage}%)</span>
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

        {isOrderActive && (
          <div className="px-1">
             <Alert className="bg-primary/95 text-white border-none shadow-xl backdrop-blur-md py-4 rounded-2xl">
                <Zap className="h-5 w-5 text-white fill-white animate-bounce" />
                <AlertTitle className="text-xs font-black uppercase tracking-[0.2em] mb-1">Stay Connected</AlertTitle>
                <AlertDescription className="text-[11px] font-medium opacity-90 leading-tight">
                  {isStandalone 
                    ? "Live background updates are active. You can safely lock your screen." 
                    : "We've locked your screen active so you can track your refreshments in real-time. Please keep this tab open for the most accurate service."}
                </AlertDescription>
              </Alert>
          </div>
        )}

        {showHoleSelection && (
          <Card className="border-2 border-primary/30 shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-500">
            <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Service Redundancy</span>
              </div>
              <Badge variant="outline" className="text-[8px] bg-white border-primary/20 uppercase font-black px-1.5 h-5">Hole Update</Badge>
            </div>
            
            <div className="bg-[#213147] px-4 py-3 border-b-2 border-primary flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-1.5 rounded-lg">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">Tired of manual updates?</p>
                  <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">Install for 100% Background GPS</p>
                </div>
              </div>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsInstallPromptOpen(true)}
                className="h-7 px-3 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg border border-white/10"
              >
                <BellRing className="mr-1.5 h-3 w-3" /> Install
              </Button>
            </div>

            <CardContent className="p-3 space-y-3">
              <div className="space-y-0.5 px-1">
                <h4 className="text-[11px] font-black uppercase tracking-tight">Current Hole Location</h4>
                <p className="text-[9px] text-muted-foreground font-medium leading-tight">
                  Update this so staff can find you even if your screen is off.
                </p>
              </div>
              
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 18 }, (_, i) => (i + 1).toString()).map((hole) => {
                  const currentHole = order.menuTypeLocation?.replace('Hole ', '');
                  const isSelected = currentHole === hole;
                  return (
                    <Button
                      key={hole}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      disabled={isUpdatingHole}
                      onClick={() => handleHoleUpdate(hole)}
                      className={cn(
                        "h-8 px-0 text-[10px] font-black rounded-md transition-all",
                        isSelected ? "bg-primary text-white scale-105 shadow-md border-primary" : "bg-white hover:bg-primary/5 text-muted-foreground"
                      )}
                    >
                      {hole}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
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
