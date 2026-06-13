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
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useFirebase, useAuth } from '@/firebase';
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
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  LogOut,
  ArrowRight,
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
  Search,
  TrendingUp,
  HeartPulse,
  Menu as LucideMenu,
  Image as LucideImage,
  QrCode,
  Smartphone,
  Check,
  X,
  Target
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { cn, getNumericOrderId, SUPER_ADMIN_ID } from '@/lib/utils';
import { isThisMonth, isToday, format, startOfHour, eachHourOfInterval, subHours } from 'date-fns';
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
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import type { MenuItem, Seller, Order, StaffMember, Venue, PlatformConfig } from '@/lib/types';
import { categories } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

// --- SCHEMAS ---

const staffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(['Driver', 'Server', 'Manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'Numbers only'),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

const itemSchema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  category: z.enum(categories as any),
  imageUrl: z.string().optional(),
  availableOn: z.array(z.string()).default([]),
});

type ItemFormData = z.infer<typeof itemSchema>;

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && (
        <span className={cn("text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300", active ? "text-primary" : "")}>
          {label}
        </span>
      )}
      {active && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full" />
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

// --- MAIN PAGE ---

export default function SellerAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Navigation State
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Operational State
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => { 
    setIsMounted(true); 
    if (typeof window !== 'undefined') {
      // Collapse sidebar by default on smaller screens but keep it functional
      if (window.innerWidth < 1024) setSidebarOpen(false);
    }
  }, []);

  // Data Fetching
  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staff } = useCollection<StaffMember>(staffQuery);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venueData } = useDoc<Venue>(venueRef);

  // Form Logic
  const staffForm = useForm<StaffFormData>({ 
    resolver: zodResolver(staffSchema), 
    defaultValues: { name: '', role: 'Driver', pin: '', isActive: true } 
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price: 0, category: 'Beer', availableOn: [] }
  });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore) return;
    const id = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    setDoc(doc(firestore, 'sellers', sellerId, 'staff', id), { 
      ...data, 
      id, 
      createdAt: editingStaff?.createdAt || serverTimestamp() 
    }, { merge: true }).then(() => {
      setIsStaffFormOpen(false); 
      setEditingStaff(null); 
      staffForm.reset();
      toast({ title: "Staff member saved" });
    });
  };

  const onSaveItem = async (data: ItemFormData) => {
    if (!firestore) return;
    const id = editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9);
    setDoc(doc(firestore, 'sellers', sellerId, 'menuItems', id), {
      ...data,
      id,
      rank: editingItem?.rank || 0,
      createdAt: editingItem?.createdAt || serverTimestamp()
    }, { merge: true }).then(() => {
      setIsItemFormOpen(false);
      setEditingItem(null);
      itemForm.reset();
      toast({ title: editingItem ? "Item Updated" : "Item Added" });
    });
  };

  const toggleItemAvailability = (item: MenuItem) => {
    if (!firestore) return;
    updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), {
      isAvailable: !item.isAvailable
    }).then(() => {
      toast({ title: item.isAvailable ? "Item 86'd" : "Item Restored", description: `${item.name} availability updated.` });
    });
  };

  const handleUpdateStatus = (orderId: string, current: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(current as any) + 1;
    if (nextIdx < stages.length) {
      updateDoc(doc(firestore, 'orders', orderId), { 
        status: stages[nextIdx],
        deliveredAt: stages[nextIdx] === 'Delivered' ? serverTimestamp() : null 
      });
    }
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
      updateDoc(doc(firestore, 'sellers', sellerId), { [field]: !current });
      toast({ title: `${mode} status updated` });
    }
  };

  const handleVerifyStripe = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsVerifyingStripe(true);
    setVerificationResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const verify = httpsCallable(functions, 'verifyVenueConnection');
      const result = await verify({ venueId: sellerId });
      setVerificationResult(result.data);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Check Failed", description: e.message });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const stats = useMemo(() => {
    if (!orders) return null;
    const today = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const revenue = today.reduce((acc, o) => acc + o.total, 0);
    const fees = today.reduce((acc, o) => acc + o.serviceFee, 0);
    return {
      revenue: revenue.toFixed(2),
      fees: fees.toFixed(2),
      active: orders.filter(o => o.status !== 'Delivered').length,
      volume: today.length,
      avg: today.length > 0 ? (revenue / today.length).toFixed(2) : '0.00'
    };
  }, [orders]);

  const analyticsData = useMemo(() => {
    if (!orders) return { hourly: [], revenueByMode: [] };
    const last12Hours = eachHourOfInterval({
      start: subHours(startOfHour(new Date()), 11),
      end: startOfHour(new Date()),
    });
    const hourly = last12Hours.map(hour => {
      const count = orders.filter(o => 
        o.createdAt && 
        format(o.createdAt.toDate(), 'yyyy-MM-dd HH') === format(hour, 'yyyy-MM-dd HH')
      ).length;
      return { time: format(hour, 'ha'), count };
    });
    const modes: Record<string, number> = {};
    orders.forEach(o => {
      modes[o.menuType] = (modes[o.menuType] || 0) + o.total;
    });
    const revenueByMode = Object.entries(modes).map(([name, value]) => ({ name, value }));
    return { hourly, revenueByMode };
  }, [orders]);

  const COLORS = ['#E50000', '#213147', '#4F46E5', '#F59E0B', '#10B981'];

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders Queue", icon: ClipboardList },
    { id: "menu", label: "Inventory / 86'd", icon: UtensilsCrossed },
    { id: "service", label: "Service Center", icon: Zap },
    { id: "staff", label: "Staff Registry", icon: Users },
    { id: "payments", label: "Ledger", icon: CreditCard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Venue Settings", icon: Settings },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full bg-[#213147]">
        <div className="p-6 border-b border-white/5 space-y-4 shrink-0">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
          {showLabels && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 animate-in fade-in duration-500">
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-1">Administrative Port</p>
              <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight">{seller?.courseName || 'Establishing...'}</p>
            </div>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
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
        <div className="mt-auto border-t border-white/5 p-4 shrink-0">
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              {sidebarOpen ? <ChevronRight /> : <ChevronLeft />}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      {/* GLOBAL HEADER */}
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded-xl">
             <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black font-headline uppercase tracking-tight text-[#213147]">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Koop Venue Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 border border-green-100 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Live Sync Online</span>
          </div>
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#213147]">
                  <LucideMenu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 bg-[#213147] border-l-4 border-primary/20">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Venue Management Sections</SheetDescription>
                </SheetHeader>
                <SideBarContent forceLabels={true} />
              </SheetContent>
            </Sheet>
          )}
          <button onClick={() => router.push('/')} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-10 pb-24">

              {activeNav === 'dashboard' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard label="Direct Revenue" value={`$${stats?.revenue}`} sub="Today" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Platform Fees" value={`$${stats?.fees}`} sub="Generated" icon={CreditCard} colorClass="bg-[#213147]" />
                    <KPICard label="Open Tickets" value={stats?.active || 0} sub="Pending fulfillment" icon={ShoppingBag} colorClass="bg-primary" />
                    <KPICard label="Average Ticket" value={`$${stats?.avg}`} sub="Today's mean" icon={TrendingUp} colorClass="bg-amber-500" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 border-2">
                      <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest">Mode Control</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                          const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || (mode === 'Clubhouse' && seller?.clubhouseActive) || (mode === 'Lane Delivery' && seller?.lanedeliveryActive) || (mode === 'Take Out' && seller?.takeoutActive);
                          return (
                            <div key={mode} className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", isActive ? "bg-white border-primary/20 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60")}>
                               <span className="text-[10px] font-black uppercase text-[#213147]">{mode}</span>
                               <Switch checked={isActive} onCheckedChange={() => handleToggleMode(mode, !!isActive)} className="data-[state=checked]:bg-primary" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 border-2">
                      <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-black uppercase tracking-widest">Recent Tickets</CardTitle>
                        <Button variant="link" onClick={() => setActiveNav('orders')} className="h-auto p-0 text-[10px] font-black uppercase text-primary">View Queue</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableBody>
                            {orders?.slice(0, 5).map(o => (
                              <TableRow key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setActiveNav('orders')}>
                                <TableCell className="font-mono text-[10px] font-bold text-primary">#{getNumericOrderId(o.id)}</TableCell>
                                <TableCell className="text-[10px] font-black uppercase">{o.menuType}</TableCell>
                                <TableCell className="font-bold text-xs">{o.customerName}</TableCell>
                                <TableCell className="text-right font-black text-xs">${o.total.toFixed(2)}</TableCell>
                                <TableCell className="text-right"><Badge variant="outline" className="text-[8px] font-black uppercase">{o.status}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center bg-white p-4 rounded-2xl border-2 shadow-sm">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="text-[9px] font-black uppercase tracking-widest rounded-full px-4">All Active</Button>
                      <Button size="sm" variant="outline" className="text-[9px] font-black uppercase tracking-widest rounded-full px-4 border-2">Pending</Button>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">{orders?.filter(o => o.status !== 'Delivered').length} Open Tickets</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders?.filter(o => o.status !== 'Delivered').sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).map((order) => (
                      <Card key={order.id} className="border-2 shadow-sm overflow-hidden flex flex-col group hover:border-primary/30 transition-all">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                          <span className="font-mono text-[10px] font-black text-primary">#{getNumericOrderId(order.id)}</span>
                          <Badge className="text-[8px] font-black uppercase bg-[#213147]">{order.menuType}</Badge>
                        </div>
                        <CardContent className="p-5 flex-1 space-y-4">
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Patron</p>
                            <p className="font-headline font-black text-sm text-[#213147] uppercase">{order.customerName}</p>
                            {order.menuTypeLocation && <p className="text-[10px] font-bold text-primary mt-1 uppercase">{order.menuTypeLocation}</p>}
                          </div>
                          <div className="space-y-1.5">
                            {order.items.map(i => (
                              <div key={i.cartId} className="flex justify-between text-xs">
                                <span className="font-bold text-slate-600">{i.quantity}x {i.name}</span>
                                <span className="font-mono text-slate-400">${(i.price * i.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-4 border-t border-dashed flex justify-between items-center">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">Revenue</span>
                            <span className="text-sm font-black text-[#213147]">${order.total.toFixed(2)}</span>
                          </div>
                        </CardContent>
                        <CardFooter className="p-2 bg-slate-50 border-t flex gap-2">
                           <Button className="flex-1 h-10 font-black uppercase text-[10px] tracking-widest" onClick={() => handleUpdateStatus(order.id, order.status)}>
                              {order.status === 'Placed' && "Advance To Preparing"}
                              {order.status === 'Preparing' && "Start Delivery"}
                              {order.status === 'Out for Delivery' && "Mark Delivered"}
                           </Button>
                           <Button size="icon" variant="outline" className="h-10 w-10 border-2 text-destructive hover:bg-destructive/10"><X className="h-4 w-4" /></Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                       <h3 className="font-headline font-black text-lg text-[#213147] uppercase tracking-tight">Master Inventory</h3>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global visibility & 86'd management</p>
                    </div>
                    <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} className="bg-primary hover:bg-primary/90 font-black uppercase text-[10px] h-10 gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
                  </div>

                  <div className="space-y-10">
                    {categories.map(cat => {
                      const items = menuItems?.filter(i => i.category === cat) || [];
                      if (!items.length) return null;
                      return (
                        <div key={cat} className="space-y-4">
                           <div className="flex items-center gap-3 border-b-2 pb-2">
                              <h4 className="font-headline font-black text-sm uppercase tracking-widest text-[#213147]">{cat}</h4>
                              <Badge variant="secondary" className="text-[9px] font-black h-5">{items.length} Total</Badge>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {items.map(item => (
                                <Card key={item.id} className={cn("border-2 overflow-hidden group transition-all", !item.isAvailable && "opacity-60 bg-slate-50 grayscale border-dashed")}>
                                   <div className="flex h-24">
                                      <div className="w-24 bg-slate-100 border-r-2 flex items-center justify-center relative">
                                         {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <LucideImage className="h-8 w-8 text-slate-300" />}
                                         {!item.isAvailable && <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center"><span className="text-[10px] font-black text-white uppercase tracking-[0.2em] -rotate-12">86'D</span></div>}
                                      </div>
                                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                         <div>
                                            <p className="font-black text-xs uppercase text-[#213147] truncate">{item.name}</p>
                                            <p className="font-mono text-primary text-[10px] font-bold">${item.price.toFixed(2)}</p>
                                         </div>
                                         <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-2">
                                              <Switch checked={item.isAvailable !== false} onCheckedChange={() => toggleItemAvailability(item)} className="data-[state=checked]:bg-green-600 h-4 w-7" />
                                              <span className="text-[8px] font-black uppercase text-muted-foreground">{item.isAvailable !== false ? 'Live' : 'Hidden'}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                               <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => { setEditingItem(item); itemForm.reset(item); setIsItemFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                               <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                </Card>
                              ))}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeNav === 'service' && (
                 <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-1">
                       <h3 className="font-headline font-black text-lg text-[#213147] uppercase tracking-tight">Active Channels</h3>
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global delivery management</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                       {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                          const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || (mode === 'Clubhouse' && seller?.clubhouseActive) || (mode === 'Lane Delivery' && seller?.lanedeliveryActive) || (mode === 'Take Out' && seller?.takeoutActive);
                          return (
                            <Card key={mode} className={cn("border-2 transition-all cursor-pointer", isActive ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => handleToggleMode(mode, !!isActive)}>
                               <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                  <div className={cn("p-4 rounded-2xl", isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                                     <Zap className="h-6 w-6" />
                                  </div>
                                  <div className="space-y-1">
                                     <p className="font-black uppercase text-sm text-[#213147]">{mode}</p>
                                     <Badge className={isActive ? "bg-primary" : "bg-slate-200 text-slate-400"}>{isActive ? 'LIVE' : 'OFFLINE'}</Badge>
                                  </div>
                               </CardContent>
                            </Card>
                          );
                       })}
                    </div>
                 </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center">
                      <h3 className="font-headline font-black text-lg text-[#213147] uppercase tracking-tight">Personnel Registry</h3>
                      <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-[#213147] font-black uppercase text-[10px] h-10 tracking-widest px-6">Add Staff</Button>
                   </div>
                   <Card className="border-2 shadow-sm overflow-hidden">
                      <Table>
                         <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                               <TableHead className="text-[10px] font-black uppercase">Name</TableHead>
                               <TableHead className="text-[10px] font-black uppercase">Role</TableHead>
                               <TableHead className="text-[10px] font-black uppercase">Secure PIN</TableHead>
                               <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {staff?.map(s => (
                              <TableRow key={s.id} className="hover:bg-slate-50">
                                 <TableCell className="font-bold text-xs uppercase text-[#213147]">{s.name}</TableCell>
                                 <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase">{s.role}</Badge></TableCell>
                                 <TableCell><code className="text-xs font-mono font-black tracking-widest text-primary">{s.pin}</code></TableCell>
                                 <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'sellers', sellerId, 'staff', s.id))}><Trash2 className="h-4 w-4" /></Button>
                                 </TableCell>
                              </TableRow>
                            ))}
                         </TableBody>
                      </Table>
                   </Card>
                </div>
              )}

              {activeNav === 'payments' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="bg-[#213147] text-white border-0 shadow-xl overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign className="h-24 w-24" /></div>
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-white/60 text-[9px] font-black uppercase tracking-widest">Available Revenue</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-4xl font-black font-headline tracking-tighter">${stats?.revenue}</div><p className="text-[8px] font-bold uppercase text-white/40 mt-1">Pending 48h settlement</p></CardContent>
                      </Card>
                      <Card className="border-2 border-indigo-100 bg-indigo-50/30">
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-indigo-600/60 text-[9px] font-black uppercase tracking-widest">Convenience Collected</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-4xl font-black font-headline tracking-tighter text-indigo-700">${stats?.fees}</div><p className="text-[8px] font-bold uppercase text-indigo-600/40 mt-1">Supporting Platform Ops</p></CardContent>
                      </Card>
                      <Card className="border-2 border-amber-100 bg-amber-50/30">
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-amber-600/60 text-[9px] font-black uppercase tracking-widest">Venue Commission</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-4xl font-black font-headline tracking-tighter text-amber-700">100%</div><p className="text-[8px] font-bold uppercase text-amber-600/40 mt-1">You keep full menu price</p></CardContent>
                      </Card>
                   </div>

                   <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="bg-slate-50 border-b"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Direct Deposit History</CardTitle></CardHeader>
                      <CardContent className="p-0">
                         <Table>
                            <TableHeader className="bg-slate-50/50 border-b">
                               <TableRow>
                                  <TableHead className="text-[10px] font-black uppercase">Settlement Date</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Orders</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">Net Deposit</TableHead>
                                  <TableHead className="text-right text-[10px] font-black uppercase">Status</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                               {[...Array(3)].map((_, i) => (
                                 <TableRow key={i}>
                                    <TableCell className="text-[10px] font-bold">{format(subHours(new Date(), (i + 1) * 24), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="text-xs font-medium">-- orders</TableCell>
                                    <TableCell className="font-mono text-xs font-black text-green-600">Pending</TableCell>
                                    <TableCell className="text-right"><Badge variant="outline" className="text-[8px] font-black uppercase">Processing</Badge></TableCell>
                                 </TableRow>
                               ))}
                            </TableBody>
                         </Table>
                      </CardContent>
                   </Card>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Card className="border-2">
                         <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Order Density (Last 12h)</CardTitle></CardHeader>
                         <CardContent className="pt-10 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={analyticsData.hourly}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                  <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                  <ChartTooltip contentStyle={{ fontSize: '10px', borderRadius: '12px' }} />
                                  <Bar dataKey="count" fill="#E50000" radius={[4, 4, 0, 0]} />
                               </BarChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>

                      <Card className="border-2">
                         <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Revenue Share by Mode</CardTitle></CardHeader>
                         <CardContent className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={analyticsData.revenueByMode} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                     {analyticsData.revenueByMode.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                     ))}
                                  </Pie>
                                  <ChartTooltip />
                                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                               </PieChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>
                   </div>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <Card className="lg:col-span-1 border-2 text-center p-8 bg-slate-50 relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                         <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-4 border-white mb-6 inline-block">
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/sellers/${sellerId}/order`)}`} className="w-40 h-40" alt="" />
                         </div>
                         <h3 className="font-headline font-black text-sm uppercase tracking-tight mb-4">Master Order QR</h3>
                         <div className="grid gap-2">
                            <Button variant="outline" className="h-10 text-[9px] font-black uppercase tracking-widest border-2 gap-2"><Download className="h-3.5 w-3.5" /> Download PNG</Button>
                            <Button variant="ghost" className="h-10 text-[9px] font-black uppercase tracking-widest gap-2"><Smartphone className="h-3.5 w-3.5" /> View Sample Signs</Button>
                         </div>
                      </Card>

                      <div className="lg:col-span-2 space-y-6">
                         <Card className="border-2">
                            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                               <div><CardTitle className="text-xs font-black uppercase tracking-widest">Stripe Engine</CardTitle><CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Revenue disbursement configuration</CardDescription></div>
                               <Badge className="bg-indigo-600 uppercase text-[8px] font-black">PCI-DSS Secure</Badge>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                               <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-indigo-100">
                                  <div className="flex items-center gap-4">
                                     <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ShieldCheck className="h-6 w-6" /></div>
                                     <div><p className="text-[10px] font-black uppercase text-[#213147]">Status: {venueData?.payoutsEnabled ? 'Live' : 'Onboarding'}</p><p className="text-[8px] font-bold text-indigo-600 uppercase">Payouts Settlement: Direct to Bank</p></div>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={handleVerifyStripe} disabled={isVerifyingStripe} className="text-[9px] font-black uppercase border-2">{isVerifyingStripe ? <Loader2 className="animate-spin" /> : "Run Diagnostic"}</Button>
                               </div>
                               {verificationResult && <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed text-center"><p className="text-[8px] font-black uppercase text-indigo-600">{verificationResult.businessName}: {verificationResult.status}</p></div>}
                            </CardContent>
                         </Card>

                         <Card className="border-2">
                            <CardHeader className="bg-slate-50/50 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest">Venue Profile</CardTitle></CardHeader>
                            <CardContent className="p-6">
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Official Name</Label><Input value={seller?.courseName} className="border-2 font-bold h-10" /></div>
                                  <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Tax Rate (%)</Label><Input value={seller?.taxRate} className="border-2 font-bold h-10" /></div>
                               </div>
                               <Button className="w-full mt-6 bg-[#213147] font-black uppercase tracking-widest h-12 text-[10px]">Update Master Registry</Button>
                            </CardContent>
                         </Card>
                      </div>
                   </div>
                </div>
              )}

            </div>
          </ScrollArea>
        </main>

        {/* PERSISTENT DESKTOP SIDEBAR - ANCHORED RIGHT */}
        <aside className={cn(
          "bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-l-4 border-primary/20 shrink-0 shadow-2xl z-20",
          sidebarOpen ? "w-64" : "w-20"
        )}>
          <SideBarContent />
        </aside>
      </div>

      {/* ITEM DIALOG */}
      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="rounded-[2.5rem] border-2 max-w-xl">
           <DialogHeader>
              <DialogTitle className="font-headline font-black uppercase text-[#213147]">
                {editingItem ? 'Edit Master Record' : 'New Inventory Item'}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase text-muted-foreground">
                Configure global item properties and service availability
              </DialogDescription>
           </DialogHeader>
           <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-6 pt-4">
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={itemForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Display Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={itemForm.control} name="category" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={itemForm.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">{"Price ($)"}</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} className="h-11 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Image URL</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Active Channels</Label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border-2">
                       {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => (
                         <FormField key={mode} control={itemForm.control} name="availableOn" render={({ field }) => (
                           <FormItem className="flex items-center space-x-2 space-y-0">
                             <FormControl><Checkbox checked={field.value?.includes(mode)} onCheckedChange={(c) => c ? field.onChange([...field.value, mode]) : field.onChange(field.value.filter(v => v !== mode))} /></FormControl>
                             <FormLabel className="text-[9px] font-black uppercase cursor-pointer">{mode}</FormLabel>
                           </FormItem>
                         )} />
                       ))}
                    </div>
                 </div>
                 <Button type="submit" className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-xs shadow-xl">{editingItem ? 'Update Registry' : 'Add to Inventory'}</Button>
              </form>
           </Form>
        </DialogContent>
      </Dialog>

      {/* STAFF DIALOG */}
      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="rounded-[2.5rem] border-2 max-w-md">
           <DialogHeader><DialogTitle className="font-headline font-black uppercase text-[#213147]">{editingStaff ? 'Edit Credentials' : 'New Personnel'}</DialogTitle></DialogHeader>
           <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6 pt-4">
                 <FormField control={staffForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Full Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold uppercase" /></FormControl></FormItem>)} />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={staffForm.control} name="role" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Driver">Driver (BevCart)</SelectItem><SelectItem value="Server">Server (Clubhouse)</SelectItem><SelectItem value="Manager">Manager</SelectItem></SelectContent></Select></FormItem>)} />
                    <FormField control={staffForm.control} name="pin" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">4-Digit PIN</FormLabel><FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-mono text-xl font-black text-center tracking-[0.5em] text-primary" /></FormControl></FormItem>)} />
                 </div>
                 <Button type="submit" className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-xs">Save Registry</Button>
              </form>
           </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
