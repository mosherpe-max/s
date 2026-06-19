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
  Settings as SettingsIcon,
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
  Target,
  Filter,
  MousePointer2,
  Map as MapIcon,
  Timer,
  Save,
  Calendar,
  FileText,
  Eye,
  EyeOff,
  Globe,
  Database,
  SearchCode,
  UserCircle,
  Key,
  UserPlus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
import { Label } from '@/components/ui/label';
import { cn, getNumericOrderId, SUPER_ADMIN_ID } from '@/lib/utils';
import { 
  isThisMonth, 
  isToday, 
  format, 
  startOfHour, 
  eachHourOfInterval, 
  subHours, 
  differenceInMinutes, 
  startOfMonth, 
  endOfDay, 
  isWithinInterval, 
  startOfDay, 
  addHours, 
  isSameHour, 
  isSameDay, 
  eachDayOfInterval, 
  startOfYear, 
  addMonths, 
  isSameMonth, 
  isSameYear 
} from 'date-fns';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapView } from '@/components/map-view';
import { OrderCard } from '@/components/order-card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
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

import type { MenuItem, Seller, Order, StaffMember, Venue, PlatformConfig, SellerAdminRole, Category } from '@/lib/types';
import { categories } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- CONSTANTS ---

const DEFAULT_THRESHOLDS: Record<string, { warning: number; max: number }> = {
  'Beverage Cart': { warning: 10, max: 15 },
  'Clubhouse': { warning: 15, max: 20 },
  'Lane Delivery': { warning: 10, max: 15 },
  'Take Out': { warning: 15, max: 25 }
};

const MODE_COLORS: Record<string, string> = {
  'Beverage Cart': '#E50000',
  'Clubhouse': '#213147',
  'Lane Delivery': '#EC4899',
  'Take Out': '#F59E0B'
};

const PIE_COLORS = ['#E50000', '#213147', '#4F46E5', '#F59E0B', '#10B981'];

// --- DND COMPONENTS ---

function SortableMenuItem({ 
  item, 
  isSelected, 
  onToggleChannel, 
  onToggleAvailability 
}: { 
  item: MenuItem, 
  isSelected: boolean, 
  onToggleChannel: () => void,
  onToggleAvailability: () => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isGloballyAvailable = item.isAvailable !== false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-white border-2 rounded-xl transition-all",
        isSelected 
          ? "border-primary/40 bg-primary/5 shadow-md ring-2 ring-primary/5" 
          : "border-slate-100 opacity-50 grayscale",
        !isGloballyAvailable && "border-red-100 bg-red-50/30 grayscale-0"
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className={cn(
          "cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded-lg shrink-0",
          (!isSelected || !isGloballyAvailable) && "pointer-events-none opacity-20"
        )}
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-[11px] uppercase text-[#213147] truncate leading-tight">{item.name}</p>
          {!isGloballyAvailable && (
            <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase border-0">86'D</Badge>
          )}
        </div>
        <p className="text-[10px] text-primary font-bold font-mono mt-0.5">${item.price.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[7px] font-black text-slate-400 uppercase">Stock</span>
          <Switch 
            checked={isGloballyAvailable} 
            onCheckedChange={onToggleAvailability}
            onPointerDown={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-green-600 scale-75"
          />
        </div>

        <div className="flex items-center gap-2">
           <span className="text-[7px] font-black text-slate-400 uppercase">Live</span>
           <Switch 
            checked={isSelected} 
            onCheckedChange={onToggleChannel}
            onPointerDown={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary scale-75"
          />
        </div>
      </div>
    </div>
  );
}

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-4 sm:py-3 rounded-xl transition-all duration-200 group relative text-left",
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
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
      )}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass, highlight = false }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string, highlight?: boolean }) {
  return (
    <Card className={cn("border-2 shadow-sm overflow-hidden relative h-full transition-all", highlight ? "border-primary/20 ring-4 ring-primary/5" : "")}>
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-1 pt-3 px-3 sm:px-4">
        <CardDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-2.5 w-2.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 px-3 sm:px-4">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-headline tracking-tighter text-[#213147] mb-0.5">{value}</div>
        <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase leading-none">{sub}</p>
      </CardContent>
    </Card>
  );
}

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
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  category: z.enum(categories as any),
  imageUrl: z.string().optional(),
  availableOn: z.array(z.string()).default([]),
  featuredOn: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
});

type ItemFormData = z.infer<typeof itemSchema>;

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
  const [isMounted, setIsMounted] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState('All');
  const [analyticsRange, setAnalyticsRange] = useState<'Today' | 'MTD' | 'YTD'>('Today');
  const [pieMonthFilter, setPieMonthFilter] = useState('All');
  const [now, setNow] = useState<number>(Date.now());

  // Operational State
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [configMode, setConfigMode] = useState<string>('Beverage Cart');

  // Analytics Detailed Filter State
  const [reportStartDate, setReportStartDate] = useState<string>(format(subHours(new Date(), 24), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reportModeFilter, setReportModeFilter] = useState<string>('All');

  // Settings State
  const [venueThresholds, setVenueThresholds] = useState<Record<string, { warning: number; max: number }>>({});
  const [venueName, setVenueName] = useState('');
  const [venueTaxRate, setVenueTaxRate] = useState(0);

  useEffect(() => { 
    setIsMounted(true); 
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const sellerRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId, user]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, user]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, user]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId, user]);
  const { data: staff } = useCollection<StaffMember>(staffQuery);

  const venueDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId, user]);
  const { data: venueData, isLoading: isVenueLoading } = useDoc<Venue>(venueDocRef);

  const sellerRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole, isLoading: isRoleLoading } = useDoc<SellerAdminRole>(sellerRoleRef);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  const isAuthorized = isSuperAdmin || (sellerRole?.sellerId === sellerId) || (venueData?.ownerUid === user?.uid);

  useEffect(() => {
    if (seller) {
      setVenueName(seller.courseName || '');
      setVenueTaxRate(seller.taxRate || 0);
      setVenueThresholds({ ...DEFAULT_THRESHOLDS, ...(seller.orderThresholds || {}) });
      if (seller.menuTypes && seller.menuTypes.length > 0 && !seller.menuTypes.includes(configMode)) {
        setConfigMode(seller.menuTypes[0]);
      }
    }
  }, [seller]);

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true }
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', price: 0, category: 'Snacks', availableOn: [], featuredOn: [], isAvailable: true }
  });

  const stats = useMemo(() => {
    if (!orders) return null;
    const filteredOrders = dashboardFilter === 'All' ? orders : orders.filter(o => o.menuType === dashboardFilter);
    const today = filteredOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && isToday(o.createdAt.toDate()));
    const revenue = today.reduce((acc, o) => acc + (o.total || 0), 0);
    const fees = today.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
    const overdueCount = filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.createdAt && typeof o.createdAt.toDate === 'function' && differenceInMinutes(new Date(), o.createdAt.toDate()) >= (seller?.orderThresholds?.[o.menuType]?.max || DEFAULT_THRESHOLDS[o.menuType]?.max || 20)).length;
    return { revenue: revenue.toFixed(2), fees: fees.toFixed(2), active: filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length, volume: today.length, avg: today.length > 0 ? (revenue / today.length).toFixed(2) : '0.00', overdue: overdueCount };
  }, [orders, dashboardFilter, seller]);

  const analyticsData = useMemo(() => {
    if (!orders || !seller) return { chartData: [] };
    const modes = seller.menuTypes || [];
    const now = new Date();
    let chartData: any[] = [];
    if (analyticsRange === 'Today') {
      const start = startOfDay(now);
      chartData = Array.from({ length: 24 }, (_, i) => {
        const hour = addHours(start, i);
        const entry: any = { time: format(hour, 'ha') };
        modes.forEach(mode => {
          const matching = orders.filter(o => o.menuType === mode && o.createdAt && typeof o.createdAt.toDate === 'function' && isSameHour(o.createdAt.toDate(), hour) && isSameDay(o.createdAt.toDate(), now));
          entry[mode] = Math.round(matching.reduce((sum, o) => sum + o.total, 0));
          entry[`${mode}_count`] = matching.length;
        });
        return entry;
      });
    } else if (analyticsRange === 'MTD') {
      const start = startOfMonth(now);
      chartData = eachDayOfInterval({ start, end: now }).map(day => {
        const entry: any = { time: format(day, 'MMM d') };
        modes.forEach(mode => {
          const matching = orders.filter(o => o.menuType === mode && o.createdAt && typeof o.createdAt.toDate === 'function' && isSameDay(o.createdAt.toDate(), day));
          entry[mode] = Math.round(matching.reduce((sum, o) => sum + o.total, 0));
          entry[`${mode}_count`] = matching.length;
        });
        return entry;
      });
    } else {
      const start = startOfYear(now);
      chartData = Array.from({ length: now.getMonth() + 1 }, (_, i) => {
        const month = addMonths(start, i);
        const entry: any = { time: format(month, 'MMM') };
        modes.forEach(mode => {
          const matching = orders.filter(o => o.menuType === mode && o.createdAt && typeof o.createdAt.toDate === 'function' && isSameMonth(o.createdAt.toDate(), month) && isSameYear(o.createdAt.toDate(), now));
          entry[mode] = Math.round(matching.reduce((sum, o) => sum + o.total, 0));
          entry[`${mode}_count`] = matching.length;
        });
        return entry;
      });
    }
    return { chartData };
  }, [orders, seller, analyticsRange]);

  const pieChartData = useMemo(() => {
    if (!orders || !seller) return [];
    const filteredOrders = pieMonthFilter === 'All' ? orders : orders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && format(o.createdAt.toDate(), 'MMMM yyyy') === pieMonthFilter);
    return (seller.menuTypes || []).map(mode => {
      const modeOrders = filteredOrders.filter(o => o.menuType === mode);
      const revenue = modeOrders.reduce((sum, o) => sum + o.total, 0);
      return { name: mode, value: revenue, count: modeOrders.length, avg: modeOrders.length > 0 ? (revenue / modeOrders.length) : 0 };
    }).filter(d => d.count > 0);
  }, [orders, seller, pieMonthFilter]);

  const availableMonths = useMemo(() => {
    if (!orders) return [];
    const months = new Set<string>();
    orders.forEach(o => { if (o.createdAt && typeof o.createdAt.toDate === 'function') months.add(format(o.createdAt.toDate(), 'MMMM yyyy')); });
    return Array.from(months).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [orders]);

  const detailedReportOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;
    if (reportModeFilter !== 'All') filtered = filtered.filter(o => o.menuType === reportModeFilter);
    const start = startOfDay(new Date(reportStartDate)), end = endOfDay(new Date(reportEndDate));
    filtered = filtered.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && isWithinInterval(o.createdAt.toDate(), { start, end }));
    return [...filtered].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [orders, reportStartDate, reportEndDate, reportModeFilter]);

  const detailedReportStats = useMemo(() => ({ 
    revenue: detailedReportOrders.reduce((acc, o) => acc + (o.total || 0), 0), 
    volume: detailedReportOrders.length 
  }), [detailedReportOrders]);

  const handleSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const staffId = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', staffId);
    const payload = { ...data, id: staffId, updatedAt: serverTimestamp(), createdAt: editingStaff?.createdAt || serverTimestamp() };
    setDoc(staffRef, payload, { merge: true }).then(() => {
      toast({ title: editingStaff ? 'Staff Updated' : 'Staff Added' });
      setIsStaffFormOpen(false);
      setEditingStaff(null);
      staffForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: staffRef.path, operation: 'write', requestResourceData: payload } satisfies SecurityRuleContext));
    }).finally(() => setIsProcessingSave(false));
  };

  const handleDeleteStaff = async (id: string) => {
    if (!firestore || !sellerId) return;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', id);
    deleteDoc(staffRef).then(() => { toast({ title: "Staff Member Removed" }); }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: staffRef.path, operation: 'delete' } satisfies SecurityRuleContext));
    });
  };

  const handleToggleMode = async (mode: string, current: boolean) => {
    if (!firestore || !sellerId) return;
    const fieldMap: Record<string, string> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive', 'Take Out': 'takeoutActive' };
    const field = fieldMap[mode];
    if (field) {
      const sellerDocRef = doc(firestore, 'sellers', sellerId);
      const updateData = { [field]: !current };
      updateDoc(sellerDocRef, updateData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext));
      });
    }
  };

  const handleUpdateStatus = (orderId: string, current: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(current as any) + 1;
    if (nextIdx < stages.length) {
      const orderRef = doc(firestore, 'orders', orderId);
      const updateData = { status: stages[nextIdx], deliveredAt: stages[nextIdx] === 'Delivered' ? serverTimestamp() : null };
      updateDoc(orderRef, updateData).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: orderRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
      });
    }
  };

  const handleImpersonate = (mode: string) => {
    let path = '';
    switch (mode) {
      case 'Beverage Cart': path = `/sellers/${sellerId}/bevcart`; break;
      case 'Clubhouse': path = `/sellers/${sellerId}/clubhouse`; break;
      case 'Lane Delivery': path = `/sellers/${sellerId}/laneside`; break;
      case 'Take Out': path = `/sellers/${sellerId}/clubhouse`; break;
      default: return;
    }
    localStorage.setItem('koop_staff_id', 'admin-impersonate');
    localStorage.setItem('koop_staff_name', `Admin: ${seller?.courseName}`);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_venue_id', sellerId);
    toast({ title: `Entering ${mode} View` });
    router.push(path);
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "service", label: "Service Modes", icon: Zap },
    { id: "staff", label: "Staff", icon: Users },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "stripe", label: "Stripe Settings", icon: ShieldCheck },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "marketing", label: "Marketing", icon: Smartphone },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full bg-[#213147] overflow-hidden">
        <div className="p-6 border-b border-white/5 space-y-4 shrink-0">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar min-h-0">
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
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (isUserLoading || isSellerLoading || isVenueLoading || isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Securing Session...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white p-8 text-center">
        <div className="bg-red-500/10 p-6 rounded-[2.5rem] border-2 border-red-500/20 mb-8"><ShieldCheck className="h-16 w-16 text-red-500 mx-auto" /></div>
        <h2 className="font-headline text-3xl font-black uppercase tracking-tight mb-4">Access Restricted</h2>
        <p className="text-white/60 text-sm max-w-md mb-10 leading-relaxed font-medium">You are not authorized to manage this establishment's administration terminal.</p>
        <Button asChild className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-10 shadow-xl"><Link href="/login">Return to Gateway</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-primary/10 p-2 rounded-xl"><Target className="h-5 w-5 text-primary" /></div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black font-headline uppercase tracking-tight text-[#213147]">{NAV_ITEMS.find(n => n.id === activeNav)?.label}</h2>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-black border-indigo-100 bg-indigo-50 text-indigo-700 uppercase h-5 px-2">
                {seller?.courseName}
              </Badge>
            </div>
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
                <Button variant="ghost" size="icon" className="text-[#213147]"><LucideMenu className="h-6 w-6" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 bg-[#213147] border-l-4 border-primary/20">
                <SideBarContent forceLabels={true} />
              </SheetContent>
            </Sheet>
          )}
          <button onClick={() => router.push('/')} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0 shadow-2xl z-20", sidebarOpen ? "w-64" : "w-20")}>
          <SideBarContent />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-10 pb-24 text-left">
              
              {activeNav === 'dashboard' && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border-2 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Filter className="h-4 w-4" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Dashboard Filter</h3>
                    </div>
                    <Tabs value={dashboardFilter} onValueChange={setDashboardFilter} className="w-full sm:w-auto">
                      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                        <TabsList className="bg-slate-100 p-1 rounded-xl h-10 w-max min-w-full inline-flex">
                          <TabsTrigger value="All" className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">All Modes</TabsTrigger>
                          {seller?.menuTypes?.map(mode => (
                            <TabsTrigger key={mode} value={mode} className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">{mode}</TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    </Tabs>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <KPICard label="Filtered Sales" value={`$${stats?.revenue}`} sub="Today" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Avg. Order" value={`$${stats?.avg}`} sub="Mean Revenue" icon={TrendingUp} colorClass="bg-indigo-600" />
                    <KPICard label="Active Tickets" value={stats?.active || 0} sub="In Pipeline" icon={ShoppingBag} colorClass="bg-primary" />
                    <KPICard label="Overdue Orders" value={stats?.overdue || 0} sub="Beyond Threshold" icon={Clock} colorClass="bg-red-600" highlight={!!(stats?.overdue && stats.overdue > 0)} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-2 shadow-sm overflow-hidden">
                      <CardHeader className="bg-slate-50/50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-0.5">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Revenue Distribution</CardTitle>
                          <CardDescription className="text-[8px] font-bold uppercase">Stacked performance by mode</CardDescription>
                        </div>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border-2">
                          {['Today', 'MTD', 'YTD'].map((r) => (
                            <button key={r} onClick={() => setAnalyticsRange(r as any)} className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all", analyticsRange === r ? "bg-white text-[#213147] shadow-sm" : "text-slate-400 hover:text-slate-600")}>{r}</button>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-10 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                            <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                            <ChartTooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '10px', borderRadius: '12px', border: '2px solid #E2E8F0' }} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            {seller?.menuTypes?.map(mode => (
                              <Bar 
                                key={mode} 
                                dataKey={mode} 
                                stackId="a" 
                                fill={MODE_COLORS[mode] || '#64748B'} 
                                radius={[0, 0, 0, 0]} 
                                label={(props: any) => { 
                                  const { x, y, width, height, value, index } = props; 
                                  if (value <= 0 || height < 15) return null; 
                                  const entry = analyticsData.chartData[index]; 
                                  let labelText = analyticsRange === 'YTD' ? `$${(entry[`${mode}_count`] > 0 ? (value / entry[`${mode}_count`]).toFixed(0) : '0')}` : (entry[`${mode}_count`] || 0).toString(); 
                                  return (<text x={x + width / 2} y={y + height / 2} fill="#FFFFFF" textAnchor="middle" dominantBaseline="middle" fontSize={height < 20 ? 7 : 8} fontWeight="900" className="pointer-events-none drop-shadow-sm">{labelText}</text>); 
                                }} 
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm">
                      <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Active Channels</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                          const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || (mode === 'Clubhouse' && seller?.clubhouseActive) || (mode === 'Lane Delivery' && seller?.lanedeliveryActive) || (mode === 'Take Out' && seller?.takeoutActive);
                          if (!seller?.menuTypes?.includes(mode)) return null;
                          return (
                            <div key={mode} className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", isActive ? "bg-white border-primary/20 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60")}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isActive ? "bg-green-500" : "bg-slate-300")} />
                                <span className="text-[10px] font-black uppercase text-[#213147]">{mode}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {isActive && (
                                  <button onClick={() => handleImpersonate(mode)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary transition-all"><UserCircle className="h-4 w-4" /></button>
                                )}
                                <Switch checked={isActive} onCheckedChange={() => handleToggleMode(mode, !!isActive)} className="data-[state=checked]:bg-primary" />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Manage Personnel</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shift management & access tokens</p>
                    </div>
                    <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20">
                      <UserPlus className="h-4 w-4" /> Provision New Identity
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff?.length === 0 ? (
                      <div className="col-span-full py-20 text-center bg-white border-2 border-dashed rounded-3xl">
                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-[11px] font-black uppercase text-slate-400">No authorized personnel found</p>
                      </div>
                    ) : (
                      staff?.map((s) => (
                        <Card key={s.id} className={cn("border-2 shadow-sm group transition-all", s.isActive ? "bg-white" : "bg-slate-50 border-slate-100 opacity-60")}>
                          <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg", s.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400")}>
                                <UserCircle className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-xs uppercase text-[#213147] truncate">{s.name}</p>
                                <Badge variant="secondary" className="h-4 px-1 text-[8px] font-black uppercase mt-0.5">{s.role}</Badge>
                              </div>
                            </div>
                            <Switch checked={s.isActive} onCheckedChange={(isActive) => {
                              const staffRef = doc(firestore!, 'sellers', sellerId, 'staff', s.id);
                              updateDoc(staffRef, { isActive }).catch(async (error) => {
                                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: staffRef.path, operation: 'update', requestResourceData: { isActive } } satisfies SecurityRuleContext));
                              });
                            }} className="data-[state=checked]:bg-green-600 scale-75" />
                          </CardHeader>
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                               <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Access Key</span>
                               <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                     {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />)}
                                  </div>
                                  <span className="font-mono text-[10px] font-bold text-[#213147] group-hover:block hidden">{s.pin}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStaff(s.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeNav === 'orders' && (
                 <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center border-b-2 pb-4">
                      <div className="space-y-1">
                        <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Order Audit Log</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction level oversight</p>
                      </div>
                    </div>
                    <Card className="border-2 shadow-sm overflow-hidden">
                       <div className="overflow-x-auto no-scrollbar">
                          <Table className="min-w-[1000px]">
                            <TableHeader className="bg-slate-50 border-b">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Order ID</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Timestamp</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Patron</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Mode</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Total</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...(orders || [])].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map((o) => (
                                <TableRow key={o.id} className="group">
                                  <TableCell className="font-mono text-[10px] font-black">#{getNumericOrderId(o.id)}</TableCell>
                                  <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{o.createdAt && typeof o.createdAt.toDate === 'function' ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}</TableCell>
                                  <TableCell className="text-[10px] font-black text-[#213147] uppercase truncate max-w-[150px]">{o.customerName}</TableCell>
                                  <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">{o.menuType}</Badge></TableCell>
                                  <TableCell className="font-mono text-[10px] font-black text-primary">${(o.total || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge className={cn("text-[8px] font-black uppercase border-0", o.status === 'Delivered' ? 'bg-green-600' : 'bg-slate-400')}>
                                      {o.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-[9px] font-black uppercase border-2 gap-1.5"
                                      onClick={() => handleUpdateStatus(o.id, o.status)}
                                      disabled={o.status === 'Delivered' || o.status === 'Cancelled'}
                                    >
                                      Advance <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!orders || orders.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={7} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase">No transaction activity recorded</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                       </div>
                    </Card>
                 </div>
              )}

              {/* OTHER NAVIGATION SECTIONS WOULD FOLLOW SIMILAR PATTERNS */}

            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </main>
      </div>

      {/* DIALOG: STAFF FORM */}
      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0"><Users className="h-6 w-6 text-primary" /></div>
              <div>
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingStaff ? 'Modify Identity' : 'Provision Staff'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Set secure terminal access tokens</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8">
            <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(handleSaveStaff)} className="space-y-6">
                <FormField control={staffForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">Full Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Jane Doe" className="h-12 border-2 font-bold" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={staffForm.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">System Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Staff">General Staff</SelectItem>
                          <SelectItem value="Manager">Venue Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={staffForm.control} name="pin" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">4-Digit PIN</FormLabel>
                      <FormControl><Input {...field} type="password" maxLength={4} placeholder="••••" className="h-12 border-2 font-black text-center text-xl tracking-[1em]" /></FormControl>
                      <FormDescription className="text-[8px] font-bold uppercase text-muted-foreground text-center">Secure access token</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={staffForm.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2">
                    <div className="space-y-0.5 text-left">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">Account Status</FormLabel>
                      <FormDescription className="text-[8px] font-bold uppercase">Enable shift terminal access</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                  {isProcessingSave ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Commit Identity
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
