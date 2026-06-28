'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, MapPin, LayoutList, ChevronLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SUPER_ADMIN_ID } from '@/lib/utils';
import Link from 'next/link';

export default function LaneSideServerDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [now, setNow] = useState<number>(Date.now());
  const [currentStaffId, setCurrentStaffId] = useState<string | undefined>();
  const lastOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentStaffId(localStorage.getItem('koop_staff_id') || undefined);
    }
  }, []);

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const isServerActive = primarySeller?.lanedeliveryActive === true;
  const isAdminSession = currentStaffId?.startsWith('admin-');
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId || !user) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { lanedeliveryActive: checked }).catch(() => {});
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

  const lanesideOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders
      .filter(o => o.menuType === 'Lane Delivery')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }, [activeOrders]);

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
        const staffId = localStorage.getItem('koop_staff_id');
        const staffName = localStorage.getItem('koop_staff_name');
        if (staffId && staffName) {
          updateData.assignedStaffId = staffId;
          updateData.assignedStaffName = staffName;
        }
      }

      updateDoc(doc(firestore, 'orders', orderId), updateData).catch((err) => {
        console.error("Status update failed:", err);
      });
    }
  };

  const handleAttachOrder = (orderId: string) => {
    if (!firestore) return;
    const staffId = localStorage.getItem('koop_staff_id');
    const staffName = localStorage.getItem('koop_staff_name');
    if (!staffId || !staffName) return;

    updateDoc(doc(firestore, 'orders', orderId), {
      assignedStaffId: staffId,
      assignedStaffName: staffName,
      updatedAt: serverTimestamp()
    }).then(() => {
      toast({ title: "Order Attached", description: `You are now assigned to this ticket.` });
    });
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20 text-left">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex items-center gap-4">
          {isAdminSession && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[9px] font-black uppercase tracking-widest border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white"
                onClick={() => router.push(`/sellers/${sellerId}`)}
              >
                <ChevronLeft className="h-3 w-3 mr-1" /> Admin
              </Button>
              {isSuperAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="h-8 text-[9px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100"
                >
                  <Link href="/admin">
                    <ShieldAlert className="h-3 w-3 mr-1" /> Solution Admin
                  </Link>
                </Button>
              )}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight leading-none">LANESIDE PORTAL</h1>
              {isAdminSession && (
                <Badge className="bg-amber-500 text-white border-0 text-[7px] font-black uppercase h-3.5 px-1 animate-pulse">
                  Impersonating
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 text-white border-white/10 uppercase mt-1">
              {primarySeller?.courseName || 'Venue'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isServerActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden p-4 max-w-3xl mx-auto w-full">
        <div className="flex flex-col bg-background border-2 rounded-[2rem] overflow-hidden min-h-0 shadow-xl text-left">
          <h2 className="font-headline text-xs font-black px-6 py-4 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-primary" />
              <span>Pending Deliveries</span>
            </div>
            <Badge className="bg-[#213147] text-white font-black border-0">{lanesideOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1 text-left">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {isLoading ? (
                <>
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </>
              ) : lanesideOrders.length === 0 ? (
                <div className="col-span-full py-40 text-center text-muted-foreground opacity-40">
                  <Package className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No active lane deliveries</p>
                </div>
              ) : (
                lanesideOrders.map((order, index) => (
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
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
