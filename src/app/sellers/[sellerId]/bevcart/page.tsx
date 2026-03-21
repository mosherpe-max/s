'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
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
import { Focus, Bell, Package, AlertCircle, Clock, DollarSign, Timer, AlertTriangle, LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isStaffSessionStale, SUPER_ADMIN_ID } from '@/lib/utils';
import { isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function BevCartDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;

  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const sellerLocRef = useRef<LatLng | null>(null);
  const [zoomMode, setZoomMode] = useState<'radius' | 'all'>('radius');
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  const [staffName, setStaffName] = useState('');
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const notifiedOverdueRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const wakeLockRef = useRef<any>(null);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  // Staff Session Enforcement & Impersonation Bypass
  useEffect(() => {
    if (isUserLoading) return;

    if (isSuperAdmin) {
      setStaffName("Platform Admin");
      return;
    }

    const storedStaffId = localStorage.getItem('koop_staff_id');
    const storedVenueId = localStorage.getItem('koop_venue_id');
    const name = localStorage.getItem('koop_staff_name');
    
    if (!storedStaffId || storedVenueId !== sellerId) {
      router.push(`/sellers/${sellerId}/staff-login`);
    } else if (name) {
      setStaffName(name);
    }
  }, [sellerId, router, isSuperAdmin, isUserLoading]);

  const handleStaffLogout = () => {
    localStorage.removeItem('koop_staff_id');
    localStorage.removeItem('koop_staff_name');
    localStorage.removeItem('koop_staff_role');
    router.push(`/sellers/${sellerId}/staff-login`);
  };

  const isBevCartActive = primarySeller?.bevcartActive === true;
  const thresholds = primarySeller?.orderThresholds?.['Beverage Cart'] || { warning: 7, max: 10 };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendSystemNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://picsum.photos/seed/koop-staff/192/192',
        badge: 'https://picsum.photos/seed/koop-staff/96/96',
        tag: 'staff-alert',
        renotify: true,
      });
    }
  };

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isBevCartActive && !wakeLockRef.current) {
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

    if (isBevCartActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isBevCartActive]);

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    const updates = { 
      bevcartActive: checked,
      lastActive: checked ? serverTimestamp() : null
    };
    updateDoc(sellerDocRef, updates).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sellerDocRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });
  };

  // 4 AM EST Auto-Reset Logic (Bypass for Super Admin)
  useEffect(() => {
    if (primarySeller && isBevCartActive && primarySeller.lastActive && !isSuperAdmin) {
      const lastActiveDate = primarySeller.lastActive.toDate();
      if (isStaffSessionStale(lastActiveDate)) {
        handleToggleActive(false);
      }
    }
  }, [primarySeller, isBevCartActive, isSuperAdmin]);

  const activeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', sellerId),
      where('status', 'in', ['Placed', 'Preparing', 'Out for Delivery'])
    );
  }, [firestore, sellerId]);

  const { data: activeOrders, isLoading: areActiveOrdersLoading } = useCollection<Order>(activeOrdersQuery);

  const allOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return query(collection(firestore, 'orders'), where('sellerId', '==', sellerId));
  }, [firestore, sellerId]);

  const { data: allOrders } = useCollection<Order>(allOrdersQuery);

  const driverOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Beverage Cart');
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    
    const bevOrdersToday = allOrders.filter(o => 
      o.menuType === 'Beverage Cart' && 
      o.createdAt && 
      isToday(o.createdAt.toDate())
    );

    const deliveredToday = bevOrdersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);
    
    let totalMinutes = 0;
    deliveredToday.forEach(o => {
      if (o.deliveredAt && o.createdAt) {
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        totalMinutes += duration;
      }
    });
    
    const avgTime = deliveredToday.length > 0 ? totalMinutes / deliveredToday.length : 0;
    const thresholdMax = thresholds.max;
    
    const exceededCount = bevOrdersToday.filter(o => {
      if (o.status === 'Delivered' && o.deliveredAt && o.createdAt) {
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        return duration > thresholdMax;
      }
      if (o.createdAt) {
        const duration = (now - o.createdAt.toDate().getTime()) / 60000;
        return duration > thresholdMax;
      }
      return false;
    }).length;

    return { dailyTips, avgTime, exceededCount };
  }, [allOrders, thresholds.max, now]);

  useEffect(() => {
    if (!driverOrders || !now) return;

    const currentOrderIds = new Set(driverOrders.map(o => o.id));
    const newOrders = driverOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-black text-lg text-primary uppercase">NEW ORDER RECEIVED!</span>
          </div>
        ),
        description: `You have ${newOrders.length} new order(s).`,
      });

      sendSystemNotification(
        'New BevCart Order!',
        `You have ${newOrders.length} new order(s) waiting for confirmation.`
      );
    }
    lastOrderIdsRef.current = currentOrderIds;

    const overdueOrders = driverOrders.filter(o => {
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

        sendSystemNotification(
          'URGENT: Order Overdue!',
          `Order for ${o.customerName} has exceeded ${thresholds.max} minutes.`
        );
      });
    }

    initialLoadRef.current = false;
  }, [driverOrders, now, toast, thresholds.max]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
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
        () => setSellerLocation(mockSellerLocation),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setSellerLocation(mockSellerLocation);
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isBevCartActive || !sellerId) return;

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
  }, [firestore, isBevCartActive, sellerId]);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status'], driverId?: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updates: any = { status };
    if (driverId) updates.assignedDriverId = driverId;
    if (status === 'Delivered') updates.deliveredAt = serverTimestamp();
    
    updateDoc(orderRef, updates).catch(async () => {
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
    
    updateDoc(orderRef, updates).then(() => {
      toast({ title: "Order Handed Off" });
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: orderRef.path,
        operation: 'update',
        requestResourceData: updates
      }));
    });
  };

  const activeSellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), where('status', '==', 'Active'));
  }, [firestore]);
  const { data: activeSellers, isLoading: areSellersLoading } = useCollection<Seller>(activeSellersQuery);

  const otherActiveDrivers = useMemo(() => {
    if (!activeSellers || !now) return [];
    const threshold = 120000;
    return activeSellers
        .filter(s => {
            if (s.id === sellerId) return false;
            if (!s.lastActive) return false;
            return (now - s.lastActive.toDate().getTime()) < threshold;
        })
        .map(s => ({ id: s.id, name: s.courseName }));
  }, [activeSellers, now, sellerId]);

  const mappedSellers = useMemo(() => {
    return otherActiveDrivers.map(d => {
      const seller = activeSellers?.find(s => s.id === d.id);
      return {
        id: d.id,
        name: d.name,
        location: { latitude: seller?.latitude || 0, longitude: seller?.longitude || 0 }
      };
    });
  }, [otherActiveDrivers, activeSellers]);

  const mappedBuyers = useMemo(() => {
    if (!now || !driverOrders) return [];
    return driverOrders.map(o => {
      let colorClass = "bg-green-600";
      if (o.createdAt) {
        const minutesElapsed = (now - o.createdAt.toDate().getTime()) / 60000;
        if (minutesElapsed >= thresholds.max) colorClass = "bg-red-600";
        else if (minutesElapsed >= thresholds.warning) colorClass = "bg-yellow-500";
      }
      return { id: o.id, name: o.customerName, location: o.deliveryLocation, colorClass, assignedDriverId: o.assignedDriverId };
    });
  }, [driverOrders, now, thresholds]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading || areSellersLoading || isUserLoading;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
        <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
          <div className="flex flex-col min-w-0 flex-1 mr-4">
            <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold text-white uppercase tracking-tight truncate">
              BEVCART DASHBOARD
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none truncate">
                {primarySeller?.courseName || 'Loading...'}
              </span>
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 border-white/10 text-white font-black uppercase">
                <User className="h-2 w-2 mr-1" /> {staffName}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-4 shrink-0">
            <div className="flex items-center space-x-2">
              <Switch id="active-mode" checked={isBevCartActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
              <Label htmlFor="active-mode" className="text-[10px] font-semibold whitespace-nowrap text-white uppercase">
                {isBevCartActive ? 'ACTIVE' : 'INACTIVE'}
              </Label>
            </div>
            <Button variant="ghost" size="icon" onClick={handleStaffLogout} className="text-white/40 hover:text-white hover:bg-white/10 h-9 w-9 rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Compact Metrics Bar */}
        <div className="flex-shrink-0 px-4 py-2 bg-background border-b flex items-center justify-center gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-green-500/10 rounded-lg"><DollarSign className="h-3.5 w-3.5 text-green-600" /></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">Daily Tips</span>
              <span className="text-xs font-bold">${metrics?.dailyTips.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-muted" />
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-blue-500/10 rounded-lg"><Timer className="h-3.5 w-3.5 text-blue-600" /></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">Avg Duration</span>
              <span className="text-xs font-bold">{metrics?.avgTime.toFixed(1) || '0'}m</span>
            </div>
          </div>
          <div className="h-6 w-px bg-muted" />
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 bg-red-500/10 rounded-lg"><AlertTriangle className="h-3.5 w-3.5 text-red-600" /></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest leading-none">Alerts</span>
              <span className="text-xs font-bold text-red-600">{metrics?.exceededCount || '0'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 p-4 gap-4">
          <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted shrink-0 md:shrink rounded-xl overflow-hidden border-2 shadow-sm">
           <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
            {sellerLocation ? (
              <MapView 
                sellerLocation={sellerLocation} 
                sellers={mappedSellers} 
                buyers={mappedBuyers} 
                radius={1609.34} 
                zoomMode={zoomMode} 
                fitTrigger={fitTrigger}
                showPrimaryMarker={isBevCartActive} 
                primaryDriverId={sellerId} 
              />
            ) : <Skeleton className="w-full h-full" />}
          </div>
          <div className="w-full md:w-1/3 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0 shadow-sm">
            <h2 className="font-headline text-sm font-black px-4 pt-3 pb-2 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
              <span className="truncate mr-2">Assigned Orders</span>
              <span className="bg-[#E50000] text-white text-[10px] font-black rounded-full px-2 py-0.5 shrink-0">{driverOrders.length}</span>
            </h2>
            <ScrollArea className="flex-1 w-full px-2">
              <div className="py-2.5 space-y-3 pb-12">
                {isLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
                ) : driverOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-muted-foreground py-20 text-center px-4">
                    <Package className="h-10 w-10 opacity-20 mb-2" />
                    <p className="italic text-xs font-black uppercase tracking-widest opacity-40">No active orders</p>
                  </div>
                ) : (
                  driverOrders.map((order, index) => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      orderNumber={index + 1} 
                      onUpdateStatus={handleUpdateOrderStatus} 
                      onHandoff={handleHandoff}
                      availableDrivers={otherActiveDrivers}
                      currentDriverId={sellerId} 
                      thresholds={thresholds}
                      now={now || Date.now()}
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
