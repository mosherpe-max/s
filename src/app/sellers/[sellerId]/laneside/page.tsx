'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller, SolutionConfig } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, MapPin, LayoutList, ChevronLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { isToday, differenceInSeconds, differenceInMinutes } from 'date-fns';
import { SUPER_ADMIN_ID, isStaffSessionStale } from '@/lib/utils';
import Link from 'next/link';

export default function LaneSideServerDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [now, setNow] = useState<number>(Date.now());
  const [currentStaffId, setCurrentStaffId] = useState<string | undefined>();
  const [currentStaffName, setCurrentStaffName] = useState<string>('');
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [greeting, setGreeting] = useState('Hello');
  const lastOrderIdsRef = useRef<Set<string>>(new Set());

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
      
      // DAILY OPERATIONAL RESET CHECK
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

  const isServerActive = primarySeller?.lanedeliveryActive === true;
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId || !user) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { lanedeliveryActive: checked }).catch(() => {});
  };

  const handleExitTerminal = async (target: 'admin' | 'root') => {
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

  const lanesideOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders
      .filter(o => o.menuType === 'Lane Delivery')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [activeOrders]);

  const metrics = useMemo(() => {
    if (!allOrders) return null;
    const mode = 'Lane Delivery';
    const ordersToday = allOrders.filter(o => o.menuType === mode && o.createdAt && isToday(o.createdAt.toDate()));
    const deliveredToday = ordersToday.filter(o => o.status === 'Delivered');
    const dailyTips = deliveredToday.reduce((acc, o) => acc + (o.tip || 0), 0);
    
    // Ack Time (Today's acknowledged orders)
    const acknowledged = ordersToday.filter(o => o.acknowledgedAt);
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
    if (!lanesideOrders || !now) return;
    const currentOrderIds = new Set(lanesideOrders.map(o => o.id));
    const newOrders = lanesideOrders.filter(o => !lastOrderIdsRef.current.has(o.id));
    if (newOrders.length > 0 && lastOrderIdsRef.current.size > 0) {
      toast({ title: "NEW LANE ORDER!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
  }, [lanesideOrders, now, toast]);

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

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-x-auto bg-muted/20 text-left">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm text-left">
        <div className="flex items-center gap-4">
          {isAdminSession && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white" onClick={() => handleExitTerminal('admin')}><ChevronLeft className="h-3 w-3 mr-1" /> Exit Terminal</Button>
              {isSuperAdmin && (
                <Button variant="outline" size="sm" asChild className="h-8 text-[9px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"><Link href="/admin"><ShieldAlert className="h-3 w-3 mr-1" /> Solution Admin</Link></Button>
              )}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight leading-none mb-0.5">LANESIDE PORTAL</h1>
              {isAdminSession && <Badge className="bg-amber-500 text-white border-0 text-[7px] font-black uppercase h-3.5 px-1 animate-pulse">Impersonating</Badge>}
            </div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">{greeting}, {currentStaffName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isServerActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => handleExitTerminal('root')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
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

      <div className="flex-1 flex flex-col overflow-auto p-4 max-w-3xl mx-auto w-full">
        <div className="flex flex-col bg-background border-2 rounded-[2rem] overflow-hidden min-h-0 shadow-xl text-left">
          <h2 className="font-headline text-xs font-black px-6 py-4 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <div className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-primary" /><span>Pending Deliveries</span></div>
            <Badge className="bg-[#213147] text-white font-black border-0">{lanesideOrders.length}</Badge>
          </h2>
          <div className="flex-1 overflow-auto text-left">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {isLoading ? (
                <><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></>
              ) : lanesideOrders.length === 0 ? (
                <div className="col-span-full py-40 text-center text-muted-foreground opacity-40"><Package className="h-16 w-16 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">No active lane deliveries</p></div>
              ) : (
                lanesideOrders.map((order, index) => (<OrderCard key={order.id} order={order} orderNumber={index + 1} now={now} onUpdateStatus={handleUpdateOrderStatus} onAttach={handleAttachOrder} thresholds={primarySeller?.orderThresholds?.[order.menuType]} />))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
