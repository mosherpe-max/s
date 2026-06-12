'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  writeBatch, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Zap,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  Store,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  LogOut,
  ArrowLeft,
  Mail,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  ShoppingBag,
  Layers,
  GripVertical,
  Download,
  Activity,
  CheckCircle2,
  MoreVertical,
  Search,
  Filter,
  TrendingUp,
  PanelLeftClose,
  PanelLeft,
  HeartPulse,
  Menu
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { isThisMonth, isThisYear, format, isToday } from 'date-fns';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensors,
  useSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { MenuItem, Seller, Order, StaffMember, Venue, PlatformConfig } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from '@/lib/data';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// --- SCHEMAS ---

const staffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(['Driver', 'Server', 'Manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'Numbers only'),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary/10 text-white border-l-4 border-primary" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && (
        <span className={cn("text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300", active ? "text-white" : "")}>
          {label}
        </span>
      )}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-2 pt-5">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="h-3 w-3" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SortableMenuItem({ item, onRemove }: { item: MenuItem; onRemove: (item: MenuItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center justify-between p-4 rounded-xl border-2 bg-white transition-all", isDragging ? "shadow-2xl border-primary ring-4 ring-primary/10 opacity-90 scale-105" : "shadow-sm border-slate-100 hover:border-slate-200")}>
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-50 rounded-lg text-slate-400">
          <GripVertical className="h-5 w-5" />
        </div>
        <div>
          <p className="font-black text-sm text-[#213147] uppercase tracking-tight">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.category}</span>
            <span className="text-[10px] font-black text-primary">${item.price.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-full h-10 w-10" onClick={() => onRemove(item)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- MAIN PAGE ---

export default function SellerAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Navigation State
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Functional State
  const [isMounted, setIsMounted] = useState(false);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [isProvisioningRegistry, setIsProvisioningRegistry] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [now, setNow] = useState(new Date());

  const sensors = useSensors(
    useSensor(PointerSensor), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const isHardcodedSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  // Role Checks
  const roleRef = useMemoFirebase(() => (!firestore || !user?.email ? null : doc(firestore, 'roles_seller_admin', user.email.toLowerCase())), [firestore, user]);
  const { data: sellerRole, isLoading: isSellerRoleLoading } = useDoc(roleRef);
  
  const platformRoleRef = useMemoFirebase(() => (!firestore || !user ? null : doc(firestore, 'roles_admin', user.uid)), [firestore, user]);
  const { data: platformRole, isLoading: isPlatformRoleLoading } = useDoc(platformRoleRef);

  const venueRef = useMemoFirebase(() => (!firestore || !sellerId ? null : doc(firestore, 'venues', sellerId)), [firestore, sellerId]);
  const { data: venueData } = useDoc<Venue>(venueRef);

  const platformConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: platformConfig } = useDoc<PlatformConfig>(platformConfigRef);

  // Access enabled for prototyping phase
  const hasAccess = true; 

  useEffect(() => { 
    setIsMounted(true); 
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Data Fetching
  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, hasAccess]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore && hasAccess ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, hasAccess]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId, hasAccess]);
  const { data: staff } = useCollection<StaffMember>(staffQuery);

  // Form Logic
  const staffForm = useForm<StaffFormData>({ 
    resolver: zodResolver(staffSchema), 
    defaultValues: { name: '', role: 'Driver', pin: '', isActive: true } 
  });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !hasAccess) return;
    const staffId = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', staffId), { 
      ...data, 
      id: staffId, 
      createdAt: editingStaff?.createdAt || serverTimestamp() 
    }, { merge: true });
    setIsStaffFormOpen(false); 
    setEditingStaff(null); 
    staffForm.reset();
    toast({ title: "Staff member saved" });
  };

  const handleToggleMode = async (mode: string, current: boolean) => {
    if (!firestore || !sellerId) return;
    const fieldMap: Record<string, string> = {
      'Beverage Cart': 'bevcartActive',
      'Clubhouse': 'clubhouseActive',
      'Lane Delivery': 'lanedeliveryActive',
      'Take Out': 'takeoutActive'
    };
    const field = fieldMap[mode];
    if (field) {
      await updateDoc(doc(firestore, 'sellers', sellerId), { [field]: !current });
      toast({ title: `${mode} status updated` });
    }
  };

  const handleResetDemo = async () => {
    if (!firestore || !sellerId || !hasAccess) return;
    setIsResettingDemo(true);
    try {
      const batch = writeBatch(firestore);
      const seedItems = sellerId.includes('bowling') ? bowlingAlleyItems : (sellerId.includes('private') ? privateGolfItems : publicGolfItems);
      const snapshot = await getDocs(collection(firestore, 'sellers', sellerId, 'menuItems'));
      snapshot.docs.forEach(d => batch.delete(d.ref));
      seedItems.forEach((item, idx) => {
        const itemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        batch.set(itemRef, { ...item, id: itemRef.id, rank: idx, createdAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: "Demo Reset Successful" });
    } finally { setIsResettingDemo(false); }
  };

  const handleDragEnd = (event: DragEndEvent, menuType: string, items: MenuItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !firestore || !hasAccess) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    const batch = writeBatch(firestore);
    reordered.forEach((item, index) => batch.update(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), { [`menuRanks.${menuType}`]: index }));
    batch.commit();
  };

  const supportEmail = platformConfig?.supportEmail || 'mosherpe@gmail.com';
  const mailtoLink = `mailto:${supportEmail}?subject=Stripe Onboarding Request - ${seller?.courseName}&body=Hello Koop Support, %0D%0A%0D%0AI would like to request a manual Stripe onboarding link for my venue: ${seller?.courseName}. %0D%0A%0D%0AThank you!`;

  const handleProvisionRegistry = async () => {
    if (!firestore || !seller) return;
    setIsProvisioningRegistry(true);
    try {
      await setDoc(doc(firestore, 'venues', sellerId), {
        venueId: sellerId,
        name: seller.courseName,
        ownerUid: user?.uid || 'anonymous_demo_admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stripeOnboardingComplete: false,
        payoutsEnabled: false
      });
      toast({ title: "Payment Registry Provisioned" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: e.message });
    } finally {
      setIsProvisioningRegistry(false);
    }
  };

  const handleVerifyStripeConnection = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsVerifyingStripe(true);
    setVerificationResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const verify = httpsCallable(functions, 'verifyVenueConnection');
      const result = await verify({ venueId: sellerId });
      setVerificationResult(result.data);
      toast({ 
        title: "Stripe Connection Verified", 
        description: `Verified merchant: ${(result.data as any).businessName}` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const stats = useMemo(() => {
    if (!orders) return null;
    const todayOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const todayRevenue = todayOrders.reduce((acc, o) => acc + o.total, 0);
    const activeCount = orders.filter(o => o.status !== 'Delivered').length;
    const totalOrdersCount = todayOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? todayRevenue / totalOrdersCount : 0;
    
    return {
      todayRevenue: todayRevenue.toFixed(2),
      activeCount,
      totalOrdersCount,
      avgOrderValue: avgOrderValue.toFixed(2)
    };
  }, [orders]);

  if (isUserLoading || isSellerRoleLoading || isPlatformRoleLoading || !isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin h-10 w-10 text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Admin Interface...</p>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "service", label: "Service Modes", icon: Zap },
    { id: "staff", label: "Staff Registry", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavButton 
              key={item.id} 
              id={item.id} 
              label={item.label} 
              icon={item.icon} 
              active={activeNav === item.id} 
              onClick={(id) => { setActiveNav(id); if (isMobile) setSidebarOpen(false); }}
              sidebarOpen={showLabels}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 p-4">
          {showLabels && (
            <div className="bg-white/5 rounded-xl p-4 mb-4 animate-in fade-in duration-500">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Venue</p>
              <p className="text-xs font-black text-white uppercase tracking-tight truncate">{seller?.courseName}</p>
              <Badge variant="outline" className="mt-2 text-[8px] border-primary/30 text-primary uppercase font-black tracking-widest">
                {seller?.type}
              </Badge>
            </div>
          )}
          {!isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className={cn(
        "bg-[#213147] hidden lg:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <SideBarContent />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#213147]">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-[#213147] border-r-4 border-primary/20">
                  <div className="flex flex-col h-full">
                    <SideBarContent forceLabels={true} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight text-[#213147] truncate max-w-[150px] sm:max-w-none">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase border-l-2 pl-3 sm:pl-4 hidden xs:block">
              {format(now, isMobile ? 'MMM d' : 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isMobile && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#213147]">System Online</span>
              </div>
            )}

            {platformRole && (
              <Badge className="bg-primary/10 text-primary border-primary/20 uppercase font-black text-[8px] sm:text-[9px] h-7 sm:h-8 px-2 sm:px-3">
                {isMobile ? 'Admin' : 'Impersonation Active'}
              </Badge>
            )}

            <button 
              onClick={() => router.push('/')}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Return to Home"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* SECTION CONTENT */}
        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-20">
            
            {/* DASHBOARD SECTION */}
            {activeNav === 'dashboard' && (
              <div className="space-y-8 sm:space-y-10">
                {/* Metrics */}
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:pb-0 md:mx-0 md:px-0">
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Today's Revenue" value={`$${stats?.todayRevenue}`} sub="+14% vs yesterday" icon={DollarSign} colorClass="bg-green-500" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Active Orders" value={stats?.activeCount || 0} sub="Currently preparing/delivering" icon={ShoppingBag} colorClass="bg-primary" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Volume Today" value={stats?.totalOrdersCount || 0} sub="Confirmed orders" icon={Activity} colorClass="bg-[#213147]" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Avg Order Value" value={`$${stats?.avgOrderValue}`} sub="Gross sales" icon={TrendingUp} colorClass="bg-amber-500" />
                  </div>
                </div>

                {/* Service Modes Quick Access */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#213147]">Service Modules</h3>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:pb-0 md:mx-0 md:px-0">
                    {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map((mode) => {
                      const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || 
                                       (mode === 'Clubhouse' && seller?.clubhouseActive) ||
                                       (mode === 'Lane Delivery' && seller?.lanedeliveryActive) ||
                                       (mode === 'Take Out' && seller?.takeoutActive);
                      return (
                        <Card 
                          key={mode} 
                          className={cn(
                            "cursor-pointer transition-all duration-300 border-2 min-w-[180px] md:min-w-0",
                            isActive ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 bg-white hover:border-slate-200"
                          )}
                          onClick={() => handleToggleMode(mode, !!isActive)}
                        >
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className={cn("p-2 sm:p-3 rounded-2xl", isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                                <Zap className="h-5 sm:h-6 w-5 sm:w-6" />
                              </div>
                              <Badge className={cn("text-[8px] sm:text-[10px]", isActive ? "bg-primary text-white" : "bg-slate-200 text-slate-400")}>
                                {isActive ? 'ACTIVE' : 'OFF'}
                              </Badge>
                            </div>
                            <p className="font-black font-headline text-xs sm:text-sm uppercase tracking-tight text-[#213147]">{mode}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase mt-1">
                              {isActive ? 'Live' : 'Tap to init'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Live Activity Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-primary" />
                      <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#213147]">Live Activity</h3>
                    </div>
                    <Button variant="link" className="text-primary font-black uppercase text-[10px] tracking-widest" onClick={() => setActiveNav('orders')}>
                      Full Log <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <Card className="border-2 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50 border-b">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase">Order ID</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Service</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Patron</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders?.slice(0, 5).map((order) => (
                            <TableRow key={order.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-mono text-xs font-bold text-primary">#{order.id.slice(-5).toUpperCase()}</TableCell>
                              <TableCell className="text-[10px] font-black uppercase">{order.menuType}</TableCell>
                              <TableCell className="text-[10px] font-medium">{order.customerName}</TableCell>
                              <TableCell className="text-right font-bold text-xs">${order.total.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="text-[8px] font-black uppercase">{order.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ORDERS SECTION */}
            {activeNav === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    {['All', 'Placed', 'Preparing', 'Delivered'].map(status => (
                      <Button key={status} variant="outline" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap">
                        {status}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={() => {
                    const worksheet = XLSX.utils.json_to_sheet(orders?.map(o => ({ ID: o.id, Patron: o.customerName, Total: o.total, Status: o.status, Date: o.createdAt?.toDate() })) || []);
                    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
                    XLSX.writeFile(workbook, `Koop_Export_${sellerId}.xlsx`);
                  }} className="h-10 bg-[#213147] font-black uppercase text-[10px] tracking-widest gap-2">
                    <Download className="h-4 w-4" /> Export Ledger
                  </Button>
                </div>

                <Card className="border-2 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Patron</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Items</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Revenue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders?.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="text-[10px] font-mono text-muted-foreground">
                              {order.createdAt ? format(order.createdAt.toDate(), 'HH:mm:ss') : '--'}
                            </TableCell>
                            <TableCell className="font-bold text-xs">{order.customerName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                              {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                            </TableCell>
                            <TableCell className="text-right font-black text-xs">${order.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="text-[9px] font-black uppercase">{order.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* MENU SECTION */}
            {activeNav === 'menu' && (
              <div className="space-y-8">
                {seller?.menuTypes?.map(type => {
                  const items = menuItems?.filter(i => i.availableOn?.includes(type)) || [];
                  return (
                    <div key={type} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Layers className="h-5 w-5 text-primary" />
                          <h4 className="font-headline font-black text-base uppercase tracking-tight text-[#213147]">{type} Lineup</h4>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          Modify
                        </Button>
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e as any, type, items)}>
                        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          <div className="grid gap-3">
                            {items.map(i => (
                              <SortableMenuItem 
                                key={i.id} 
                                item={i} 
                                onRemove={(it) => updateDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', it.id), { 
                                  availableOn: it.availableOn?.filter(t => t !== type) 
                                })} 
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  );
                })}
              </div>
            )}

            {/* STAFF SECTION */}
            {activeNav === 'staff' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#213147]">Registry</h3>
                   <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest">
                     Add
                   </Button>
                </div>
                <Card className="border-2 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Identity</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Role</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Secure PIN</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff?.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-bold text-xs uppercase">{s.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[9px] font-black uppercase">{s.role}</Badge>
                            </TableCell>
                            <TableCell><code className="text-xs font-mono font-black tracking-widest text-primary">{s.pin}</code></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* PAYMENTS SECTION */}
            {activeNav === 'payments' && (
              <div className="space-y-8">
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-3 md:pb-0 md:mx-0 md:px-0">
                   <div className="min-w-[200px] flex-1">
                     <Card className="border-2 border-primary/20 bg-primary/5 h-full">
                       <CardHeader className="pb-2 pt-5">
                         <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary">MTD Revenue</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#213147]">${stats?.todayRevenue}</div>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 italic">Payout Monday</p>
                       </CardContent>
                     </Card>
                   </div>
                   <div className="min-w-[200px] flex-1">
                     <Card className="border-2 border-slate-100 bg-white h-full">
                       <CardHeader className="pb-2 pt-5">
                         <CardDescription className="text-[10px] font-black uppercase tracking-widest">Platform Fee</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#213147]">${seller?.serviceFee?.toFixed(2)}</div>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Per transaction</p>
                       </CardContent>
                     </Card>
                   </div>
                   <div className="min-w-[200px] flex-1">
                     <Card className="border-2 border-slate-100 bg-white h-full">
                       <CardHeader className="pb-2 pt-5">
                         <CardDescription className="text-[10px] font-black uppercase tracking-widest">Commission</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-primary">0%</div>
                         <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Venue keeps 100%</p>
                       </CardContent>
                     </Card>
                   </div>
                </div>

                <Card className="border-2 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2 p-6 sm:p-8 space-y-4 border-r-2 border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                          <CreditCard className="h-6 sm:h-8 w-6 sm:w-8" />
                        </div>
                        <div>
                          <h3 className="font-headline font-black text-lg sm:text-xl uppercase tracking-tight text-[#213147]">Payout Integration</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stripe Express verified</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                        Koop uses Stripe to securely handle all payments. Revenue is deposited directly into your merchant bank account within 48 hours.
                      </p>
                      <div className="flex flex-wrap gap-4 sm:gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Zero Venue Fees</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">PCI-DSS Compliant</span>
                        </div>
                      </div>

                      {venueData && (
                        <div className="pt-6 border-t border-slate-100 mt-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Connection Health</h4>
                          <div className="flex flex-col gap-4">
                            <Button 
                              variant="outline" 
                              onClick={handleVerifyStripeConnection}
                              disabled={isVerifyingStripe}
                              className="w-full sm:w-fit h-10 px-4 text-[10px] font-black uppercase tracking-widest border-2 gap-2"
                            >
                              {isVerifyingStripe ? <Loader2 className="h-3 w-3 animate-spin" /> : <HeartPulse className="h-3.5 w-3.5 text-primary" />}
                              Verify Connection
                            </Button>

                            {verificationResult && (
                              <div className="p-4 bg-slate-50 border-2 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                                  <div>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Merchant</p>
                                    <p className="text-xs font-black uppercase text-[#213147] truncate">{verificationResult.businessName}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                    <Badge variant={verificationResult.status === 'Ready' ? 'default' : 'destructive'} className="text-[8px] font-black uppercase px-2 h-5">
                                      {verificationResult.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-6">
                      {!venueData ? (
                        <div className="space-y-4">
                          <AlertTriangle className="h-10 sm:h-12 w-10 sm:w-12 text-amber-500 mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-[#213147]">Registry Required</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed px-4">
                              This venue is not yet connected to the platform's payment core.
                            </p>
                          </div>
                          <Button onClick={handleProvisionRegistry} disabled={isProvisioningRegistry} className="w-full bg-[#213147] font-black uppercase text-[10px] tracking-widest h-12 shadow-lg">
                            {isProvisioningRegistry ? <Loader2 className="animate-spin" /> : "Initialize Registry"}
                          </Button>
                        </div>
                      ) : venueData.payoutsEnabled ? (
                        <>
                          <div className="bg-green-100 p-4 sm:p-5 rounded-full text-green-600 mb-2">
                            <ShieldCheck className="h-10 sm:h-12 w-10 sm:w-12" />
                          </div>
                          <div className="space-y-2">
                            <Badge className="bg-green-600 uppercase font-black tracking-[0.2em] px-4 py-1 h-auto">Payouts Active</Badge>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase max-w-[200px]">Verified merchant processing.</p>
                          </div>
                          <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest border-2 border-slate-200" asChild>
                            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">Stripe Login <ExternalLink className="ml-2 h-3 w-3" /></a>
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="bg-primary/10 p-4 sm:p-5 rounded-full text-primary mb-2">
                            <Mail className="h-10 sm:h-12 w-10 sm:w-12" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-headline font-black text-sm uppercase tracking-tight">Manual Activation</h4>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed px-4">
                              Contact support to start accepting orders.
                            </p>
                          </div>
                          <Button asChild className="w-full bg-primary font-black uppercase text-[10px] tracking-widest h-12 shadow-lg rounded-xl">
                            <a href={mailtoLink}>Request Setup</a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* SETTINGS SECTION */}
            {activeNav === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <Card className="border-2 shadow-sm">
                   <CardHeader className="border-b bg-slate-50/50">
                     <CardTitle className="text-sm font-black uppercase tracking-widest">Venue Profile</CardTitle>
                   </CardHeader>
                   <CardContent className="p-4 sm:p-6 space-y-6">
                     <div className="grid gap-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Course Name</Label>
                       <Input value={seller?.courseName} readOnly className="font-bold border-2 bg-slate-50" />
                     </div>
                     <div className="grid gap-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</Label>
                       <Input value={seller?.type} readOnly className="font-bold border-2 bg-slate-50" />
                     </div>
                     <div className="grid gap-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support Contact</Label>
                       <Input value={seller?.contactEmail} readOnly className="font-bold border-2 bg-slate-50" />
                     </div>
                   </CardContent>
                </Card>

                <Card className="border-2 shadow-sm">
                   <CardHeader className="border-b bg-slate-50/50">
                     <CardTitle className="text-sm font-black uppercase tracking-widest">Maintenance</CardTitle>
                   </CardHeader>
                   <CardContent className="p-4 sm:p-6 space-y-4">
                     <p className="text-xs text-muted-foreground leading-relaxed">
                       Reset demonstration data or access shift interfaces.
                     </p>
                     <div className="flex flex-col gap-3 pt-4">
                       <Button variant="outline" className="justify-between h-12 font-black uppercase text-[10px] tracking-widest border-2" onClick={handleResetDemo} disabled={isResettingDemo}>
                         {isResettingDemo ? <Loader2 className="animate-spin" /> : "Reset Demo"}
                         <Sparkles className="h-4 w-4 text-primary" />
                       </Button>
                       <Button variant="outline" className="justify-between h-12 font-black uppercase text-[10px] tracking-widest border-2" asChild>
                         <Link href={`/sellers/${sellerId}/staff-login`}>
                           Staff Interface
                           <ExternalLink className="h-4 w-4" />
                         </Link>
                       </Button>
                     </div>
                   </CardContent>
                </Card>
              </div>
            )}

          </div>
        </ScrollArea>
      </main>

      {/* STAFF DIALOG */}
      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="rounded-[2rem] border-2 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase text-[#213147] tracking-tight">
              {editingStaff ? 'Update Member' : 'Credential Staff'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">Configure secure access for personnel.</DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6 pt-4">
              <FormField control={staffForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">Full Name</FormLabel>
                  <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={staffForm.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Driver">Driver (BevCart)</SelectItem>
                        <SelectItem value="Server">Server (Clubhouse)</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={staffForm.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">PIN</FormLabel>
                    <FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-mono font-black text-lg tracking-[0.5em] text-center text-primary" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-12 bg-[#213147] font-black uppercase tracking-widest shadow-xl">
                  Save Registry
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
