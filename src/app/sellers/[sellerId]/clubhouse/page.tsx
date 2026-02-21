
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus, Bell, Package, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function ClubhouseDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const sellerLocRef = useRef<LatLng | null>(null);
  const [zoomMode, setZoomMode] = useState<'radius' | 'all'>('radius');
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [now, setNow] = useState<number | null>(null);
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const notifiedOverdueRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const wakeLockRef = useRef<any>(null);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const activeSellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), where('status', '==', 'Active'));
  }, [firestore]);
  const { data: activeSellers, isLoading: areSellersLoading } = useCollection<Seller>(activeSellersQuery);

  const isClubhouseActive = primarySeller?.clubhouseActive === true;
  const thresholds = primarySeller?.orderThresholds?.['Clubhouse'] || { warning: 15, max: 20 };

  // Persistence: Wake Lock Management
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isClubhouseActive && !wakeLockRef.current) {
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

    if (isClubhouseActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isClubhouseActive]);

  // Midnight Auto-Reset Logic (Internal)
  useEffect(() => {
    const checkMidnight = () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const storedDate = localStorage.getItem('last-clubhouse-session-date');
      
      if (storedDate && storedDate !== todayStr && isClubhouseActive) {
        handleToggleActive(false);
      }
      localStorage.setItem('last-clubhouse-session-date', todayStr);
    };

    const interval = setInterval(checkMidnight, 60000);
    checkMidnight();
    
    return () => clearInterval(interval);
  }, [isClubhouseActive]);

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', sellerId),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, sellerId]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

  const clubhouseOrders = useMemo(() => {
    if (!activeOrders) return [];
    // Clubhouse driver handles all orders that are NOT specifically Beverage Cart
    return activeOrders.filter(o => o.menuType !== 'Beverage Cart');
  }, [activeOrders]);

  useEffect(() => {
    const handleUnload = () => {
      if (firestore && isClubhouseActive && sellerId) {
        const sellerDocRef = doc(firestore, 'sellers', sellerId);
        updateDoc(sellerDocRef, { clubhouseActive: false }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [firestore, isClubhouseActive, sellerId]);

  useEffect(() => {
    if (!clubhouseOrders || !now) return;

    const currentOrderIds = new Set(clubhouseOrders.map(o => o.id));
    const newOrders = clubhouseOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-bold text-lg text-primary uppercase">NEW SERVICE ORDER!</span>
          </div>
        ),
        description: `You have ${newOrders.length} new order(s).`,
      });
    }
    lastOrderIdsRef.current = currentOrderIds;

    const overdueOrders = clubhouseOrders.filter(o => {
      if (!o.createdAt || notifiedOverdueRef.current.has(o.id)) return false;
      const minutesElapsed = (now - o.createdAt.toDate().getTime()) / (1000 * 60);
      return minutesElapsed >= thresholds.max;
    });

    if (overdueOrders.length > 0) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      overdueOrders.forEach(o => {
        notifiedOverdueRef.current.add(o.id);
        toast({
          variant: "destructive",
          title: (
            <div className="flex items-center gap-2 text-white">
              <Clock className="h-5 w-5 animate-pulse" />
              <span className="font-headline font-bold text-lg uppercase">MAX DURATION REACHED!</span>
            </div>
          ),
          description: `Order for ${o.customerName} has reached ${thresholds.max} minutes.`,
        });
      });
    }

    initialLoadRef.current = false;
  }, [clubhouseOrders, now, toast, thresholds.max]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sellerLocRef.current = sellerLocation;
  }, [sellerLocation]);

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
          setSellerLocation(mockSellerLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setSellerLocation(mockSellerLocation);
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isClubhouseActive || !sellerId) return;

    const syncLocation = async () => {
      if (sellerLocRef.current) {
        const sellerDocRef = doc(firestore, 'sellers', sellerId);
        updateDoc(sellerDocRef, {
          latitude: sellerLocRef.current.latitude,
          longitude: sellerLocRef.current.longitude,
          lastActive: serverTimestamp()
        }).catch(() => {});
      }
    };

    const intervalId = setInterval(syncLocation, 15000);
    return () => clearInterval(intervalId);
  }, [firestore, isClubhouseActive, sellerId]);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status'], driverId?: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updates: any = { status };
    if (driverId) {
        updates.assignedDriverId = driverId;
    }
    if (status === 'Delivered') {
      updates.deliveredAt = serverTimestamp();
    }
    updateDoc(orderRef, updates)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
      });
  };

  const handleHandoff = (orderId: string, targetDriverId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updates = { assignedDriverId: targetDriverId };
    
    updateDoc(orderRef, updates)
      .then(() => {
        toast({
          title: "Order Handed Off",
          description: "Responsibility for the order has been transferred.",
        });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: orderRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
      });
  };

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    const updates = { 
        clubhouseActive: checked,
        lastActive: checked ? serverTimestamp() : null
    };
    updateDoc(sellerDocRef, updates)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerDocRef.path,
          operation: 'update',
          requestResourceData: updates
        }));
      });
  };

  const otherActiveDrivers = useMemo(() => {
    if (!activeSellers || !now) return [];
    const threshold = 120000;
    return activeSellers
        .filter(s => {
            if (s.id === sellerId) return false;
            if (!s.lastActive) return false;
            const lastActiveTime = s.lastActive.toDate().getTime();
            return (now - lastActiveTime) < threshold;
        })
        .map(s => ({
            id: s.id,
            name: s.courseName
        }));
  }, [activeSellers, now, sellerId]);

  const mappedBuyers = useMemo(() => {
    if (!now || !activeOrders) return [];
    return activeOrders.filter(o => o.menuType !== 'Beverage Cart').map(o => {
      let colorClass = "bg-green-600";
      if (o.createdAt) {
        const orderTime = o.createdAt.toDate().getTime();
        const minutesElapsed = (now - orderTime) / (1000 * 60);
        if (minutesElapsed >= thresholds.max) {
          colorClass = "bg-red-600";
        } else if (minutesElapsed >= thresholds.warning) {
          colorClass = "bg-yellow-500";
        }
      }
      return {
        id: o.id,
        name: o.customerName,
        location: o.deliveryLocation,
        colorClass,
        assignedDriverId: o.assignedDriverId
      };
    });
  }, [activeOrders, now, thresholds]);

  const handleFocusClick = () => {
    setZoomMode(current => (current === 'radius' ? 'all' : 'radius'));
    setFitTrigger(prev => prev + 1);
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading || areSellersLoading;

  if (!isPrimaryLoading && !primarySeller) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-8 text-center space-y-6 text-muted-foreground">
              <AlertCircle className="h-16 w-16 opacity-20" />
              <h1 className="text-2xl font-headline font-bold uppercase text-[#213147]">KOOP CLUBHOUSE INTERFACE</h1>
              <p className="max-w-sm">Initialize your seller profile to access driver tools.</p>
              <Button asChild><Link href={`/sellers/${sellerId}`}>Initialize Seller Profile</Link></Button>
          </div>
      );
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
        <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
          <div className="flex flex-col min-w-0 flex-1 mr-4">
            <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold text-white uppercase tracking-tight truncate">
              CLUBHOUSE DASHBOARD
            </h1>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none truncate">
              ESTABLISHMENT: {primarySeller?.courseName || 'Loading...'}
            </span>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Switch id="clubhouse-active" checked={isClubhouseActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
            <Label htmlFor="clubhouse-active" className="text-[10px] sm:text-sm font-semibold whitespace-nowrap text-white uppercase">
              {isClubhouseActive ? 'ACTIVE' : 'INACTIVE'}
            </Label>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 p-4 gap-4">
          <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted shrink-0 md:shrink rounded-xl overflow-hidden border-2 shadow-sm">
           <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background h-8 w-8" onClick={handleFocusClick}><Focus className="h-4 w-4" /></Button>
            {sellerLocation ? (
              <MapView 
                sellerLocation={sellerLocation} 
                buyers={mappedBuyers} 
                radius={1609.34} 
                zoomMode={zoomMode} 
                fitTrigger={fitTrigger}
                showPrimaryMarker={isClubhouseActive} 
                primaryDriverId={sellerId} 
              />
            ) : <Skeleton className="w-full h-full" />}
          </div>
          <div className="w-full md:w-1/3 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0 shadow-sm">
            <h2 className="font-headline text-base font-semibold px-4 pt-3 pb-2 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10">
              <span className="truncate mr-2">Service Orders</span>
              <span className="bg-[#E50000] text-white text-[10px] rounded-full px-2 py-0.5 shrink-0">{clubhouseOrders.length}</span>
            </h2>
            <ScrollArea className="flex-1 w-full px-2">
              <div className="py-2.5 space-y-3 pb-12">
                {isLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
                ) : clubhouseOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-20 text-center px-4">
                    <Package className="h-10 w-10 opacity-20 mb-2" />
                    <p className="italic text-sm">No active service orders.</p>
                  </div>
                ) : (
                  clubhouseOrders.map((order, index) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      orderNumber={index + 1} 
                      onUpdateStatus={handleUpdateOrderStatus} 
                      onHandoff={handleHandoff}
                      availableDrivers={otherActiveDrivers}
                      currentDriverId={sellerId} 
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
