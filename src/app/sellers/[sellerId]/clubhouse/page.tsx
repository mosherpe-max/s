'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, Package, LogOut, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

/**
 * CLUBHOUSE DASHBOARD - OPEN ACCESS
 * Authentication requirement removed for initial prototyping.
 */
export default function ClubhouseDriverDashboardPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [now, setNow] = useState<number>(Date.now());
  const lastOrderIdsRef = useRef<Set<string>>(new Set());

  const primarySellerRef = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: primarySeller, isLoading: isPrimaryLoading } = useDoc<Seller>(primarySellerRef);

  const isClubhouseActive = primarySeller?.clubhouseActive === true;

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId) return;
    updateDoc(doc(firestore, 'sellers', sellerId), { clubhouseActive: checked }).catch(() => {});
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

  const clubhouseOrders = useMemo(() => {
    if (!activeOrders) return [];
    return activeOrders.filter(o => o.menuType !== 'Beverage Cart');
  }, [activeOrders]);

  useEffect(() => {
    if (!clubhouseOrders || !now) return;
    const currentOrderIds = new Set(clubhouseOrders.map(o => o.id));
    const newOrders = clubhouseOrders.filter(o => !lastOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0 && lastOrderIdsRef.current.size > 0) {
      toast({ title: "NEW CLUBHOUSE ORDER!" });
    }
    lastOrderIdsRef.current = currentOrderIds;
  }, [clubhouseOrders, now, toast]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'orders', orderId), { status, deliveredAt: status === 'Delivered' ? serverTimestamp() : null }).catch(() => {});
  };

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/20">
      <header className="flex-shrink-0 px-4 h-16 flex items-center justify-between border-b-2 border-[#E50000] bg-[#213147] z-20 shadow-sm">
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline text-sm font-bold text-white uppercase tracking-tight">CLUBHOUSE PORTAL</h1>
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-white/5 text-white border-white/10 uppercase">
            {primarySeller?.courseName || 'Loading...'}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Switch checked={isClubhouseActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden max-w-4xl mx-auto w-full">
        <div className="flex-1 bg-background border-2 rounded-xl overflow-hidden flex flex-col">
          <h2 className="font-headline text-xs font-black px-4 py-3 border-b flex items-center justify-between uppercase bg-muted/10">
            <span>Orders Queue</span>
            <Badge variant="secondary">{clubhouseOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? <Skeleton className="h-48 w-full" /> : clubhouseOrders.length === 0 ? (
                <div className="col-span-full py-32 text-center text-muted-foreground opacity-40">
                  <Building className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase">No active clubhouse orders</p>
                </div>
              ) : (
                clubhouseOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} orderNumber={index + 1} onUpdateStatus={handleUpdateOrderStatus} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
