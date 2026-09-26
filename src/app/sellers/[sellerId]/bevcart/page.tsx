
'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp, setDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { MapView } from '@/components/map-view';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller, StaffMember, SolutionConfig, OrderFulfillmentThresholds } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Focus, Package, LogOut, Truck, ChevronLeft, LayoutDashboard, ShieldAlert, History, User, DollarSign, CheckCircle2, AlertTriangle, Ban } from 'lucide-react';
import { StockToggleDialog } from '@/components/stock-toggle-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { isToday, differenceInSeconds, differenceInMinutes, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn, getSignalColor, getDriverColor, SUPER_ADMIN_ID, isStaffSessionStale, isStaffSessionIdle, getNumericOrderId } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const DEFAULT_HISTORY_THRESHOLDS: OrderFulfillmentThresholds = { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 };

export default function BevCartDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [fitTrigger, setFitTrigger] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());
  const [currentStaffId, setCurrentStaffId] = useState<string | undefined>();
  const [currentStaffName, setCurrentStaffName] = useState<string>('');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);

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
      const lastHidden = localStorage.getItem('koop_staff_last_hidden');
      const resetHour = solutionConfig?.dailyResetHour ?? 4;
      const idleTimeoutMinutes = solutionConfig?.staffIdleTimeoutMinutes;
      mySessionIdRef.current = localStorage.getItem('koop_staff_session_id') || undefined;

      // A. Check for STALE session (past reset hour)
      if (sessionStart && isStaffSessionStale(new Date(parseInt(sessionStart, 10)), resetHour)) {
        handleExitTerminal('root');
        toast({ title: "Shift Expired", description: "Your shift has ended per the daily reset policy." });
      } else if (!isImpersonating && lastHidden && isStaffSessionIdle(new Date(parseInt(lastHidden, 10)), idleTimeoutMinutes)) {
        // The OS may fully discard a backgrounded tab (screen off for a
        // while) and reload it fresh - this catches that case too, since
        // it's checked against the same localStorage timestamp the
        // visibilitychange handler below maintains.
        handleExitTerminal('root');
        toast({ title: "Session Timed Out", description: "You were away for a while - please sign back in." });
      } else {
        setCurrentStaffId(storedId || undefined);
        setCurrentStaffName(storedName || '');
        setIsAdminSession(isImpersonating);
        localStorage.removeItem('koop_staff_last_hidden');
      }
    }
  }, [sellerId, router, toast, solutionConfig?.dailyResetHour, solutionConfig?.staffIdleTimeoutMinutes]);

  // Track how long the terminal has been backgrounded (screen off, app
  // switched away, tab hidden) - a brief absence should resume silently,
  // but more than the configured idle timeout (Koop admin setting,
  // defaults to STAFF_IDLE_TIMEOUT_MINUTES) away requires a fresh PIN.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('koop_staff_last_hidden', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        const lastHidden = localStorage.getItem('koop_staff_last_hidden');
        if (lastHidden && isStaffSessionIdle(new Date(parseInt(lastHidden, 10)), solutionConfig?.staffIdleTimeoutMinutes) && !isAdminSession && !isExiting) {
          handleExitTerminal('root');
          toast({ title: "Session Timed Out", description: "You were away for a while - please sign back in." });
        } else {
          localStorage.removeItem('koop_staff_last_hidden');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAdminSession, isExiting, solutionConfig?.staffIdleTimeoutMinutes]);

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
    if (primarySeller && primarySeller.bevcartActive === false && !isAdminSession && !isExiting) {
      toast({ variant: "destructive", title: "Channel Closed", description: "This service mode has been deactivated by management." });
      handleExitTerminal('root');
    }
  }, [primarySeller?.bevcartActive, isAdminSession, isExiting]);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'staff');
  }, [firestore, sellerId]);
  const { data: allStaff } = useCollection<StaffMember>(staffQuery);

  // My own live position for the map's "YOU" marker - no longer sourced
  // from LocationGate (gone, see track-delivery for why), but from the same
  // staff doc fields track-delivery continuously broadcasts to in its own
  // Safari tab. MapView already treats a missing sellerLocation as "no YOU
  // marker, center on whatever driver/buyer data is available" so this is
  // safe to leave undefined until the first broadcast lands.
  const sellerLocation = useMemo<LatLng | undefined>(() => (
    myStaffData?.latitude && myStaffData?.longitude
      ? { latitude: myStaffData.latitude, longitude: myStaffData.longitude }
      : undefined
  ), [myStaffData?.latitude, myStaffData?.longitude]);

  // Personal "I'm stepping away" status - this is the individual staff member
  // taking themselves off signal without ending their shift, NOT the venue-
  // wide mode open/closed flag (that's primarySeller.bevcartActive, only
  // changeable by the venue admin in Service Modes).
  const isMyselfAvailable = myStaffData?.isAvailable !== false;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

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
    localStorage.removeItem('koop_staff_last_hidden');

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

  const driverOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders
      .filter(o => o.menuType === 'Beverage Cart')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [activeOrders]);

  // Order queue pause/throttle - "Taking Orders" reflects bevcartPausedByStaff
  // (any active staff on this mode can flip it, distinct from the venue-wide
  // bevcartActive flag which only the venue admin controls); auto-throttle
  // trips/clears based on the live queue vs the configured threshold, scaled
  // by active staff on this mode when queueScalesWithStaff is set. See
  // OrderFulfillmentThresholds in src/lib/types.ts.
  const activeStaffCountForMode = useMemo(() => (
    (allStaff || []).filter(s => s.activeMode === 'Beverage Cart' && s.isActive !== false).length
  ), [allStaff]);

  const queueThresholds = primarySeller?.orderThresholds?.['Beverage Cart'] || solutionConfig?.orderThresholds?.['Beverage Cart'];
  const queueScale = queueThresholds?.queueScalesWithStaff ? Math.max(1, activeStaffCountForMode) : 1;
  const effectiveMaxQueue = queueThresholds?.maxQueueSize ? queueThresholds.maxQueueSize * queueScale : undefined;
  const effectiveResumeQueue = queueThresholds?.resumeQueueSize ? queueThresholds.resumeQueueSize * queueScale : undefined;
  const queueCount = driverOrders.length;
  const isPausedByStaff = !!primarySeller?.bevcartPausedByStaff;
  const isAutoThrottled = !!primarySeller?.bevcartAutoThrottled;

  useEffect(() => {
    if (!firestore || !primarySellerRef || effectiveMaxQueue === undefined) return;
    if (!isAutoThrottled && queueCount >= effectiveMaxQueue) {
      updateDoc(primarySellerRef, { bevcartAutoThrottled: true }).catch(() => {});
    } else if (isAutoThrottled && effectiveResumeQueue !== undefined && queueCount <= effectiveResumeQueue) {
      updateDoc(primarySellerRef, { bevcartAutoThrottled: false }).catch(() => {});
    }
  }, [firestore, primarySellerRef, isAutoThrottled, queueCount, effectiveMaxQueue, effectiveResumeQueue]);

  const handleToggleAcceptingOrders = (checked: boolean) => {
    if (!checked) {
      setPauseConfirmOpen(true);
      return;
    }
    if (!firestore || !primarySellerRef) return;
    updateDoc(primarySellerRef, { bevcartPausedByStaff: false }).catch(() => {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not resume new orders.' });
    });
  };

  const confirmPauseOrders = () => {
    if (firestore && primarySellerRef) {
      updateDoc(primarySellerRef, { bevcartPausedByStaff: true }).catch(() => {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not pause new orders.' });
      });
    }
    setPauseConfirmOpen(false);
  };

  const handleClearAutoThrottle = () => {
    if (!firestore || !primarySellerRef) return;
    updateDoc(primarySellerRef, { bevcartAutoThrottled: false }).catch(() => {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not resume new orders.' });
    });
  };

  const personalHistory = useMemo(() => {
    if (!allOrders || !currentStaffId) return [];
    return allOrders
      .filter(o => o.assignedStaffId === currentStaffId && o.status === 'Delivered' && o.createdAt && isToday(o.createdAt.toDate()))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [allOrders, currentStaffId]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    const bevOrdersToday = allOrders.filter(o => o.menuType === 'Beverage Cart' && o.createdAt && isToday(o.createdAt.toDate()));
    const deliveredToday = bevOrdersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);

    const acknowledged = bevOrdersToday.filter(o => o.acknowledgedAt);
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
    if (!driverOrders || !now) return;
    const currentOrderIds = new Set(driverOrders.map(o => o.id));
    const newOrders = driverOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && !initialLoadRef.current) {
      // In-app toast only - the standalone PWA on this iOS version ejects
      // into Safari chrome the moment any code touches the Notification API
      // (even a permission status read) or creates a Web Audio AudioContext,
      // regardless of gesture timing, so neither is used here.
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

  // Live GPS broadcasting deliberately does not happen from inside this
  // installed standalone app - confirmed on-device that calling any
  // geolocation API here (even a single gesture-gated getCurrentPosition,
  // with no permission dialog ever shown) ejects the app into Safari chrome
  // every time, granted or not. staff-login already opens track-delivery in
  // an actual Safari tab (a different enough context to be safe) the moment
  // a shift starts, so there's nothing to trigger from in here.

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

  // Any driver may claim or take over an order at any point - there can be
  // multiple Bev Cart drivers on course, and one may need to hand off or
  // pick up an order someone else already started.
  const handleClaimOrder = (orderId: string) => {
    if (!firestore) return;
    const staffId = localStorage.getItem('koop_staff_id');
    const staffName = localStorage.getItem('koop_staff_name');
    if (!staffId || !staffName) return;
    const previousStaffName = allOrders?.find(o => o.id === orderId)?.assignedStaffName;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = { assignedStaffId: staffId, assignedStaffName: staffName, updatedAt: serverTimestamp() };
    updateDoc(orderRef, updateData).then(() => {
      if (previousStaffName && previousStaffName !== staffName) {
        toast({ title: "Order Claimed", description: `Taken over from ${previousStaffName}.` });
      }
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
    });
  };

  const handleUnclaimOrder = (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    const updateData = { assignedStaffId: deleteField(), assignedStaffName: deleteField(), updatedAt: serverTimestamp() };
    updateDoc(orderRef, updateData).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: { assignedStaffId: null } } satisfies SecurityRuleContext));
    });
  };

  const handleRefreshLocation = (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    updateDoc(orderRef, { refreshRequestedAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .then(() => toast({ title: "SMS Dispatched", description: "Asking patron to refresh their location signal." }))
      .catch(() => toast({ variant: "destructive", title: "Refresh Failed", description: "Unable to reach patron device." }));
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
      .filter(s => s.latitude && s.longitude && s.lastActive && s.activeMode) // Only show active staff
      .map(s => {
        const color = getDriverColor(s.id);
        return { id: s.id, name: s.name, location: { latitude: s.latitude!, longitude: s.longitude! }, type: s.activeMode!, colorOverride: color };
      });
  }, [allStaff, solutionConfig]);

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
              <h1 className="font-headline text-sm font-black text-white uppercase tracking-tight leading-none mb-0.5">
                {primarySeller?.courseName || 'BEVCART PORTAL'}
              </h1>
              {isAdminSession && <Badge className="bg-amber-500 text-white border-0 text-[7px] font-black uppercase h-3.5 px-1 animate-pulse">Admin</Badge>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-primary/20 text-primary border-0 h-4 px-1.5 text-[8px] font-black uppercase tracking-widest">Beverage Cart</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-5">
          <div className="flex flex-col items-center gap-1">
            <span className={cn("text-[7px] font-black uppercase tracking-widest leading-none", isMyselfAvailable ? "text-green-400" : "text-white/40")}>
              {isMyselfAvailable ? 'Available' : 'Away'}
            </span>
            <Switch checked={isMyselfAvailable} onCheckedChange={handleToggleAvailability} className="data-[state=checked]:bg-green-600" />
          </div>
          <button
            onClick={() => handleExitTerminal('root')}
            className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors"
            disabled={isExiting}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[7px] font-black uppercase tracking-widest leading-none">Log Out</span>
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

      <div className="flex-shrink-0 px-4 py-3 bg-background border-b flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] font-black uppercase text-muted-foreground">Order Queue</span>
            <span className="text-sm font-black">{queueCount}{effectiveMaxQueue !== undefined ? ` / ${effectiveMaxQueue}` : ''}</span>
          </div>
          {isAutoThrottled && (
            <Badge className="bg-amber-500 text-white border-0 text-[8px] font-black uppercase gap-1.5 h-6 px-2">
              <AlertTriangle className="h-3 w-3" /> Auto-Paused
              <button onClick={handleClearAutoThrottle} className="ml-1 underline underline-offset-2">Resume Now</button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[9px] font-black uppercase tracking-widest", isPausedByStaff ? "text-destructive" : "text-green-600")}>
            {isPausedByStaff ? 'Paused' : 'Taking Orders'}
          </span>
          <Switch checked={!isPausedByStaff} onCheckedChange={handleToggleAcceptingOrders} className="data-[state=checked]:bg-green-600" />
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

          {isPrimaryLoading ? (
            <Skeleton className="w-full h-full" />
          ) : (
            <MapView
              sellerLocation={sellerLocation}
              primaryType="Beverage Cart"
              primaryDriverId={currentStaffId}
              buyers={mappedBuyers}
              drivers={mappedDrivers}
              radius={1609.34}
              fitTrigger={fitTrigger}
              showPrimaryMarker={isMyselfAvailable}
              interactive={true}
            />
          )}
        </div>
        <div className="w-full md:w-1/3 flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0 text-left">
          <div className="shrink-0 border-b bg-muted/10 px-4 py-3 flex items-center justify-between">
            <h2 className="font-headline text-xs font-black flex items-center gap-2 uppercase tracking-widest">
              <span>Active Orders</span>
              <span className="bg-[#213147] text-white text-[10px] font-black rounded-full px-2 py-0.5">{driverOrders.length}</span>
            </h2>

            <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsStockOpen(true)} className="h-7 rounded-full text-destructive font-black uppercase text-[9px] tracking-widest gap-1.5 hover:bg-destructive/10">
              <Ban className="h-3 w-3" /> 86
            </Button>
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
                        {personalHistory.map(o => {
                          const thresholds = primarySeller?.orderThresholds?.[o.menuType] || solutionConfig?.orderThresholds?.[o.menuType] || DEFAULT_HISTORY_THRESHOLDS;
                          const ackSeconds = o.acknowledgedAt && o.createdAt ? differenceInSeconds(o.acknowledgedAt.toDate(), o.createdAt.toDate()) : null;
                          const durationMinutes = o.deliveredAt && o.createdAt ? differenceInMinutes(o.deliveredAt.toDate(), o.createdAt.toDate()) : null;
                          const isAckOver = ackSeconds !== null && ackSeconds > thresholds.maxOrderAcknowledgeSeconds;
                          const isDurationOver = durationMinutes !== null && durationMinutes > thresholds.maxOrderProcessingMinutes;
                          return (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono font-black text-[10px]">#{getNumericOrderId(o.id)}</TableCell>
                            <TableCell>
                              <p className="font-bold text-[10px] uppercase truncate max-w-[80px]">{o.customerName}</p>
                              <p className="text-[8px] text-muted-foreground uppercase">{o.deliveredAt ? format(o.deliveredAt.toDate(), 'h:mm a') : ''}</p>
                            </TableCell>
                            <TableCell className={cn("text-right font-bold text-[10px]", isAckOver && "text-destructive")}>
                              {ackSeconds !== null ? `${ackSeconds}s` : '--'}
                            </TableCell>
                            <TableCell className={cn("text-right font-bold text-[10px]", isDurationOver && "text-destructive")}>
                              {durationMinutes !== null ? `${durationMinutes}m` : '--'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-[10px] text-[#213147]">${o.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-black text-[10px] text-green-600">${(o.tip || 0).toFixed(2)}</TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
            </div>
            <StockToggleDialog sellerId={sellerId} mode="Beverage Cart" open={isStockOpen} onOpenChange={setIsStockOpen} />
          </div>

          <div className="flex-1 overflow-auto px-2 text-left">
            <div className="py-2.5 space-y-3 text-left">
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
                    onClaim={handleClaimOrder}
                    onUnclaim={handleUnclaimOrder}
                    onRefreshLocation={handleRefreshLocation}
                    currentStaffId={currentStaffId}
                    thresholds={primarySeller?.orderThresholds?.[order.menuType] || solutionConfig?.orderThresholds?.[order.menuType]}
                    smsEnabled={solutionConfig?.smsNotificationsEnabled !== false}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-2 shadow-2xl p-8">
          <AlertDialogHeader className="text-left space-y-4">
            <div className="bg-destructive/10 p-3 rounded-2xl w-fit"><Ban className="h-8 w-8 text-destructive" /></div>
            <div className="space-y-1">
              <AlertDialogTitle className="font-headline font-black uppercase text-xl">Pause New Orders?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                This stops new orders for Beverage Cart venue-wide until someone turns it back on. Orders already placed are not affected.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPauseOrders} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8">
              Pause Orders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
