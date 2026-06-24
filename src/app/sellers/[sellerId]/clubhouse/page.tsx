'use client';

import { collection, query, where, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { useEffect, useState, useMemo, useRef, use } from 'react';
import { Switch } from '@/components/ui/switch';
import { OrderCard } from '@/components/order-card';
import type { Order, Seller, StaffMember, PlatformConfig } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Package, LogOut, Building, LayoutList, Focus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/map-view';
import { cn, calculateDistance, getSignalColor } from '@/lib/utils';

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
  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const lastBroadcastRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

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

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: platformConfig } = useDoc<PlatformConfig>(configRef);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !sellerId) return null;
    return collection(firestore, 'sellers', sellerId, 'staff');
  }, [firestore, sellerId]);
  const { data: allStaff } = useCollection<StaffMember>(staffQuery);

  const isGolf = primarySeller?.type?.toLowerCase().includes('golf');
  const isClubhouseActive = primarySeller?.clubhouseActive === true;

  const broadcastLocation = (lat: number, lng: number) => {
    if (!firestore || !sellerId || !user) return;
    
    const nowTime = Date.now();
    const syncInterval = (platformConfig?.mapUpdateSettings?.['Clubhouse']?.frequencySeconds || 15) * 1000;
    
    if (lastBroadcastRef.current) {
      const distance = calculateDistance(lat, lng, lastBroadcastRef.current.lat, lastBroadcastRef.current.lng);
      const timeElapsed = nowTime - lastBroadcastRef.current.time;
      
      // Filter out small jitter movements (< 5 meters)
      if (distance < 5 && timeElapsed < 60000) return;
      if (timeElapsed < syncInterval) return;
    }

    lastBroadcastRef.current = { lat, lng, time: nowTime };

    // 1. Staff document update
    if (currentStaffId) {
      const staffRef = doc(firestore, 'sellers', sellerId, 'staff', currentStaffId);
      setDoc(staffRef, {
        latitude: lat,
        longitude: lng,
        lastActive: serverTimestamp()
      }, { merge: true }).catch(() => {});
    }

    // 2. Venue document update
    updateDoc(doc(firestore, 'sellers', sellerId), {
      latitude: lat,
      longitude: lng,
      lastActive: serverTimestamp()
    }).catch(() => {});
  };

  // BROADCAST CURRENT LOCATION ON MOUNT
  useEffect(() => {
    if (isGolf && navigator.geolocation && firestore && sellerId && user) {
      navigator.geolocation.getCurrentPosition((p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setSellerLocation({ latitude: lat, longitude: lng });
        broadcastLocation(lat, lng);
      }, null, { enableHighAccuracy: true });
    }
  }, [isGolf, firestore, sellerId, user, currentStaffId, platformConfig]);

  // Track Server Location for Golf Courses
  useEffect(() => {
    if (isGolf && navigator.geolocation && firestore && sellerId && user) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          
          setSellerLocation(prev => {
            if (!prev) return { latitude: lat, longitude: lng };
            const dist = calculateDistance(lat, lng, prev.latitude, prev.longitude);
            // Only update local marker if movement is > 5 meters to prevent "stationary dancing"
            return dist > 5 ? { latitude: lat, longitude: lng } : prev;
          });
          
          broadcastLocation(lat, lng);
        },
        null,
        // Added maximumAge to instruct device to throttle sensor activity
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isGolf, firestore, sellerId, user, currentStaffId, platformConfig]);

  const handleToggleActive = (checked: boolean) => {
    if (!firestore || !sellerId || !user) return;
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
    return activeOrders
      .filter(o => o.menuType === 'Clubhouse' || o.menuType === 'Take Out')
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
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

  const mappedBuyers = useMemo(() => {
    if (!now || !clubhouseOrders) return [];
    return clubhouseOrders
      .filter(o => o.menuType === 'Clubhouse')
      .map(o => {
        const lastGps = o.lastGpsUpdate?.toDate();
        const color = getSignalColor(lastGps, platformConfig?.gpsFreshnessThresholds);
        
        return { 
          id: o.id, 
          name: o.customerName, 
          location: o.deliveryLocation, 
          colorOverride: color,
          colorClass: o.status === 'Out for Delivery' ? "bg-blue-600" : "bg-indigo-600" 
        };
      });
  }, [clubhouseOrders, now, platformConfig]);

  const mappedDrivers = useMemo(() => {
    if (!allStaff) return [];
    return allStaff
      .filter(s => s.id !== currentStaffId && s.latitude && s.longitude && s.lastActive)
      .map(s => {
        const color = getSignalColor(s.lastActive?.toDate(), platformConfig?.gpsFreshnessThresholds);
        return {
          id: s.id,
          name: s.name,
          location: { latitude: s.latitude!, longitude: s.longitude! },
          type: s.role === 'Driver' || s.role === 'Staff' ? 'Beverage Cart' : 'Clubhouse',
          colorOverride: color
        };
      });
  }, [allStaff, currentStaffId, platformConfig]);

  const isLoading = areActiveOrdersLoading || isPrimaryLoading;

  // Driver Signal Strength Indicator
  const signalColor = useMemo(() => {
    const lastActive = primarySeller?.lastActive?.toDate();
    return getSignalColor(lastActive, platformConfig?.gpsFreshnessThresholds);
  }, [primarySeller?.lastActive, platformConfig]);

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
          {isGolf && (
            <Badge className="h-6 px-2 gap-1.5 border-0 shadow-inner transition-colors" style={{ backgroundColor: `${signalColor}20`, color: signalColor }}>
              <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: signalColor }} />
              <span className="text-[8px] font-black uppercase tracking-widest">Live Signal</span>
            </Badge>
          )}
          <Switch checked={isClubhouseActive} onCheckedChange={handleToggleActive} className="data-[state=checked]:bg-green-600" />
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-white/40 hover:text-white"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
        {/* Map View - Only for Golf Delivery */}
        {isGolf && (
          <div className="relative w-full md:w-2/3 h-[40vh] md:h-full bg-muted rounded-xl overflow-hidden border-2 shadow-sm">
            <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 h-8 w-8" onClick={() => setFitTrigger(p => p + 1)}><Focus className="h-4 w-4" /></Button>
            {primarySeller ? (
              <MapView 
                sellerLocation={sellerLocation || { latitude: primarySeller.latitude, longitude: primarySeller.longitude }} 
                primaryType="Clubhouse"
                buyers={mappedBuyers} 
                drivers={mappedDrivers}
                radius={1609.34} 
                fitTrigger={fitTrigger}
                showPrimaryMarker={isClubhouseActive} 
                primaryDriverId={sellerId} 
                interactive={true}
              />
            ) : <Skeleton className="w-full h-full" />}
          </div>
        )}

        <div className={cn(
          "flex flex-col bg-background border-2 rounded-xl overflow-hidden min-h-0",
          isGolf ? "w-full md:w-1/3" : "w-full max-w-4xl mx-auto"
        )}>
          <h2 className="font-headline text-xs font-black px-4 py-3 shrink-0 border-b flex items-center justify-between uppercase bg-muted/10 tracking-widest">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span>Orders Queue</span>
            </div>
            <Badge className="bg-[#213147] text-white font-black border-0">{clubhouseOrders.length}</Badge>
          </h2>
          <ScrollArea className="flex-1 px-2">
            <div className={cn(
              "py-2.5 gap-3",
              isGolf ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-4"
            )}>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : clubhouseOrders.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground opacity-40">
                  <Building className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">No active orders</p>
                </div>
              ) : (
                clubhouseOrders.map((order, index) => (
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
