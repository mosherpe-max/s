
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { MapView } from '@/components/map-view';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller, StaffMember, SolutionConfig } from '@/lib/types';
import { mockSellerLocation } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus, Package, LogOut, Truck, ChevronLeft, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { isToday, differenceInSeconds, differenceInMinutes } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn, calculateDistance, getSignalColor, getDriverColor, SUPER_ADMIN_ID, isStaffSessionStale } from '@/lib/utils';
import Link from 'next/link';

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function BevCartDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  const [currentStaffId, setCurrentStaffId] = useState<string | undefined>();
  const [currentStaffName, setCurrentStaffName] = useState<string>('');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [greeting, setGreeting] = useState('Hello');
  const [isExiting, setIsExiting] = useState(false);
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const lastBroadcastRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('koop_staff_id');
      const storedName = localStorage.getItem('koop_staff_name');
      const isImpersonating = localStorage.getItem('koop_is_admin_session') === 'true';
      const sessionStart = localStorage.getItem('koop_staff_session_start');
      const resetHour = solutionConfig?.dailyResetHour ?? 4;
      
      if (sessionStart && isStaffSessionStale(new Date(parseInt(sessionStart, 10)), resetHour)) {
        localStorage.removeItem('koop_is_admin_session');
        localStorage.removeItem('koop_staff_id');
        localStorage.removeItem('koop_staff_name');
        localStorage.removeItem('koop_staff_role');
        localStorage.removeItem('koop_staff_session_start');
        router.push(`/sellers/${sellerId}/staff-login`);
        toast({ title: "Shift Reset", description: "Daily operational reset performed. Please re-enter PIN." });
      } else {
        setCurrentStaffId(storedId || undefined);
        setCurrentStaffName(storedName || '');
        setIsAdminSession(isImpersonating);
      }

      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    }
  }, [sellerId, router, toast, solutionConfig?.dailyResetHour]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'staff');
  }, [firestore, sellerId]);
  const { data: allStaff } = useCollection<StaffMember>(staffQuery);

  useEffect(() => {
    if (primarySeller?.latitude && primarySeller?.longitude && !sellerLocation) {
      setSellerLocation({ latitude: primarySeller.latitude, longitude: primarySeller.longitude });
    }
  }, [primarySeller, sellerLocation]);

  const isBevCartActive = primarySeller?.bevcartActive === true;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId || !user) return;
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    const updateData = { bevcartActive: checked };
    updateDoc(sellerDocRef, updateData).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sellerDocRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    });
  };

  const handleExitTerminal = async (target: 'admin' | 'root') => {
    setIsExiting(true);

    if (currentStaffId && firestore && sellerId) {
      const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
      
      await updateDoc(staffRef, { 
        lastActive: new Date(0), 
        latitude: null, 
        longitude: null 
      }).catch(() => {});
      
      if (isAdminSession) {
        await deleteDoc(staffRef).catch(() => {});
      }
    }

    localStorage.removeItem('koop_is_admin_session');
    localStorage.removeItem('koop_staff_id');
    localStorage.removeItem('koop_staff_name');
    localStorage.removeItem('koop_staff_role');
    localStorage.removeItem('koop_staff_session_start');

    if (target === 'admin') {
      router.push(`/sellers/${sellerId}`);
    } else {
      router.push('/');
    }
  };

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
    return activeOrders
      .filter(o => o.menuType === 'Beverage Cart')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    const bevOrdersToday = allOrders.filter(o => o.menuType === 'Beverage Cart' && o.createdAt && isToday(o.createdAt.toDate()));
    const deliveredToday = bevOrdersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);

    // Ack Time (Today's acknowledged orders)
    const acknowledged = bevOrdersToday.filter(o => o.acknowledgedAt);
    const avgAck = acknowledged.length > 0 
      ? acknowledged.reduce((acc, o) => acc + differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()), 0) / acknowledged.length
      : 0;

    // Total Time (Today's delivered orders)
    const fulfilled = deliveredToday.filter(o => o.deliveredAt);
    const avgTotal = fulfilled.length > 0
      ? fulfilled.reduce((acc, o) => acc + differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()), 0) / fulfilled.length
      : 0;

    return { 
      dailyTips, 
      count: deliveredToday.length,
      avgAck: Math.round(avgAck),
      avgTotal: parseFloat(avgTotal.toFixed(1))
    };
  }, [allOrders]);

  useEffect(() => {
    if (!driverOrders || !now) return;
    const currentOrderIds = new Set(driverOrders.map(o => o.id));
    const newOrders = driverOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      toast({ title: "NEW ORDER RECEIVED!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [driverOrders, now, toast]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const broadcastLocation = (lat: number, lng: number) => {
    if (!firestore || !sellerId || !user || isExiting) return;
    
    const nowTime = Date.now();
    const syncInterval = (solutionConfig?.mapUpdateSettings?.['Beverage Cart']?.frequencySeconds || 15) * 1000;
    
    if (lastBroadcastRef.current) {
      const distance = calculateDistance(lat, lng, lastBroadcastRef.current.lat, lastBroadcastRef.current.lng);
      const timeElapsed = nowTime - lastBroadcastRef.current.time;
      if (distance < 5 && timeElapsed < 60000) return;
      if (timeElapsed < syncInterval) return;
    }

    lastBroadcastRef.current = { lat, lng, time: nowTime };
    
    if (currentStaffId) {
      const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
      const staffData = { latitude: lat, longitude: lng, lastActive: serverTimestamp() };
      setDoc(staffRef, staffData, { merge: true }).catch(() => {});
    }

    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    const venueData = { latitude: lat, longitude: lng, lastActive: serverTimestamp() };
    updateDoc(sellerDocRef, venueData).catch(() => {});
  };

  useEffect(() => {
    if (navigator.geolocation && firestore && sellerId && user && !isExiting) {
      navigator.geolocation.getCurrentPosition((p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setSellerLocation({ latitude: lat, longitude: lng });
        broadcastLocation(lat, lng);
      }, null, { enableHighAccuracy: true });
    }
  }, [firestore, sellerId, user, currentStaffId, solutionConfig, isExiting]);

  useEffect(() => {
    if (navigator.geolocation && firestore && sellerId && user && !isExiting) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          if (isExiting) return;
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setSellerLocation(prev => {
            if (!prev) return { latitude: lat, longitude: lng };
            const dist = calculateDistance(lat, lng, prev.latitude, prev.longitude);
            return dist > 5 ? { latitude: lat, longitude: lng } : prev;
          });
          broadcastLocation(lat, lng);
        },
        null,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [firestore, sellerId, user, currentStaffId, solutionConfig, isExiting]);

  const handleUpdateOrderStatus = (orderId: string, currentStatus: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(currentStatus as any) + 1;
    
    if (nextIdx < stages.length) {
      const nextStatus = stages[nextIdx];
      const updateData: any = { 
        status: nextStatus, 
        deliveredAt: nextStatus === 'Delivered' ? serverTimestamp() : null 
      };

      if (nextStatus === 'Preparing') {
        updateData.acknowledgedAt = serverTimestamp();
        const staffId = localStorage.getItem('koop_staff_id');
        const staffName = localStorage.getItem('koop_staff_name');
        if (staffId && staffName) {
          updateData.assignedStaffId = staffId;
          updateData.assignedStaffName = staffName;
        }
      }

      const orderRef = doc(firestore, 'orders', orderId);
      updateDoc(orderRef, updateData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
      });
    }
  };

  const handleAttachOrder = (orderId: string) => {
    if (!firestore) return;
    const staffId = localStorage.getItem('koop_staff_id');
    const staffName = localStorage.getItem('koop_staff_name');
    if (!staffId || !staffName) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = { assignedStaffId: staffId, assignedStaffName: staffName, updatedAt: serverTimestamp() };
    updateDoc(orderRef, updateData).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
    });
  };

  const mappedBuyers = useMemo(() => {
    if (!now || !driverOrders) return [];
    return driverOrders.map(o => {
      const lastGps = o.lastGpsUpdate?.toDate();
      const color = getSignalColor(lastGps, solutionConfig?.gpsFreshnessThresholds);
      return { id: o.id, name: o.customerName, location: o.deliveryLocation, colorOverride: color, colorClass: o.status === 'Out for Delivery' ? "bg-blue-600" : "bg-green-600" };
    });
  }, [driverOrders, now, solutionConfig]);

  const mappedDrivers = useMemo(() => {
    if (!allStaff) return [];
    return allStaff
      .filter(s => s.id !== currentStaffId && s.latitude && s.longitude && s.lastActive)
      .map(s => {
        // Unique coloring for staff, ignore signal freshness per user request
        const color = getDriverColor(s.id);
        return { id: s.id, name: s.name, location: { latitude: s.latitude!, longitude: s.longitude! }, type: s.role === 'Driver' || s.role === 'Staff' ? 'Beverage Cart' : 'Clubhouse', colorOverride: color };
      });
  }, [allStaff, currentStaffId, solutionConfig]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-x-auto bg-muted/20 text-left">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm text-left">
        <div className="flex items-center gap-4">
          {isAdminSession && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white" onClick={() => handleExitTerminal('admin')} disabled={isExiting}><ChevronLeft className="h-3 w-3 mr-1" /> {isExiting ? 'Closing...' : 'Exit Terminal'}</Button>
              {isSuperAdmin && (
                <Button variant="outline" size="sm" asChild className="h-8 text-[9px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"><Link href="/admin"><ShieldAlert className="h-3 w-3 mr-1" /> Solution Admin</Link></Button>
              )}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight leading-none mb-0.5">BEVCART PORTAL</h1>
              {isAdminSession && <Badge className="bg-amber-500 text-white border-0 text-[7px] font-black uppercase h-3.5 px-1 animate-pulse">Impersonating</Badge>}
            </div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">{greeting}, {currentStaffName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isBevCartActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => handleExitTerminal('root')} className="text-white/40 hover:text-white" disabled={isExiting}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 py-2 bg-background border-b flex items-center justify-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Daily Tips</span>
          <span className="text-xs font-bold">${metrics?.dailyTips.toFixed(2) || '0.00'}</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Deliveries</span>
          <span className="text-xs font-bold">{metrics?.count || '0'}</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Ack Time</span>
          <span className="text-xs font-bold">{metrics?.avgAck || '0'}s</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Total</span>
          <span className="text-xs font-bold">{metrics?.avgTotal || '0'}m</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-auto p-4 gap-4">
        <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
         <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
          
          {/* SIGNAL STATUS OVERLAY */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <Badge className={cn(
              "flex items-center gap-1.5 px-2 py-1 border-0 shadow-lg transition-colors",
              isBevCartActive ? "bg-green-600 text-white" : "bg-slate-500/80 text-white"
            )}>
              <div className={cn("h-1.5 w-1.5 rounded-full", isBevCartActive ? "bg-white animate-pulse" : "bg-white/40")} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {isBevCartActive ? "Signal Live" : "Signal Off"}
              </span>
            </Badge>
          </div>

          {sellerLocation ? (
            <MapView 
              sellerLocation={sellerLocation} 
              primaryType="Beverage Cart"
              primaryDriverId={currentStaffId}
              buyers={mappedBuyers} 
              drivers={mappedDrivers}
              radius={1609.34} 
              fitTrigger={fitTrigger}
              showPrimaryMarker={isBevCartActive} 
              interactive={true}
            />
          ) : <Skeleton className="w-full h-full" />}
        </div>
        <div className="w-full md:w-1/3 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0">
          <h2 className="font-headline text-xs font-black px-4 py-3 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <span>Active Orders</span>
            <span className="bg-[#213147] text-white text-[10px] font-black rounded-full px-2 py-0.5">{driverOrders.length}</span>
          </h2>
          <div className="flex-1 overflow-auto px-2 text-left">
            <div className="py-2.5 space-y-3">
              {isLoading ? <Skeleton className="h-40 w-full" /> : driverOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40 text-center">
                  <Package className="h-10 w-10 mb-2" />
                  <p className="text-[10px] font-black uppercase">No active orders</p>
                </div>
              ) : (
                driverOrders.map((order, index) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={index + 1} 
                    now={now} 
                    onUpdateStatus={handleUpdateOrderStatus}
                    onAttach={handleAttachOrder}
                    currentStaffId={currentStaffId}
                    thresholds={primarySeller?.orderThresholds?.[order.menuType]}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
