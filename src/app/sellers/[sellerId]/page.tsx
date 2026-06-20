
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
  UserPlus,
  Building,
  Printer,
  Star
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
  useSensor,
  useSensors,
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
import { Checkbox } from '@/components/ui/checkbox';

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

function CollateralCard({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <Card className="border-2 shadow-sm group hover:border-primary/30 transition-all cursor-pointer bg-white">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="bg-slate-50 group-hover:bg-primary/10 p-3 rounded-xl transition-colors">
          <Icon className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-xs uppercase text-[#213147] truncate leading-tight">{title}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight mt-1">{description}</p>
        </div>
        <div className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
          <Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter h-4 border-slate-200">Soon</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableItem({ id, item, activeMode, isFeatured, onToggleFeatured }: { id: string, item: MenuItem, activeMode: string, isFeatured: boolean, onToggleFeatured: (id: string, current: string[]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "bg-white border-2 rounded-xl p-3 flex items-center gap-3 transition-all",
        isDragging ? "shadow-2xl border-primary/50 scale-105" : "hover:border-slate-300 shadow-sm"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 transition-colors">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase text-[#213147] truncate leading-none mb-1">{item.name}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">${item.price.toFixed(2)}</p>
      </div>
      <button 
        onClick={() => onToggleFeatured(item.id, item.featuredOn || [])}
        className={cn(
          "p-2 rounded-lg transition-all active:scale-95",
          isFeatured ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-300 hover:text-slate-400"
        )}
        title={isFeatured ? "Remove from Featured" : "Add to Featured"}
      >
        <Star className={cn("h-4 w-4", isFeatured && "fill-current")} />
      </button>
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
  const [isMounted, setIsMounted] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState('All');
  const [analyticsRange, setAnalyticsRange] = useState<'Today' | 'MTD' | 'YTD'>('Today');
  const [now, setNow] = useState<number>(Date.now());

  // Operational State
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [configMode, setConfigMode] = useState<string>('Beverage Cart');

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

  const stats = useMemo(() => {
    if (!orders) return null;
    const filteredOrders = dashboardFilter === 'All' ? orders : orders.filter(o => o.menuType === dashboardFilter);
    const today = filteredOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && isToday(o.createdAt.toDate()));
    const revenue = today.reduce((acc, o) => acc + (o.total || 0), 0);
    const avg = today.length > 0 ? (revenue / today.length).toFixed(2) : '0.00';
    const overdueCount = filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.createdAt && typeof o.createdAt.toDate === 'function' && differenceInMinutes(new Date(), o.createdAt.toDate()) >= (seller?.orderThresholds?.[o.menuType]?.max || DEFAULT_THRESHOLDS[o.menuType]?.max || 20)).length;
    return { revenue: revenue.toFixed(2), active: filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length, volume: today.length, avg, overdue: overdueCount };
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
        });
        return entry;
      });
    }
    return { chartData };
  }, [orders, seller, analyticsRange]);

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true }
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', price: 0, category: 'Other', isAvailable: true, availableOn: [], featuredOn: [] }
  });

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

  const handleSaveItem = async (data: ItemFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const itemId = editingItem?.id || Math.random().toString(36).substr(2, 9);
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    const payload = { 
      ...data, 
      id: itemId, 
      rank: editingItem?.rank ?? (menuItems?.length || 0) + 1,
      updatedAt: serverTimestamp(), 
      createdAt: editingItem?.createdAt || serverTimestamp() 
    };
    setDoc(itemRef, payload, { merge: true }).then(() => {
      toast({ title: editingItem ? 'Item Updated' : 'Item Added' });
      setIsItemFormOpen(false);
      setEditingItem(null);
      itemForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: itemRef.path, 
        operation: 'write', 
        requestResourceData: payload 
      } satisfies SecurityRuleContext));
    }).finally(() => setIsProcessingSave(false));
  };

  const handleDeleteStaff = async (id: string) => {
    if (!firestore || !sellerId) return;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', id);
    deleteDoc(staffRef).then(() => { toast({ title: "Staff Member Removed" }); }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: staffRef.path, operation: 'delete' } satisfies SecurityRuleContext));
    });
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !sellerId) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', id);
    deleteDoc(itemRef).then(() => { 
      toast({ title: "Menu Item Deleted" }); 
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ 
        path: itemRef.path, 
        operation: 'delete' 
      } satisfies SecurityRuleContext));
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
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: sellerDocRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
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

  const handleUpdateVenueSettings = async () => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    const updateData = { 
      courseName: venueName,
      taxRate: venueTaxRate,
      orderThresholds: venueThresholds, 
      updatedAt: serverTimestamp() 
    };
    updateDoc(sellerDocRef, updateData).then(() => {
      toast({ title: "Venue Settings Synchronized" });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: sellerDocRef.path, operation: 'update', requestResourceData: updateData } satisfies SecurityRuleContext));
    }).finally(() => setIsProcessingSave(false));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent, listType: 'category' | 'featured', categoryName?: string) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id || !firestore || !sellerId || !menuItems) return;

    const filteredItems = listType === 'featured' 
      ? menuItems.filter(i => i.featuredOn?.includes(configMode))
      : menuItems.filter(i => i.category === categoryName && i.availableOn?.includes(configMode));

    const oldIndex = filteredItems.findIndex(i => i.id === active.id);
    const newIndex = filteredItems.findIndex(i => i.id === over.id);

    const reordered = arrayMove(filteredItems, oldIndex, newIndex);
    const batch = writeBatch(firestore);

    reordered.forEach((item, index) => {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
      const rankField = listType === 'featured' ? 'featuredRanks' : 'menuRanks';
      const updateData = {
        [rankField]: {
          ...(item[rankField] || {}),
          [configMode]: index + 1
        }
      };
      batch.update(itemRef, updateData);
    });

    batch.commit().then(() => {
      toast({ title: "Menu Priorities Synchronized" });
    });
  };

  const handleToggleItemAvailability = (itemId: string, currentOn: string[]) => {
    if (!firestore || !sellerId) return;
    const isNowOn = currentOn.includes(configMode);
    const nextOn = isNowOn ? currentOn.filter(m => m !== configMode) : [...currentOn, configMode];
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    updateDoc(itemRef, { availableOn: nextOn });
  };

  const handleToggleItemFeatured = (itemId: string, currentFeatured: string[]) => {
    if (!firestore || !sellerId) return;
    const current = currentFeatured || [];
    const isNowFeatured = current.includes(configMode);
    const nextFeatured = isNowFeatured ? current.filter(m => m !== configMode) : [...current, configMode];
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    updateDoc(itemRef, { featuredOn: nextFeatured });
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "service", label: "Service Modes", icon: Zap },
    { id: "staff", label: "Staff", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
    { id: "marketing", label: "Marketing", icon: Smartphone },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full bg-[#213147] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
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
                <SheetHeader className="p-6 border-b border-white/5 text-left">
                   <StylizedKoopLogo size="md" />
                   <SheetTitle className="sr-only">Venue Navigation</SheetTitle>
                   <SheetDescription className="sr-only">Access tools for {seller?.courseName}</SheetDescription>
                </SheetHeader>
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
                              <Bar key={mode} dataKey={mode} stackId="a" fill={MODE_COLORS[mode] || '#64748B'} />
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
                              <Switch checked={isActive} onCheckedChange={() => handleToggleMode(mode, !!isActive)} className="data-[state=checked]:bg-primary" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
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
                          <Table className="min-w-[800px]">
                            <TableHeader className="bg-slate-50 border-b">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Order ID</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Timestamp</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Patron</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Mode</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Total</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Status</TableHead>
                                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest px-4">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {[...(orders || [])].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map((o) => (
                                <TableRow key={o.id} className="group">
                                  <TableCell className="font-mono text-[10px] font-black px-3">#{getNumericOrderId(o.id)}</TableCell>
                                  <TableCell className="text-[10px] font-bold text-slate-500 uppercase px-3">{o.createdAt && typeof o.createdAt.toDate === 'function' ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}</TableCell>
                                  <TableCell className="text-[10px] font-black text-[#213147] uppercase truncate max-w-[120px] px-3">{o.customerName}</TableCell>
                                  <TableCell className="px-3"><Badge variant="outline" className="text-[8px] font-black uppercase whitespace-nowrap">{o.menuType}</Badge></TableCell>
                                  <TableCell className="font-mono text-[10px] font-black text-primary px-3">${(o.total || 0).toFixed(2)}</TableCell>
                                  <TableCell className="px-3">
                                    <Badge className={cn("text-[8px] font-black uppercase border-0 whitespace-nowrap", o.status === 'Delivered' ? 'bg-green-600' : 'bg-slate-400')}>
                                      {o.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right px-4">
                                    <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-2 gap-1.5" onClick={() => handleUpdateStatus(o.id, o.status)} disabled={o.status === 'Delivered' || o.status === 'Cancelled'}>
                                      Advance <ChevronRight className="h-3 w-3" />
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

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Master Menu Library</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global items available for all service modes</p>
                    </div>
                    <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl">
                      <Plus className="h-4 w-4" /> Create New Master Item
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.filter(c => c !== 'Featured').map(cat => {
                      const items = menuItems?.filter(i => i.category === cat);
                      if (!items?.length) return null;
                      return (
                        <div key={cat} className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-primary tracking-widest px-1">{cat}</h4>
                          <div className="space-y-3">
                            {items.map(item => (
                              <Card key={item.id} className={cn("border-2 shadow-sm group transition-all", item.isAvailable ? "bg-white" : "bg-red-50 border-red-100 opacity-60")}>
                                <CardContent className="p-4 flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-black text-xs uppercase text-[#213147] truncate">{item.name}</p>
                                      {!item.isAvailable && <Badge variant="destructive" className="h-3.5 px-1 text-[7px] font-black uppercase border-0">86'D</Badge>}
                                    </div>
                                    <p className="text-[10px] font-bold text-primary font-mono mt-0.5">${item.price.toFixed(2)}</p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingItem(item); itemForm.reset(item); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </CardContent>
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Service Mode Menu Builder</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select a mode to customize its specific layout</p>
                    </div>
                    <div className="w-full sm:w-64">
                       <Select value={configMode} onValueChange={setConfigMode}>
                          <SelectTrigger className="h-12 border-2 font-black uppercase text-[10px] tracking-widest bg-white">
                             <Zap className="h-4 w-4 text-primary mr-2" />
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             {seller?.menuTypes?.map(m => <SelectItem key={m} value={m} className="font-bold uppercase text-[10px] tracking-widest">{m}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* MASTER TOGGLES */}
                    <div className="lg:col-span-1 space-y-6">
                       <Card className="border-2 shadow-md overflow-hidden bg-white">
                          <CardHeader className="bg-[#213147] text-white p-4">
                             <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest">{configMode}</span>
                                <Switch 
                                  checked={!!(configMode === 'Beverage Cart' ? seller?.bevcartActive : configMode === 'Clubhouse' ? seller?.clubhouseActive : configMode === 'Lane Delivery' ? seller?.lanedeliveryActive : seller?.takeoutActive)} 
                                  onCheckedChange={(v) => handleToggleMode(configMode, !v)} 
                                  className="data-[state=checked]:bg-primary"
                                />
                             </div>
                             <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Status: {!!(configMode === 'Beverage Cart' ? seller?.bevcartActive : configMode === 'Clubhouse' ? seller?.clubhouseActive : configMode === 'Lane Delivery' ? seller?.lanedeliveryActive : seller?.takeoutActive) ? 'Live' : 'Paused'}</p>
                          </CardHeader>
                          <CardContent className="p-4 space-y-6">
                             <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorize Master Items</Label>
                                <ScrollArea className="h-[400px] border-2 rounded-xl p-2 bg-slate-50">
                                   <div className="space-y-1">
                                      {menuItems?.map(item => (
                                        <div key={`auth-${item.id}`} className="flex items-center justify-between p-2 hover:bg-white rounded-lg transition-all group">
                                           <div className="flex items-center gap-2">
                                              <Checkbox 
                                                checked={item.availableOn?.includes(configMode)} 
                                                onCheckedChange={() => handleToggleItemAvailability(item.id, item.availableOn || [])}
                                              />
                                              <span className="text-[10px] font-black uppercase text-[#213147] truncate max-w-[120px]">{item.name}</span>
                                           </div>
                                           <Badge variant="outline" className="text-[7px] font-black uppercase opacity-40 group-hover:opacity-100">{item.category}</Badge>
                                        </div>
                                      ))}
                                   </div>
                                </ScrollArea>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase leading-relaxed text-center px-2">Only checked items will appear in the ordering terminal for this mode.</p>
                             </div>
                          </CardContent>
                       </Card>
                    </div>

                    {/* SORTING CANVAS */}
                    <div className="lg:col-span-3 space-y-8">
                       <div className="bg-primary/5 border-2 border-primary/20 p-4 rounded-2xl flex items-center gap-4">
                          <div className="bg-primary text-white p-2 rounded-xl"><MousePointer2 className="h-4 w-4" /></div>
                          <div>
                             <p className="text-[11px] font-black uppercase text-[#213147]">Menu Priority Builder</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Drag items to prioritize. Star items to add them to the Featured section.</p>
                          </div>
                       </div>

                       <div className="space-y-10">
                          {/* FEATURED SECTION */}
                          <div className="space-y-4">
                             <div className="flex items-center gap-2 border-b-2 pb-2 px-1">
                                <Star className="h-4 w-4 text-amber-500 fill-current" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#213147]">Featured (Top of Menu)</h4>
                             </div>
                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'featured')}>
                                <SortableContext items={menuItems?.filter(i => i.featuredOn?.includes(configMode)).sort((a, b) => (a.featuredRanks?.[configMode] || 0) - (b.featuredRanks?.[configMode] || 0)).map(i => i.id) || []} strategy={verticalListSortingStrategy}>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {menuItems?.filter(i => i.featuredOn?.includes(configMode)).sort((a, b) => (a.featuredRanks?.[configMode] || 0) - (b.featuredRanks?.[configMode] || 0)).map(item => (
                                        <SortableItem key={item.id} id={item.id} item={item} activeMode={configMode} isFeatured={true} onToggleFeatured={handleToggleItemFeatured} />
                                      ))}
                                      {menuItems?.filter(i => i.featuredOn?.includes(configMode)).length === 0 && (
                                        <div className="col-span-full py-8 text-center bg-white border-2 border-dashed rounded-2xl opacity-40">
                                           <p className="text-[10px] font-black uppercase tracking-widest">No featured items for this mode</p>
                                        </div>
                                      )}
                                   </div>
                                </SortableContext>
                             </DndContext>
                          </div>

                          {/* STANDARD CATEGORIES */}
                          {categories.filter(c => c !== 'Featured').map(cat => {
                            const items = menuItems?.filter(i => i.category === cat && i.availableOn?.includes(configMode))
                              .sort((a, b) => (a.menuRanks?.[configMode] || 0) - (b.menuRanks?.[configMode] || 0));
                            if (!items?.length) return null;

                            return (
                              <div key={`sort-cat-${cat}`} className="space-y-4">
                                <div className="flex items-center gap-2 border-b-2 pb-2 px-1">
                                   <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase tracking-widest">{cat}</Badge>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'category', cat)}>
                                   <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                         {items.map(item => (
                                           <SortableItem 
                                             key={`sort-item-${item.id}`} 
                                             id={item.id} 
                                             item={item} 
                                             activeMode={configMode} 
                                             isFeatured={item.featuredOn?.includes(configMode) || false} 
                                             onToggleFeatured={handleToggleItemFeatured} 
                                           />
                                         ))}
                                      </div>
                                   </SortableContext>
                                </DndContext>
                              </div>
                            );
                          })}
                       </div>
                    </div>
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
                    {staff?.map((s) => (
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
                        </CardHeader>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                             <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Access Key</span>
                             <span className="font-mono text-[10px] font-bold text-[#213147]">{s.pin}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStaff(s.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'marketing' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="space-y-1">
                    <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Branding & Collateral</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Promotion assets for your establishment</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1 border-2 shadow-sm overflow-hidden h-fit">
                      <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Venue QR Code</CardTitle>
                        <CardDescription className="text-[8px] font-bold uppercase">Direct link to your digital menu</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8 flex flex-col items-center justify-center space-y-6">
                        <div className="bg-white p-4 rounded-[2rem] shadow-xl border-2">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/sellers/${sellerId}/order`)}`}
                            alt="Venue QR"
                            width={200}
                            height={200}
                            className="rounded-xl w-48 h-48"
                          />
                        </div>
                        <div className="text-center space-y-3 w-full">
                          <code className="text-[9px] font-mono bg-muted p-2 rounded block truncate border-2 border-dashed">
                            {typeof window !== 'undefined' ? `${window.location.origin}/sellers/${sellerId}/order` : 'Loading...'}
                          </code>
                          <Button
                            onClick={() => {
                              const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/sellers/${sellerId}/order`)}`;
                              window.open(url, '_blank');
                            }}
                            className="w-full h-11 bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg"
                          >
                            <Download className="h-4 w-4" /> Download Digital Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-8">
                      <div className="flex items-center gap-3 border-b-2 pb-4">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><Printer className="h-5 w-5" /></div>
                        <div className="space-y-0.5">
                           <h4 className="font-headline font-black text-lg text-[#213147] uppercase leading-tight">Print Collateral</h4>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Establishment-specific signage templates</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {seller?.type?.toLowerCase().includes('golf') ? (
                          <>
                            <CollateralCard title="Golf Cart Card" description="4x6 double-sided card for cart steering wheels" icon={Smartphone} />
                            <CollateralCard title="Cart Sticker" description="3x3 vinyl decal for dash or windshield mounting" icon={LucideImage} />
                            <CollateralCard title="Golf Course Sign" description="18x24 coroplast for tee boxes and practice range" icon={MapIcon} />
                            <CollateralCard title="Clubhouse Poster" description="11x17 high-impact poster for pro-shop entrance" icon={FileText} />
                          </>
                        ) : seller?.type?.toLowerCase().includes('bowling') ? (
                          <>
                            <CollateralCard title="Lane Side Table Card" description="5x7 folded card for bowling lane scoring tables" icon={Smartphone} />
                            <CollateralCard title="Proshop Poster" description="11x17 high-impact poster for main facility lobby" icon={FileText} />
                          </>
                        ) : (
                          <div className="col-span-full py-20 text-center bg-white border-2 border-dashed rounded-[2rem] opacity-40">
                             <Database className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Marketing Assets for your venue type arriving soon</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 pb-4">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Building className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">General Identity</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Branding and menu presentation</p>
                      </div>
                    </div>
                    
                    <Card className="border-2 shadow-sm overflow-hidden">
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Venue Name</Label>
                          <Input 
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="Oak Ridge Country Club"
                            className="h-12 border-2 font-bold focus-visible:ring-primary"
                          />
                          <p className="text-[8px] font-medium text-muted-foreground italic uppercase">This name will be displayed at the top of all customer menus.</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tax Rate (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={venueTaxRate || ''}
                            onChange={(e) => setVenueTaxRate(parseFloat(e.target.value) || 0)}
                            className="h-12 border-2 font-bold focus-visible:ring-primary"
                          />
                          <p className="text-[8px] font-medium text-muted-foreground italic uppercase">Standard sales tax applied at checkout.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 pb-4">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary"><Timer className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Operational Thresholds</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timing protocols for order fulfillment</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(seller?.menuTypes || []).map(mode => {
                        const thresholds = venueThresholds[mode] || DEFAULT_THRESHOLDS[mode] || { warning: 15, max: 20 };
                        return (
                          <Card key={mode} className="border-2 shadow-sm overflow-hidden group">
                            <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span className="text-[11px] font-black uppercase text-[#213147]">{mode}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Warning (Min)</Label>
                                  <Input 
                                    type="number"
                                    min="1"
                                    value={thresholds.warning || ''}
                                    onChange={(e) => setVenueThresholds(prev => ({
                                      ...prev,
                                      [mode]: { ...thresholds, warning: parseInt(e.target.value, 10) || 0 }
                                    }))}
                                    className="h-11 border-2 font-bold focus-visible:ring-amber-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Max Window (Min)</Label>
                                  <Input 
                                    type="number"
                                    min="1"
                                    value={thresholds.max || ''}
                                    onChange={(e) => setVenueThresholds(prev => ({
                                      ...prev,
                                      [mode]: { ...thresholds, max: parseInt(e.target.value, 10) || 0 }
                                    }))}
                                    className="h-11 border-2 font-bold focus-visible:ring-red-500"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-4">
                       <Button onClick={handleUpdateVenueSettings} disabled={isProcessingSave} className="h-14 px-10 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-xs gap-3 shadow-xl">
                        {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Commit Venue Settings
                       </Button>
                    </div>
                  </div>
                </div>
              )}

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
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                  {isProcessingSave ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Commit Identity
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ITEM FORM */}
      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0"><UtensilsCrossed className="h-6 w-6 text-primary" /></div>
              <div>
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingItem ? 'Modify Item' : 'New Menu Item'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Configure digital menu presence</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-8">
              <Form {...itemForm}>
                <form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-6">
                  <FormField control={itemForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">Item Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Classic Burger" className="h-12 border-2 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={itemForm.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Price ($)</FormLabel>
                        <FormControl><Input {...field} type="number" step="0.01" className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={itemForm.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.filter(c => c !== 'Featured').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={itemForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">Description (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="Chilled 12oz can" className="h-12 border-2 font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Commit Item
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
