
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller, StaffMember, SolutionConfig } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, Building, LayoutList, Focus, ChevronLeft, ShieldAlert, History, AlertTriangle, BellRing, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/map-view';
import { LocationGate } from '@/components/location-gate';
import { isToday, differenceInSeconds, differenceInMinutes, format } from 'date-fns';
import { cn, getSignalColor, getDriverColor, SUPER_ADMIN_ID, isStaffSessionStale, getNumericOrderId, playNotificationSound } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LatLng = {
  latitude: number;
  longitude: number;
};

export default function ClubhouseDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [now, setNow] = useState<number>(Date.now());
  const [sellerLocation, setSellerLocation] = useState<LatLng | null>(null);
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [currentStaffId, setCurrentStaffId] = useState<string | undefined>();
  const [currentStaffName, setCurrentStaffName] = useState<string>('');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [locationEnabled, setLocationEnabled] = useState(false);

  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const mySessionIdRef = useRef<string | undefined>(undefined);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  // Monitor CURRENT Staff Member's active state
  const myStaffDocRef = useMemoFirebase(() => {
    if (!firestore || !sellerId || !currentStaffId) return null;
    return doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
  }, [firestore, sellerId, currentStaffId]);
  const { data: myStaffData } = useDoc<StaffMember>(myStaffDocRef);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('koop_staff_id');
      const storedName = localStorage.getItem('koop_staff_name');
      const isImpersonating = localStorage.getItem('koop_is_admin_session') === 'true';
      const sessionStart = localStorage.getItem('koop_staff_session_start');
      const resetHour = solutionConfig?.dailyResetHour ?? 4;
      mySessionIdRef.current = localStorage.getItem('koop_staff_session_id') || undefined;

      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
      
      // A. Check for STALE session (past reset hour)
      if (sessionStart && isStaffSessionStale(new Date(parseInt(sessionStart, 10)), resetHour)) {
        handleExitTerminal('root');
        toast({ title: "Shift Expired", description: "Your shift has ended per the daily reset policy." });
      } else {
        setCurrentStaffId(storedId || undefined);
        setCurrentStaffName(storedName || '');
        setIsAdminSession(isImpersonating);
      }
    }
  }, [sellerId, router, toast, solutionConfig?.dailyResetHour]);

  // B. Check for REMOTE logout (activeMode cleared by backend reset)
  useEffect(() => {
    if (myStaffData && myStaffData.activeMode === null && !isAdminSession && !isExiting) {
      toast({ title: "Session Terminated", description: "You have been logged out by a system reset." });
      handleExitTerminal('root');
    }
  }, [myStaffData?.activeMode, isAdminSession, isExiting]);

  // B2. Check for SUPERSEDED session - this staff PIN was used to sign in on
  // another device (same mode or a different one), so this device signs out
  // rather than silently fighting the new device over the shift.
  useEffect(() => {
    if (
      myStaffData?.activeSessionId &&
      mySessionIdRef.current &&
      myStaffData.activeSessionId !== mySessionIdRef.current &&
      !isAdminSession && !isExiting
    ) {
      toast({ variant: 'destructive', title: "Signed In Elsewhere", description: "This staff PIN was used to sign in on another device, so this session has ended." });
      handleExitTerminal('root', false);
    }
  }, [myStaffData?.activeSessionId, isAdminSession, isExiting]);

  // C. Check for MODE deactivation by Manager
  useEffect(() => {
    if (primarySeller && primarySeller.clubhouseActive === false && !isAdminSession && !isExiting) {
      toast({ variant: "destructive", title: "Channel Closed", description: "Clubhouse service has been deactivated by management." });
      handleExitTerminal('root');
    }
  }, [primarySeller?.clubhouseActive, isAdminSession, isExiting]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'staff');
  }, [firestore, sellerId]);
  const { data: allStaff } = useCollection<StaffMember>(staffQuery);

  const isGolf = primarySeller?.type?.toLowerCase().includes('golf');
  // Personal "I'm stepping away" status - this is the individual staff member
  // taking themselves off signal without ending their shift, NOT the venue-
  // wide mode open/closed flag (that's primarySeller.clubhouseActive, only
  // changeable by the venue admin in Service Modes).
  const isMyselfAvailable = myStaffData?.isAvailable !== false;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const broadcastLocation = (lat: number, lng: number) => {
    if (!firestore || !sellerId || !user || isExiting || !currentStaffId) return;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
    setDoc(staffRef, { latitude: lat, longitude: lng, lastActive: serverTimestamp(), activeMode: 'Clubhouse' }, { merge: true }).catch(() => {});
  };

  const handleLocationReady = (position: LatLng | null) => {
    if (position) {
      setSellerLocation(position);
      broadcastLocation(position.latitude, position.longitude);
    }
    setLocationEnabled(true);
  };

  // iOS kicks standalone home-screen web apps out into Safari if geolocation is
  // requested without a direct user gesture behind it, so the first fetch is
  // gated behind LocationGate's button tap (see handleLocationReady) instead of
  // firing automatically here. If permission was already granted in a prior
  // shift, skip the gate and fetch silently - that's not a fresh prompt.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query || !navigator.geolocation) return;
    navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
      if (status.state === 'granted') {
        navigator.geolocation!.getCurrentPosition(
          (p) => handleLocationReady({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => handleLocationReady(null),
          { enableHighAccuracy: true }
        );
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous watchPosition tracking is what was breaking the standalone PWA
  // out into Safari chrome (see LocationGate above) - iOS appears to treat it
  // as a class of usage that requires visible browser chrome, independent of
  // whether the original permission prompt was gesture-tied. Polling with
  // discrete getCurrentPosition calls, on an admin-configurable interval,
  // avoids that continuous-tracking classification.
  useEffect(() => {
    if (!locationEnabled || !navigator.geolocation || !firestore || !sellerId || !user || isExiting) return;

    const pollIntervalMs = (solutionConfig?.driverGpsPollIntervalSeconds || 15) * 1000;
    const poll = () => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (isExiting) return;
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setSellerLocation({ latitude: lat, longitude: lng });
          broadcastLocation(lat, lng);
        },
        null,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    };

    const intervalId = setInterval(poll, pollIntervalMs);
    return () => clearInterval(intervalId);
  }, [locationEnabled, firestore, sellerId, user, currentStaffId, solutionConfig?.driverGpsPollIntervalSeconds, isExiting]);

  const handleToggleAvailability = (checked: boolean) => {
    if (!firestore || !sellerId || !currentStaffId) return;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
    updateDoc(staffRef, { isAvailable: checked }).catch(() => {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update your availability status.' });
    });
  };

  const handleExitTerminal = async (target: 'admin' | 'root', clearRemote: boolean = true) => {
    setIsExiting(true);

    // A superseded (stale) device must NOT clear the staff doc - another device
    // has already taken over that shift, and this device's exit shouldn't stomp
    // on its session.
    if (clearRemote && currentStaffId && firestore && sellerId) {
      const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);

      await updateDoc(staffRef, {
        lastActive: null,
        latitude: null,
        longitude: null,
        activeMode: null
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
    localStorage.removeItem('koop_staff_session_id');

    if (target === 'admin') {
      router.push(`/sellers/${sellerId}`);
    } else {
      router.push(`/sellers/${sellerId}/staff-login`);
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

  const clubhouseOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders
      .filter(o => o.menuType === 'Clubhouse')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [activeOrders]);

  const personalHistory = useMemo(() => {
    if (!allOrders || !currentStaffId) return [];
    return allOrders
      .filter(o => o.assignedStaffId === currentStaffId && o.status === 'Delivered' && o.createdAt && isToday(o.createdAt.toDate()))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [allOrders, currentStaffId]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    const mode = 'Clubhouse';
    const ordersToday = allOrders.filter(o => o.menuType === mode && o.createdAt && isToday(o.createdAt.toDate()));
    const deliveredToday = ordersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);
    
    const acknowledged = ordersToday.filter(o => o.acknowledgedAt);
    const avgAck = acknowledged.length > 0 
      ? acknowledged.reduce((acc, o) => acc + differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()), 0) / acknowledged.length
      : 0;

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

  // NEW ORDER ALERT LOGIC
  useEffect(() => {
    if (!clubhouseOrders || !now) return;
    const currentOrderIds = new Set(clubhouseOrders.map(o => o.id));
    const newOrders = clubhouseOrders.filter(o => !lastOrderIdsRef.current.has(o.id));
    if (newOrders.length > 0 && !initialLoadRef.current) {
      // 1. Audible Alert
      playNotificationSound();

      // 2. System Notification
      if ("Notification" in window && Notification.permission === "granted") {
        newOrders.forEach(o => {
          new Notification("New Clubhouse Order", {
            body: `${o.customerName} - ${o.items.length} items`,
            icon: '/icon'
          });
        });
      }

      toast({ title: "NEW CLUBHOUSE ORDER!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
    initialLoadRef.current = false;
  }, [clubhouseOrders, now, toast]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

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

      updateDoc(doc(firestore, 'orders', orderId), updateData);
    }
  };

  const handleAttachOrder = (orderId: string) => {
    if (!firestore) return;
    const staffId = localStorage.getItem('koop_staff_id');
    const staffName = localStorage.getItem('koop_staff_name');
    if (!staffId || !staffName) return;
    updateDoc(doc(firestore, 'orders', orderId), { assignedStaffId: staffId, assignedStaffName: staffName, updatedAt: serverTimestamp() });
  };

  const handleRefreshLocation = (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    updateDoc(orderRef, { refreshRequestedAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .then(() => toast({ title: "SMS Dispatched", description: "Asking patron to refresh their location signal." }))
      .catch(() => toast({ variant: "destructive", title: "Refresh Failed", description: "Unable to reach patron device." }));
  };

  const mappedBuyers = useMemo(() => {
    if (!now || !clubhouseOrders) return [];
    return clubhouseOrders
      .map(o => {
        const lastGps = o.lastGpsUpdate?.toDate();
        const color = getSignalColor(lastGps, solutionConfig?.gpsFreshnessThresholds);
        return { id: o.id, name: o.customerName, location: o.deliveryLocation, colorOverride: color, colorClass: o.status === 'Out for Delivery' ? "bg-blue-600" : "bg-indigo-600" };
      });
  }, [clubhouseOrders, now, solutionConfig]);

  const mappedDrivers = useMemo(() => {
    if (!allStaff) return [];
    return allStaff
      .filter(s => s.latitude && s.longitude && s.lastActive && s.activeMode) // Only show active staff
      .map(s => {
        const color = getDriverColor(s.id);
        return { id: s.id, name: s.name, location: { latitude: s.latitude!, longitude: s.longitude! }, type: s.activeMode!, colorOverride: color };
      });
  }, [allStaff, solutionConfig]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  if (!locationEnabled) {
    return <LocationGate venueName={primarySeller?.courseName} onEnabled={handleLocationReady} />;
  }

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
              <h1 className="font-headline text-sm font-black text-white uppercase tracking-tight leading-none mb-0.5">
                {primarySeller?.courseName || 'CLUBHOUSE PORTAL'}
              </h1>
              {isAdminSession && <Badge className="bg-amber-500 text-white border-0 text-[7px] font-black uppercase h-3.5 px-1 animate-pulse">Admin</Badge>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/20 text-primary border-0 h-4 px-1.5 text-[8px] font-black uppercase tracking-widest">Clubhouse</Badge>
              </div>
              {notificationPermission === 'granted' && (
                <Badge className="bg-green-500/20 text-green-400 border-0 h-3 px-1 text-[6px] font-black uppercase tracking-widest gap-1">
                  <BellRing className="h-2 w-2" /> Alerts Active
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-5">
          <Switch checked={isMyselfAvailable} onCheckedChange={handleToggleAvailability} className="data-[state=checked]:bg-green-600" />
          <button 
            onClick={() => handleExitTerminal('root')} 
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white transition-colors"
            disabled={isExiting}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[7px] font-black uppercase tracking-widest leading-none truncate max-w-[60px]">{currentStaffName}</span>
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 py-2 bg-background border-b flex items-center justify-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Ack Time</span>
          <span className="text-xs font-bold">{metrics?.avgAck || '0'}s</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Duration</span>
          <span className="text-xs font-bold">{metrics?.avgTotal || '0'}m</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Deliveries</span>
          <span className="text-xs font-bold">{metrics?.count || '0'}</span>
        </div>
        <div className="h-6 w-px bg-muted" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black uppercase text-muted-foreground">Daily Tips</span>
          <span className="text-xs font-bold">${metrics?.dailyTips.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-auto p-4 gap-4">
        <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
          <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
          
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <Badge className={cn(
              "flex items-center gap-1.5 px-2 py-1 border-0 shadow-lg transition-colors",
              isMyselfAvailable ? "bg-green-600 text-white" : "bg-slate-500/80 text-white"
            )}>
              <div className={cn("h-1.5 w-1.5 rounded-full", isMyselfAvailable ? "bg-white animate-pulse" : "bg-white/40")} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                {isMyselfAvailable ? "Signal Live" : "Signal Off"}
              </span>
            </Badge>
          </div>

          {sellerLocation ? (
            <MapView 
              sellerLocation={sellerLocation} 
              primaryType="Clubhouse"
              primaryDriverId={currentStaffId}
              buyers={mappedBuyers} 
              drivers={mappedDrivers}
              radius={1609.34} 
              fitTrigger={fitTrigger}
              showPrimaryMarker={isMyselfAvailable} 
              interactive={true}
            />
          ) : <Skeleton className="w-full h-full" />}
        </div>

        <div className={cn("flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0 text-left", isGolf ? "w-full md:w-1/3" : "w-full max-w-4xl mx-auto")}>
          <div className="shrink-0 border-b bg-muted/10 px-4 py-3 flex items-center justify-between">
            <h2 className="font-headline text-xs font-black flex items-center gap-2 uppercase tracking-widest">
              <div className="flex items-center gap-2"><Building className="h-4 w-4 text-primary" /><span>Orders Queue</span></div>
              <Badge className="bg-[#213147] text-white font-black border-0">{clubhouseOrders.length}</Badge>
            </h2>

            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 rounded-full text-indigo-600 font-black uppercase text-[9px] tracking-widest gap-1.5 hover:bg-indigo-50">
                  <History className="h-3 w-3" /> History
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
                <DialogHeader className="p-6 bg-indigo-600 text-white">
                  <DialogTitle className="font-headline font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <History className="h-5 w-5" /> Your Today's Orders
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-shrink-0 p-4 bg-slate-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 h-6 uppercase text-[9px] font-black">{personalHistory.length} Delivered</Badge>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{currentStaffName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Total Tips:</span>
                    <span className="text-sm font-black text-green-600">${personalHistory.reduce((acc, o) => acc + (o.tip || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  {personalHistory.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                      <Package className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No deliveries recorded today</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase">Ticket</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Customer</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-right">Ack</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-right">Dur</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-right">Order</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-right">Tip</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personalHistory.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono font-black text-[10px]">#{getNumericOrderId(o.id)}</TableCell>
                            <TableCell>
                              <p className="font-bold text-[10px] uppercase truncate max-w-[80px]">{o.customerName}</p>
                              <p className="text-[8px] text-muted-foreground uppercase">{o.deliveredAt ? format(o.deliveredAt.toDate(), 'h:mm a') : ''}</p>
                            </TableCell>
                            <TableCell className="text-right font-bold text-[10px]">
                              {o.acknowledgedAt && o.createdAt ? `${differenceInSeconds(o.acknowledgedAt.toDate(), o.createdAt.toDate())}s` : '--'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-[10px]">
                              {o.deliveredAt && o.createdAt ? `${differenceInMinutes(o.deliveredAt.toDate(), o.createdAt.toDate())}m` : '--'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-[10px] text-[#213147]">${o.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-black text-[10px] text-green-600">${(o.tip || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className={cn("flex-1 overflow-auto px-2 text-left", isGolf ? "" : "p-4")}>
            <div className={cn("py-2.5 gap-3 text-left", isGolf ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
              {isLoading ? <Skeleton className="h-40 w-full" /> : clubhouseOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground opacity-40"><Building className="h-10 w-10 mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">No active orders</p></div>
              ) : (
                clubhouseOrders.map((order, index) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    orderNumber={index + 1} 
                    now={now} 
                    onUpdateStatus={handleUpdateOrderStatus} 
                    onAttach={handleAttachOrder} 
                    onRefreshLocation={handleRefreshLocation}
                    thresholds={primarySeller?.orderThresholds?.[order.menuType]} 
                    smsEnabled={solutionConfig?.smsNotificationsEnabled !== false}
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
