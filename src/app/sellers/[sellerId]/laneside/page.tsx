
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, Package, AlertCircle, Clock, MapPin, DollarSign, Timer, AlertTriangle, LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format, isToday } from 'date-fns';
import { isStaffSessionStale, SUPER_ADMIN_ID } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function LaneSideServerDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [staffName, setStaffName] = useState('');

  // Role Checks
  const sellerRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole } = useDoc(sellerRoleRef);

  const salesRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_sales_rep', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: salesRole } = useDoc(salesRoleRef);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;
  const isVenueAdmin = sellerRole?.sellerId === sellerId;
  const isSalesRepForDemo = !!salesRole && sellerId.startsWith('demo-');
  const isImpersonating = isSuperAdmin || isVenueAdmin || isSalesRepForDemo;

  const [now, setNow] = useState<number>(Date.now());
  
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Staff Session Enforcement & Impersonation Bypass
  useEffect(() => {
    if (isUserLoading) return;

    if (isImpersonating) {
      const identity = isSuperAdmin ? "Platform Admin" : isSalesRepForDemo ? "Sales Demo Mode" : "Venue Admin";
      setStaffName(identity);
      return;
    }

    const storedStaffId = localStorage.getItem('koop_staff_id');
    const storedVenueId = localStorage.getItem('koop_venue_id');
    const storedRole = localStorage.getItem('koop_staff_role');
    const name = localStorage.getItem('koop_staff_name');
    
    // Shift Validation
    if (!storedStaffId || storedVenueId !== sellerId || storedRole !== 'Lane Delivery') {
      router.push(`/sellers/${sellerId}/staff-login`);
    } else if (name) {
      setStaffName(name);
    }
  }, [sellerId, router, isImpersonating, isUserLoading, isSuperAdmin, isSalesRepForDemo]);

  const handleStaffLogout = () => {
    if (isImpersonating) {
      router.back();
      return;
    }
    localStorage.removeItem('koop_staff_id');
    localStorage.removeItem('koop_staff_name');
    localStorage.removeItem('koop_staff_role');
    router.push(`/sellers/${sellerId}/staff-login`);
  };

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const isServerActive = primarySeller?.lanedeliveryActive === true;
  const thresholds = primarySeller?.orderThresholds?.['Lane Delivery'] || { warning: 7, max: 10 };

  // Request Notification Permission
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

  // 4 AM EST Auto-Reset Logic (Bypass for Impersonators)
  useEffect(() => {
    if (primarySeller && isServerActive && primarySeller.lastActive && !isImpersonating) {
      const lastActiveDate = primarySeller.lastActive.toDate();
      if (isStaffSessionStale(lastActiveDate)) {
        handleToggleActive(false);
      }
    }
  }, [primarySeller, isServerActive, isImpersonating]);

  // Activity Heartbeat
  useEffect(() => {
    if (!firestore || !isServerActive || !sellerId) return;

    const syncStatus = async () => {
      const sellerDocRef = doc(firestore, 'sellers', sellerId);
      updateDoc(sellerDocRef, {
        lastActive: serverTimestamp()
      }).catch(() => {});
    };

    const intervalId = setInterval(syncStatus, 30000);
    syncStatus();
    return () => clearInterval(intervalId);
  }, [firestore, isServerActive, sellerId]);

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
    return query(
      collection(firestore, 'orders'),
      where('sellerId', '==', sellerId)
    );
  }, [firestore, sellerId]);

  const { data: allOrders } = useCollection<Order>(allOrdersQuery);

  const lanesideOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType === 'Lane Delivery');
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders || !primarySeller) return null;
    
    const laneOrdersToday = allOrders.filter(o => 
      o.menuType === 'Lane Delivery' && 
      o.createdAt && 
      isToday(o.createdAt.toDate())
    );

    const deliveredToday = laneOrdersToday.filter(o => o.status === 'Delivered');
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
    
    const exceededCount = laneOrdersToday.filter(o => {
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
  }, [allOrders, primarySeller, now, thresholds.max]);

  useEffect(() => {
    if (!lanesideOrders || !now) return;

    const currentOrderIds = new Set(lanesideOrders.map(o => o.id));
    const newOrders = lanesideOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      toast({
        title: (
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary animate-bounce" />
            <span className="font-headline font-bold text-lg text-primary uppercase">NEW LANE ORDER!</span>
          </div>
        ),
        description: `New order for ${newOrders[0].menuTypeLocation || 'a lane'}.`,
      });

      sendSystemNotification(
        'New Lane Order!',
        `New order received for ${newOrders[0].menuTypeLocation || 'a lane'}.`
      );
    }
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [lanesideOrders, now, toast]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

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

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    updateDoc(sellerDocRef, { 
      lanedeliveryActive: checked,
      lastActive: checked ? serverTimestamp() : null
    })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerDocRef.path,
          operation: 'update',
          requestResourceData: { lanedeliveryActive: checked }
        }));
      });
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading || isUserLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0 flex-1 mr-4">
          <h1 className="font-headline text-sm sm:text-base md:text-xl font-bold text-white uppercase tracking-tight truncate">
            LANESIDE SERVER
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/60 tracking-widest leading-none truncate">
              {primarySeller?.courseName || 'Bowling Alley'}
            </span>
            <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 border-white/10 text-white font-black uppercase">
              <User className="h-2 w-2 mr-1" /> {staffName}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Switch id="server-active" checked={isServerActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
            <Label htmlFor="server-active" className="text-[10px] sm:text-sm font-semibold whitespace-nowrap text-white uppercase">
              {isServerActive ? 'ONLINE' : 'OFFLINE'}
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

      <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden max-w-6xl mx-auto w-full">
        <div className="flex-1 bg-white border-2 rounded-xl overflow-hidden flex flex-col shadow-sm min-h-0">
          <h2 className="font-headline text-base font-semibold px-4 py-3 border-b flex items-center justify-between uppercase bg-muted/10">
            <span>Pending Deliveries</span>
            <Badge variant="secondary" className="font-mono">{lanesideOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
              {isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
              ) : lanesideOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground py-32 text-center">
                  <MapPin className="h-12 w-12 opacity-10 mb-4" />
                  <p className="font-medium italic">No active lane deliveries.</p>
                  <p className="text-xs mt-1">Orders will appear here once placed by customers.</p>
                </div>
              ) : (
                lanesideOrders.map((order, index) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={index + 1} 
                    onUpdateStatus={handleUpdateOrderStatus} 
                    currentDriverId={sellerId} 
                    thresholds={thresholds}
                    now={now}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
