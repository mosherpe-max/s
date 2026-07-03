'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  updateDoc, 
  serverTimestamp, 
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Zap,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
  Plus,
  Edit,
  Loader2,
  LogOut,
  ShieldCheck,
  Clock,
  DollarSign,
  ShoppingBag,
  Save,
  Library,
  Power,
  ExternalLink,
  Truck,
  Building,
  Tags,
  Sparkles,
  Wand2,
  ShieldAlert,
  PanelLeft,
  ChevronRightSquare,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Download,
  Calendar as CalendarIcon,
  QrCode,
  FileText,
  LucideImage,
  Share2,
  Presentation,
  Filter,
  X,
  Package,
  Menu
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { isToday, format, subDays } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, ModifierGroup } from '@/lib/types';
import { signOut } from 'firebase/auth';
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
  Cell
} from 'recharts';

// --- SCHEMAS ---

const staffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(['Staff', 'Manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'Numbers only'),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

const itemSchema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().default(''),
  price: z.coerce.number().min(0),
  category: z.string().min(1, 'Category required'),
  isAvailable: z.boolean().default(true),
  availableOn: z.array(z.string()).default([]),
  featuredOn: z.array(z.string()).default([]),
  modifierGroupIds: z.array(z.string()).default([]),
});

type ItemFormData = z.infer<typeof itemSchema>;

const modifierGroupSchema = z.object({
  name: z.string().min(2, 'Group name required'),
  minSelection: z.coerce.number().min(0),
  maxSelection: z.coerce.number().min(1),
  options: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Option name required'),
    priceAdjustment: z.coerce.number().min(0),
    isAvailable: z.boolean().default(true),
  })).min(1, 'At least one option required'),
});

type ModifierGroupFormData = z.infer<typeof modifierGroupSchema>;

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative text-left",
        active ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? "text-primary" : "")}>{label}</span>}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-2 pt-5 px-6">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5 px-6 text-left">
        <div className="text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

// --- MAIN PAGE ---

export default function VenueAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filtering & Search
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDateRange, setOrderDateRange] = useState<'today' | '7days' | '30days' | 'all'>('today');

  // Dialog States
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isStarterMenuConfirmOpen, setIsStarterMenuConfirmOpen] = useState(false);
  const [isStarterItemsConfirmOpen, setIsStarterItemsConfirmOpen] = useState(false);

  // Processing States
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isApplyingStarter, setIsApplyingStarter] = useState(false);
  const [isApplyingStarterItems, setIsApplyingStarterItems] = useState(false);

  // --- DATA FETCHING ---

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modifierGroupsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: modifierGroups } = useCollection<ModifierGroup>(modifierGroupsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffQuery);

  // --- ANALYTICS LOGIC (Focused on Net Sales, excluding Koop fees) ---

  const analyticsData = useMemo(() => {
    if (!orders) return { dailyRevenue: [], topItems: [], channelSplit: [] };

    const dailyMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const key = format(date, 'MMM d');
      dailyMap.set(key, 0);
    }

    orders.forEach(o => {
      if (!o.createdAt || o.status === 'Cancelled') return;
      const key = format(o.createdAt.toDate(), 'MMM d');
      if (dailyMap.has(key)) {
        // Use subtotal (Net Sales) instead of total (Gross with fees)
        dailyMap.set(key, dailyMap.get(key) + (o.subtotal || 0));
      }
    });

    const dailyRevenue = Array.from(dailyMap.entries()).map(([name, total]) => ({ name, total }));

    const channelMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'Cancelled') {
        channelMap[o.menuType] = (channelMap[o.menuType] || 0) + 1;
      }
    });
    const channelSplit = Object.entries(channelMap).map(([name, value]) => ({ name, value }));

    const itemMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'Cancelled') {
        o.items.forEach(i => {
          itemMap[i.name] = (itemMap[i.name] || 0) + i.quantity;
        });
      }
    });
    const topItems = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { dailyRevenue, channelSplit, topItems };
  }, [orders]);

  const stats = useMemo(() => { 
    if (!orders) return null; 
    const today = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()) && o.status !== 'Cancelled'); 
    const revenue = today.reduce((acc, o) => acc + (o.subtotal || 0), 0); 
    const activeCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    return { 
      revenue: revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
      active: activeCount, 
      volume: today.length,
      staffOn: staffList?.filter(s => s.lastActive && isToday(s.lastActive.toDate())).length || 0
    }; 
  }, [orders, staffList]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let list = orders;

    if (orderSearchTerm) {
      const s = orderSearchTerm.toLowerCase();
      list = list.filter(o => 
        o.customerName.toLowerCase().includes(s) || 
        o.id.toLowerCase().includes(s) ||
        o.customerPhone.includes(s)
      );
    }

    if (orderDateRange !== 'all') {
      const now = new Date();
      list = list.filter(o => {
        if (!o.createdAt) return false;
        const d = o.createdAt.toDate();
        if (orderDateRange === 'today') return isToday(d);
        if (orderDateRange === '7days') return d >= subDays(now, 7);
        if (orderDateRange === '30days') return d >= subDays(now, 30);
        return true;
      });
    }

    return [...list].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [orders, orderSearchTerm, orderDateRange]);

  // --- ACTIONS ---

  const handleApplyStarterMenu = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsApplyingStarter(true);
    try {
      const type = seller?.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyStarter = httpsCallable(functions, 'applyStarterMenu');
      await applyStarter({ venueId: sellerId, venueType: type });
      toast({ title: "Modifiers Provisioned" });
      setIsStarterMenuConfirmOpen(false);
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Setup Failed", description: error.message }); 
    } finally { setIsApplyingStarter(false); }
  };

  const handleApplyStarterItems = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsApplyingStarterItems(true);
    try {
      const type = seller?.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyItems = httpsCallable(functions, 'applyStarterItems');
      await applyItems({ venueId: sellerId, venueType: type });
      toast({ title: "Menu Items Provisioned" });
      setIsStarterItemsConfirmOpen(false);
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Setup Failed", description: error.message }); 
    } finally { setIsApplyingStarterItems(false); }
  };

  const handleImpersonate = (mode: string) => {
    localStorage.setItem('koop_staff_id', `admin-${user?.uid}`);
    localStorage.setItem('koop_staff_name', `${user?.email?.split('@')[0]} (Admin)`);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    setTimeout(() => {
      if (mode === 'Beverage Cart') router.push(`/sellers/${sellerId}/bevcart`);
      else if (mode === 'Clubhouse') router.push(`/sellers/${sellerId}/clubhouse`);
      else if (mode === 'Lane Delivery') router.push(`/sellers/${sellerId}/laneside`);
    }, 500);
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  // --- FORMS ---

  const staffForm = useForm<StaffFormData>({ 
    resolver: zodResolver(staffSchema), 
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true } 
  });

  const itemForm = useForm<ItemFormData>({ 
    resolver: zodResolver(itemSchema), 
    defaultValues: { name: '', description: '', price: 0, category: 'Other', isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] } 
  });

  const modifierGroupForm = useForm<ModifierGroupFormData>({ 
    resolver: zodResolver(modifierGroupSchema), 
    defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] } 
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: modifierGroupForm.control, name: "options" });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', id), { ...data, id, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true });
    setIsStaffFormOpen(false);
    setIsProcessingSave(false);
    toast({ title: editingStaff ? "Staff Updated" : "Staff Added" });
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "modifiers", label: "Modifiers", icon: Tags },
    { id: "staff", label: "Staff", icon: Users },
    { id: "marketing", label: "Marketing", icon: Smartphone },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  const NavContent = () => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <NavButton 
          key={item.id} 
          id={item.id} 
          label={item.label} 
          icon={item.icon} 
          active={activeNav === item.id} 
          onClick={(id) => { setActiveNav(id); setMobileMenuOpen(false); }} 
          sidebarOpen={sidebarOpen || isMobile} 
        />
      ))}
    </nav>
  );

  if (isUserLoading || isSellerLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-x-auto text-left">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={mobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6 text-[#213147]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#213147] border-0 p-0 text-white">
              <SheetHeader className="p-6 border-b border-white/5 text-left">
                <StylizedKoopLogo size="md" />
                <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Venue Control</SheetTitle>
              </SheetHeader>
              <div className="p-4 text-left"><NavContent /></div>
            </SheetContent>
          </Sheet>
          <StylizedKoopLogo size="sm" colorClass="text-[#213147]" />
          <div className="flex flex-col text-left">
            <h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1 truncate max-w-[200px]">{seller?.courseName}</h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Establishment Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="hidden sm:flex text-[8px] font-black uppercase tracking-widest bg-slate-50">
            {seller?.type}
          </Badge>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            {sidebarOpen && <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Navigation</p>}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">
              {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
             <NavContent />
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative">
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-6xl mx-auto space-y-8 pb-24 text-left min-w-0">
              
              {activeNav === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard label="Net Revenue" value={`$${stats?.revenue}`} sub="Excluding Platform Fees" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Active Tickets" value={stats?.active || 0} sub="Pending Delivery" icon={Clock} colorClass="bg-primary" />
                    <KPICard label="Today's Volume" value={stats?.volume || 0} sub="Orders Processed" icon={ShoppingBag} colorClass="bg-indigo-600" />
                    <KPICard label="Staff Active" value={stats?.staffOn || 0} sub="On-Shift (Today)" icon={Users} colorClass="bg-slate-700" />
                  </div>

                  <Card className="border-2 shadow-md overflow-hidden">
                    <CardHeader className="bg-[#213147] text-white py-5 border-b">
                      <div className="flex items-center gap-3">
                        <Power className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Service Control Terminal</CardTitle>
                          <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Activate fulfillment channels and monitor signals</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(m => seller?.menuTypes?.includes(m)).map(mode => {
                          const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                          const isActive = !!(seller as any)?.[fieldMap[mode]];
                          return (
                            <div key={mode} className={cn("p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 relative group", isActive ? "border-primary bg-primary/5 shadow-inner" : "bg-slate-50 opacity-60 grayscale")}>
                              <div className={cn("p-3 rounded-2xl transition-all shadow-lg", isActive ? "bg-primary text-white scale-110" : "bg-slate-200 text-slate-400")}><Zap className="h-6 w-6" /></div>
                              <div className="text-center"><p className="text-[11px] font-black uppercase tracking-widest text-[#213147]">{mode}</p><Badge variant="outline" className={cn("mt-2 text-[8px] font-black uppercase", isActive ? "border-primary/30 text-primary bg-white" : "border-slate-200 text-slate-400")}>{isActive ? "LIVE SIGNAL" : "INACTIVE"}</Badge></div>
                              <Button variant="outline" size="sm" className="h-9 w-full rounded-xl text-[10px] font-black uppercase border-2 shadow-sm" onClick={() => handleImpersonate(mode)}>Enter Channel</Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                    <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Sales Performance</h3>
                    <Button variant="outline" className="h-11 border-2 font-black uppercase text-[10px] gap-2"><Download className="h-4 w-4" /> Export Report</Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-2 p-8 space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><TrendingUp className="h-3 w-3 text-primary" /> Net Revenue Trend (7 Days)</h4>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                            <ChartTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: '2px solid #f1f5f9' }} />
                            <Bar dataKey="total" fill="#E50000" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="border-2 p-6 space-y-6"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Top Items by Qty</h4><div className="space-y-4">{analyticsData.topItems.map((item, idx) => (<div key={item.name} className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-[10px] font-black text-white bg-[#213147] h-5 w-5 rounded flex items-center justify-center">{idx + 1}</span><span className="text-xs font-bold uppercase truncate max-w-[120px]">{item.name}</span></div><span className="text-xs font-black text-primary">{item.count}</span></div>))}</div></Card>
                      <Card className="border-2 p-6 space-y-6"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Order Distribution</h4><div className="h-[180px] flex items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analyticsData.channelSplit} innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">{analyticsData.channelSplit.map((_, index) => (<Cell key={`cell-${index}`} fill={['#E50000', '#213147', '#4F46E5', '#0891B2'][index % 4]} />))}</Pie><ChartTooltip /></PieChart></ResponsiveContainer></div></Card>
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-6 gap-4">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Fulfillment Log</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monitor establishment queue and history</p></div>
                    <div className="flex flex-wrap gap-2 items-center">
                       <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search orders..." className="pl-10 h-10 border-2 rounded-xl text-xs w-64" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} /></div>
                       <Select value={orderDateRange} onValueChange={(v: any) => setOrderDateRange(v)}><SelectTrigger className="h-10 border-2 rounded-xl w-40 text-[10px] font-black uppercase tracking-widest"><CalendarIcon className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="7days">Last 7 Days</SelectItem><SelectItem value="30days">Last 30 Days</SelectItem><SelectItem value="all">All Time</SelectItem></SelectContent></Select>
                    </div>
                  </div>
                  <div className="border-2 rounded-[2.5rem] overflow-x-auto bg-white shadow-sm">
                    <Table><TableHeader className="bg-slate-50"><TableRow><TableHead className="text-[10px] font-black uppercase h-14 px-8">Ticket</TableHead><TableHead className="text-[10px] font-black uppercase h-14">Customer</TableHead><TableHead className="text-[10px] font-black uppercase h-14">Channel</TableHead><TableHead className="text-[10px] font-black uppercase h-14">Items</TableHead><TableHead className="text-[10px] font-black uppercase h-14 text-right px-8">Status</TableHead></TableRow></TableHeader><TableBody>{filteredOrders.map(o => (<TableRow key={o.id}><TableCell className="px-8 py-5"><p className="font-mono font-black text-xs">#{o.id.slice(-5).toUpperCase()}</p><p className="text-[9px] text-muted-foreground uppercase mt-0.5">{o.createdAt ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}</p></TableCell><TableCell><p className="font-bold text-sm text-[#213147]">{o.customerName}</p><p className="text-[9px] text-muted-foreground uppercase">{o.customerPhone}</p></TableCell><TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">{o.menuType}</Badge></TableCell><TableCell><p className="text-xs font-medium text-slate-600 line-clamp-1">{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p></TableCell><TableCell className="text-right px-8"><Badge className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full", o.status === 'Delivered' ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700")}>{o.status}</Badge></TableCell></TableRow>))}</TableBody></Table>
                  </div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-4">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Menu Item Library</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Provision and manage products</p></div>
                    <div className="flex gap-2">
                       <Button onClick={() => setIsStarterItemsConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] gap-2"><Library className="h-4 w-4 text-indigo-600" /> Apply Starter Items</Button>
                       <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} className="bg-primary h-12 px-6 font-black uppercase text-[10px] gap-2 shadow-xl"><Plus className="h-4 w-4" /> Add Item</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {menuItems?.map(item => (
                      <Card key={item.id} className="border-2 shadow-sm group bg-white relative text-left">
                        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-start justify-between space-y-0">
                          <div className="space-y-0.5 text-left"><p className="font-black text-xs uppercase text-[#213147] truncate max-w-[140px]">{item.name}</p><p className="text-[10px] font-bold text-primary font-mono">${item.price.toFixed(2)}</p></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100" onClick={() => { setEditingItem(item); itemForm.reset(item as any); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3"><p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{item.description || 'No description.'}</p><div className="flex flex-wrap gap-1">{item.availableOn?.map(m => (<Badge key={m} variant="secondary" className="text-[7px] px-1 h-3.5 border-0 uppercase">{m.split(' ')[0]}</Badge>))}</div></CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'modifiers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-4">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Modifier Groups</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Establishment customization sets</p></div>
                    <div className="flex gap-2">
                       <Button onClick={() => setIsStarterMenuConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] gap-2"><Tags className="h-4 w-4 text-indigo-600" /> Apply Starter Modifiers</Button>
                       <Button onClick={() => { setEditingModifierGroup(null); modifierGroupForm.reset(); setIsModifierGroupFormOpen(true); }} className="bg-indigo-600 h-12 px-6 font-black uppercase text-[10px] gap-2 shadow-xl"><Plus className="h-4 w-4" /> Add Modifier Set</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modifierGroups?.map(group => (
                      <Card key={group.id} className="border-2 shadow-sm group bg-white text-left">
                        <CardHeader className="p-5 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                          <div className="space-y-1 text-left"><p className="font-black text-xs uppercase text-[#213147]">{group.name}</p><div className="flex items-center gap-2"><Badge className="text-[7px] font-black bg-indigo-100 text-indigo-700 uppercase h-3.5 px-1">{group.minSelection > 0 ? 'Required' : 'Optional'}</Badge><span className="text-[9px] font-bold text-muted-foreground uppercase">Min {group.minSelection} / Max {group.maxSelection}</span></div></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100" onClick={() => { setEditingModifierGroup(group); modifierGroupForm.reset(group as any); setIsModifierGroupFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-5 flex flex-wrap gap-2">{group.options.map((opt, idx) => (<Badge key={idx} variant="outline" className="text-[9px] font-bold uppercase border-slate-100 bg-white">{opt.name} {opt.priceAdjustment > 0 && <span className="text-primary ml-1">+${opt.priceAdjustment.toFixed(2)}</span>}</Badge>))}</CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Staff Directory</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage personnel and access PINs</p></div>
                    <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-indigo-600 h-12 px-6 font-black uppercase text-[10px] shadow-xl"><Plus className="h-4 w-4" /> Add Staff</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staffList?.map(s => (
                      <Card key={s.id} className="border-2 shadow-sm group bg-white overflow-hidden text-left">
                        <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4 relative">
                          <div className="bg-slate-100 p-3 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-colors"><Users className="h-6 w-6" /></div>
                          <div className="text-left"><p className="font-black text-sm uppercase text-[#213147]">{s.name}</p><Badge variant="secondary" className="text-[8px] font-black uppercase mt-1">{s.role}</Badge></div>
                          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => { setEditingStaff(s); staffForm.reset(s as any); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                           <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between"><div className="space-y-0.5 text-left"><p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Secure PIN</p><p className="text-sm font-black font-mono tracking-[0.3em]">{s.pin}</p></div><Badge className={cn("text-[8px] font-black uppercase px-2 h-4", s.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>{s.isActive ? 'Active' : 'Inactive'}</Badge></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'marketing' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Growth & Collateral</h3></div>
                  <Card className="border-2 shadow-sm p-8 text-left">
                     <div className="space-y-8">
                        <div className="flex items-center gap-4"><div className="bg-indigo-50 p-4 rounded-[2rem] text-indigo-600 border-2"><QrCode className="h-8 w-8" /></div><div className="text-left"><h4 className="font-headline font-black text-xl uppercase">QR Terminal</h4><p className="text-xs text-muted-foreground">Download location-aware QR codes for placement at lanes or on carts.</p></div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                           {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(m => seller?.menuTypes?.includes(m)).map(mode => (
                             <div key={mode} className="p-6 bg-slate-50 border-2 rounded-[2rem] flex flex-col items-center gap-4 group hover:border-primary transition-all">
                                <div className="bg-white p-3 rounded-2xl border-2 shadow-sm group-hover:scale-105 transition-transform"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}/sellers/${sellerId}/order?menuType=${encodeURIComponent(mode)}`} alt={`${mode} QR`} className="w-24 h-24" /></div>
                                <div className="text-center"><p className="text-[10px] font-black uppercase text-[#213147]">{mode}</p><Button variant="ghost" size="sm" className="h-8 mt-2 text-[8px] font-black uppercase text-primary gap-1"><Download className="h-3 w-3" /> Download</Button></div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </Card>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Establishment Settings</h3><Button onClick={() => { if (seller) { updateDoc(doc(firestore!, 'sellers', sellerId), { updatedAt: serverTimestamp() }).then(() => toast({ title: "Settings Updated" })); } }} className="bg-primary h-12 px-6 font-black uppercase text-[10px] shadow-xl"><Save className="h-4 w-4" /> Save All Changes</Button></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-2 shadow-sm p-8 space-y-8 text-left">
                       <div className="space-y-6"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4" /> Core Identity</h4><div className="grid gap-6"><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Official Establishment Name</Label><Input defaultValue={seller?.courseName} onChange={(e) => updateDoc(doc(firestore!, 'sellers', sellerId), { courseName: e.target.value })} className="h-12 border-2 font-bold" /></div><div className="grid grid-cols-2 gap-6"><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Establishment Type</Label><Select defaultValue={seller?.type} onValueChange={(v) => updateDoc(doc(firestore!, 'sellers', sellerId), { type: v })}><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Public Golf Course">Public Golf Course</SelectItem><SelectItem value="Private Golf Course">Private Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></div><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Current Status</Label><div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border-2 h-12"><Switch checked={seller?.status === 'Active'} onCheckedChange={(v) => updateDoc(doc(firestore!, 'sellers', sellerId), { status: v ? 'Active' : 'Inactive' })} /><span className="text-[10px] font-black uppercase">{seller?.status}</span></div></div></div></div></div>
                       <Separator /><div className="space-y-6"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Logistics Base</h4><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Street Address</Label><Input defaultValue={seller?.streetAddress} className="h-12 border-2 font-bold" /></div></div>
                    </Card>
                    <Card className="border-2 shadow-sm p-8 space-y-8 text-left">
                       <div className="space-y-6"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financials & Payouts</h4><div className="grid grid-cols-1 gap-6"><div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Tax Rate (%)</Label><Input type="number" defaultValue={seller?.taxRate} onChange={(e) => updateDoc(doc(firestore!, 'sellers', sellerId), { taxRate: parseFloat(e.target.value) })} className="h-12 border-2 font-bold" /></div></div><div className="p-6 bg-slate-50 border-2 rounded-2xl flex items-center justify-between gap-6"><div className="space-y-1 text-left"><p className="text-[11px] font-black uppercase text-[#213147]">Stripe Connect Status</p><p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">Integrated for distribution</p></div><Badge className="bg-green-100 text-green-700 font-black border-0 px-3 py-1">Verified</Badge></div><div className="bg-muted/30 p-4 rounded-xl border border-dashed text-center"><p className="text-[8px] font-bold text-muted-foreground uppercase leading-relaxed">Platform convenience fees are managed exclusively by Koop Administrators.</p></div></div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* --- FORMS & DIALOGS --- */}

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingStaff ? 'Edit Personnel' : 'Add Personnel'}</DialogTitle></DialogHeader>
          <div className="p-8"><Form {...staffForm}><form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6"><FormField control={staffForm.control} name="name" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Full Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={staffForm.control} name="role" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Staff">Fulfillment Staff</SelectItem><SelectItem value="Manager">Venue Manager</SelectItem></SelectContent></Select></FormItem>)} /><FormField control={staffForm.control} name="pin" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">4-Digit PIN</FormLabel><FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-bold font-mono tracking-widest text-center" /></FormControl></FormItem>)} /></div><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Personnel</Button></form></Form></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Menu Item</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]"><div className="p-8"><Form {...itemForm}><form onSubmit={itemForm.handleSubmit(async (d) => { setIsProcessingSave(true); const id = editingItem?.id || Math.random().toString(36).substr(2, 9); await setDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', id), { ...d, id, rank: editingItem?.rank || 99 }, { merge: true }); setIsItemFormOpen(false); setIsProcessingSave(false); toast({ title: "Item Saved" }); })} className="space-y-6"><FormField control={itemForm.control} name="name" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Item Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={itemForm.control} name="price" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Price ($)</FormLabel><FormControl><Input {...field} type="number" step="0.01" className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={itemForm.control} name="category" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>)} /></div><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Item</Button></form></Form></div></ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isModifierGroupFormOpen} onOpenChange={setIsModifierGroupFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Modifier Set</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]"><div className="p-8"><Form {...modifierGroupForm}><form onSubmit={modifierGroupForm.handleSubmit(async (d) => { setIsProcessingSave(true); const id = editingModifierGroup?.id || Math.random().toString(36).substr(2, 9); await setDoc(doc(firestore!, 'modifier_groups', id), { ...d, id, sellerId, updatedAt: serverTimestamp() }, { merge: true }); setIsModifierGroupFormOpen(false); setIsProcessingSave(false); toast({ title: "Modifier Group Saved" }); })} className="space-y-6"><div className="grid grid-cols-3 gap-4"><FormField control={modifierGroupForm.control} name="name" render={({ field }) => (<FormItem className="col-span-1 text-left"><FormLabel className="text-[10px] font-black uppercase">Group Name</FormLabel><FormControl><Input {...field} className="h-10 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={modifierGroupForm.control} name="minSelection" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Min</FormLabel><FormControl><Input {...field} type="number" className="h-10 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={modifierGroupForm.control} name="maxSelection" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Max</FormLabel><FormControl><Input {...field} type="number" className="h-10 border-2 font-bold" /></FormControl></FormItem>)} /></div><div className="space-y-3"><div className="flex justify-between items-center px-1"><Label className="text-[10px] font-black uppercase text-indigo-600">Options</Label><Button type="button" variant="ghost" size="sm" onClick={() => appendOption({ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true })} className="text-[9px] font-black uppercase gap-1.5"><Plus className="h-3 w-3" /> Add</Button></div>{optionFields.map((field, index) => (<div key={field.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border-2"><FormField control={modifierGroupForm.control} name={`options.${index}.name`} render={({ field }) => (<FormItem className="flex-1 text-left"><FormControl><Input {...field} placeholder="Option Name" className="h-10 border-2 font-bold bg-white" /></FormControl></FormItem>)} /><FormField control={modifierGroupForm.control} name={`options.${index}.priceAdjustment`} render={({ field }) => (<FormItem className="w-24 text-left"><FormControl><Input {...field} type="number" step="0.01" className="h-10 border-2 font-bold bg-white" /></FormControl></FormItem>)} /><Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-10 w-10 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></div>))}</div><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">Save Modifier Set</Button></form></Form></div></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modals */}
      <Dialog open={isStarterMenuConfirmOpen} onOpenChange={setIsStarterMenuConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-indigo-600 text-white text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Modifiers</DialogTitle></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase leading-relaxed">This will provision standard industry customizations (Doneness, Cheese, Toppings, etc.) into your library.</p><Button onClick={handleApplyStarterMenu} disabled={isApplyingStarter} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarter ? <Loader2 className="animate-spin" /> : <Wand2 className="h-5 w-5" />} Confirm & Apply</Button></div></DialogContent>
      </Dialog>
      <Dialog open={isStarterItemsConfirmOpen} onOpenChange={setIsStarterItemsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-indigo-600 text-white text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Menu</DialogTitle></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase leading-relaxed">This will populate your menu with ~30 industry-standard items and automatically link them to modifiers.</p><Button onClick={handleApplyStarterItems} disabled={isApplyingStarterItems} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarterItems ? <Loader2 className="animate-spin" /> : <Sparkles className="h-5 w-5" />} Confirm & Populate</Button></div></DialogContent>
      </Dialog>
    </div>
  );
}
