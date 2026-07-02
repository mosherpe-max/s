
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
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
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
  ShieldCheck,
  Clock,
  DollarSign,
  ShoppingBag,
  GripVertical,
  Download,
  CheckCircle2,
  Search,
  TrendingUp,
  Menu as LucideMenu,
  Image as LucideImage,
  Smartphone,
  X,
  Filter,
  Map as MapIcon,
  Timer,
  Save,
  CalendarDays,
  Library,
  Power,
  ExternalLink,
  Truck,
  Building,
  Tags,
  Star,
  LayoutList,
  Wand2,
  UserCog,
  ShieldAlert,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm, useFieldArray } from 'react-hook-form';
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
  isToday, 
  format, 
  differenceInMinutes, 
  startOfMonth, 
  startOfDay, 
  addHours, 
  isSameHour, 
  isSameDay, 
  eachDayOfInterval, 
  startOfYear, 
  addMonths, 
  isSameMonth, 
  isSameYear,
  isWithinInterval,
  endOfDay
} from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';

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

import type { MenuItem, Seller, Order, StaffMember, Venue, SellerAdminRole, ModifierGroup } from '@/lib/types';
import { categories } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { seedVenueModifiers } from '@/lib/seed-data';
import { signOut } from 'firebase/auth';

const DEFAULT_THRESHOLDS: Record<string, { warning: number; max: number }> = {
  'Beverage Cart': { warning: 10, max: 15 },
  'Clubhouse': { warning: 15, max: 20 },
  'Lane Delivery': { warning: 10, max: 15 },
  'Take Out': { warning: 15, max: 25 }
};

const MODE_COLORS: Record<string, string> = {
  'Beverage Cart': '#E50000',
  'Clubhouse': '#213147',
  'Lane Delivery': '#7C3AED',
  'Take Out': '#F59E0B'
};

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
  category: z.enum(categories as any),
  imageUrl: z.string().default(''),
  availableOn: z.array(z.string()).default([]),
  featuredOn: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
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
      <CardContent className="pb-3 px-3 sm:px-4 text-left">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black font-headline tracking-tighter text-[#213147] mb-0.5">{value}</div>
        <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase leading-none">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SortableItem({ id, item, isFeatured, onToggleFeatured, onRemoveFromMode, onEdit }: { 
  id: string; 
  item: MenuItem; 
  activeMode: string; 
  isFeatured: boolean; 
  onToggleFeatured: (id: string, current: string[]) => void;
  onRemoveFromMode: (id: string) => void;
  onEdit: (item: MenuItem) => void;
}) {
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
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-black uppercase text-[#213147] truncate leading-none mb-1">{item.name}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">${item.price.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1">
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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => onEdit(item)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => onRemoveFromMode(item.id)} title="Remove from Mode">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SortableCategory({ id, category, isVisible, onToggleVisibility }: { id: string; category: string; isVisible: boolean; onToggleVisibility: (cat: string) => void }) {
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
        isDragging ? "shadow-2xl border-primary/50 scale-105" : "hover:border-slate-300 shadow-sm",
        !isVisible && "opacity-50 grayscale bg-slate-50"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 transition-colors">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-black uppercase text-[#213147] truncate leading-none">{category}</p>
      </div>
      <Switch 
        checked={isVisible} 
        onToggle={() => onToggleVisibility(category)} 
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

export default function VenueAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState('All');
  const [analyticsRange, setAnalyticsRange] = useState<'Today' | 'MTD' | 'YTD'>('Today');
  const [now, setNow] = useState<number>(Date.now());
  const [greeting, setGreeting] = useState('Hello');

  // ORDER FILTER STATE
  const [orderDateRange, setOrderDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date())
  });
  const [orderModeFilter, setOrderModeFilter] = useState<string>('All');
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');

  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [configMode, setConfigMode] = useState<string>('Beverage Cart');

  const [venueThresholds, setVenueThresholds] = useState<Record<string, { warning: number; max: number }>>({});
  const [venueName, setVenueName] = useState('');
  const [venueTaxRate, setVenueTaxRate] = useState(0);

  useEffect(() => { 
    setIsMounted(true); 
    const interval = setInterval(() => setNow(Date.now()), 30000);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => clearInterval(interval);
  }, []);

  const sellerRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId, user]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, user]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modifierGroupsQuery = useMemoFirebase(() => (firestore && user ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, user]);
  const { data: modifierGroups } = useCollection<ModifierGroup>(modifierGroupsQuery);

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
  
  const isAuthorized = !!user && (
    isSuperAdmin || 
    (sellerRole?.sellerId === sellerId) || 
    (venueData?.ownerUid === user?.uid)
  );

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

  const getChartDataForRange = (range: 'Today' | 'MTD' | 'YTD') => {
    if (!orders || !seller) return [];
    const modes = seller.menuTypes || [];
    const now = new Date();
    let chartData: any[] = [];
    
    if (range === 'Today') {
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
    } else if (range === 'MTD') {
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
    return chartData;
  };

  const todayChartData = useMemo(() => getChartDataForRange('Today'), [orders, seller]);
  const analyticsData = useMemo(() => getChartDataForRange(analyticsRange), [orders, seller, analyticsRange]);

  const filteredOrderHistory = useMemo(() => {
    if (!orders || !orderDateRange?.from) return [];
    return orders
      .filter(o => {
        if (!o.createdAt || typeof o.createdAt.toDate !== 'function') return false;
        const orderDate = o.createdAt.toDate();
        const fromDate = startOfDay(orderDateRange.from!);
        const toDate = endOfDay(orderDateRange.to || orderDateRange.from!);
        const isInRange = isWithinInterval(orderDate, { start: fromDate, end: toDate });
        const isMatchingMode = orderModeFilter === 'All' || o.menuType === orderModeFilter;
        const isMatchingSearch = !orderSearchTerm || o.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) || o.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase());
        return isInRange && isMatchingMode && isMatchingSearch;
      })
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [orders, orderDateRange, orderModeFilter, orderSearchTerm]);

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

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: modifierGroupForm.control,
    name: "options"
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
    const payload = { ...data, id: itemId, rank: editingItem?.rank ?? (menuItems?.length || 0) + 1, updatedAt: serverTimestamp(), createdAt: editingItem?.createdAt || serverTimestamp() };
    setDoc(itemRef, payload, { merge: true }).then(() => {
      toast({ title: editingItem ? 'Item Updated' : 'Item Added' });
      setIsItemFormOpen(false);
      setEditingItem(null);
      itemForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'write', requestResourceData: payload } satisfies SecurityRuleContext));
    }).finally(() => setIsProcessingSave(false));
  };

  const handleSaveModifierGroup = async (data: ModifierGroupFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const groupId = editingModifierGroup?.id || Math.random().toString(36).substr(2, 9);
    const groupRef = doc(firestore, 'modifier_groups', groupId);
    const payload = { ...data, id: groupId, sellerId, updatedAt: serverTimestamp(), createdAt: editingModifierGroup?.createdAt || serverTimestamp() };
    setDoc(groupRef, payload, { merge: true }).then(() => {
      toast({ title: editingModifierGroup ? 'Modifier Group Updated' : 'Modifier Group Added' });
      setIsModifierGroupFormOpen(false);
      setEditingModifierGroup(null);
      modifierGroupForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: groupRef.path, operation: 'write', requestResourceData: payload } satisfies SecurityRuleContext));
    }).finally(() => setIsProcessingSave(false));
  };

  const handleDeleteStaff = async (id: string) => {
    if (!firestore || !sellerId) return;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', id);
    deleteDoc(staffRef).then(() => { toast({ title: "Staff Member Removed" }); });
  };

  const handleDeleteItem = async (id: string) => {
    if (!firestore || !sellerId) return;
    deleteDoc(doc(firestore, 'sellers', sellerId, 'menuItems', id)).then(() => { toast({ title: "Menu Item Deleted" }); });
  };

  const handleDeleteModifierGroup = async (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'modifier_groups', id)).then(() => { toast({ title: "Modifier Group Deleted" }); });
  };

  const handleSeedPresets = async () => {
    if (!firestore || !seller || !sellerId) return;
    setIsSeeding(true);
    try {
      await seedVenueModifiers(firestore, sellerId, seller.type);
      toast({ title: "Industry Presets Applied", description: "Standard modifier groups have been added and linked to items from the master library." });
    } catch (error) {
      toast({ variant: "destructive", title: "Seeding Failed", description: "Could not provision industry presets." });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleToggleMode = async (mode: string, current: boolean) => {
    if (!firestore || !sellerId || !user) return;
    const fieldMap: Record<string, string> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive', 'Take Out': 'takeoutActive' };
    const field = fieldMap[mode];
    if (field) {
      const sellerDocRef = doc(firestore, 'sellers', sellerId);
      updateDoc(sellerDocRef, { [field] : !current });
    }
  };

  const handleImpersonate = (mode: string) => {
    if (typeof window === 'undefined' || !sellerId) return;
    localStorage.setItem('koop_staff_id', `admin-${user?.uid}`);
    localStorage.setItem('koop_staff_name', `${user?.email || 'Admin'} (Management)`);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    toast({ title: "Launching Terminal", description: `Entering ${mode} dashboard as management bypass.` });
    setTimeout(() => {
      switch (mode) {
        case 'Beverage Cart': router.push(`/sellers/${sellerId}/bevcart`); break;
        case 'Clubhouse': router.push(`/sellers/${sellerId}/clubhouse`); break;
        case 'Lane Delivery': router.push(`/sellers/${sellerId}/laneside`); break;
        default: router.push(`/sellers/${sellerId}/clubhouse`); break;
      }
    }, 500);
  };

  const handleUpdateStatus = (orderId: string, current: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(current as any) + 1;
    if (nextIdx < stages.length) {
      const orderRef = doc(firestore, 'orders', orderId);
      updateDoc(orderRef, { status: stages[nextIdx], deliveredAt: stages[nextIdx] === 'Delivered' ? serverTimestamp() : null });
    }
  };

  const handleUpdateVenueSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const sellerDocRef = doc(firestore, 'sellers', sellerId);
    updateDoc(sellerDocRef, { courseName: venueName, taxRate: venueTaxRate, orderThresholds: venueThresholds, updatedAt: serverTimestamp() }).then(() => {
      toast({ title: "Venue Settings Synchronized" });
    }).finally(() => setIsProcessingSave(false));
  };

  const handleQuickDisableItem = async (itemId: string, currentStatus: boolean) => {
    if (!firestore || !sellerId) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    const nextStatus = !currentStatus;
    updateDoc(itemRef, { isAvailable: nextStatus }).then(() => {
      toast({ title: nextStatus ? "Item Enabled" : "Item Disabled (86'd)" });
    });
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('koop_'));
      keysToRemove.forEach(k => localStorage.removeItem(k));
      await signOut(auth);
      toast({ title: "Session Terminated", description: "Device released and returned to secure baseline." });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent, listType: 'category' | 'featured' | 'layout', categoryName?: string) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id || !firestore || !sellerId || !menuItems || !seller) return;

    if (listType === 'layout') {
      const currentOrder = seller.categoryVisibility?.[configMode] || categories.filter(c => c !== 'Featured');
      const oldIndex = currentOrder.indexOf(active.id as string);
      const newIndex = currentOrder.indexOf(over.id as string);
      const nextOrder = arrayMove(currentOrder, oldIndex, newIndex);
      updateDoc(doc(firestore, 'sellers', sellerId), { [`categoryVisibility.${configMode}`]: nextOrder });
      return;
    }

    const filteredItems = listType === 'featured' ? menuItems.filter(i => i.featuredOn?.includes(configMode)) : menuItems.filter(i => i.category === categoryName && i.availableOn?.includes(configMode));
    const oldIndex = filteredItems.findIndex(i => i.id === active.id);
    const newIndex = filteredItems.findIndex(i => i.id === over.id);
    const reordered = arrayMove(filteredItems, oldIndex, newIndex);
    const batch = writeBatch(firestore);
    reordered.forEach((item, index) => {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
      const rankField = listType === 'featured' ? 'featuredRanks' : 'menuRanks';
      batch.update(itemRef, { [rankField]: { ...(item[rankField] || {}), [configMode]: index + 1 } });
    });
    batch.commit().then(() => { toast({ title: "Menu Priorities Synchronized" }); });
  };

  const handleToggleItemAvailability = (itemId: string, currentOn: string[]) => {
    if (!firestore || !sellerId) return;
    const current = currentOn || [];
    const nextOn = current.includes(configMode) ? current.filter(m => m !== configMode) : [...current, configMode];
    updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', itemId), { availableOn: nextOn });
  };

  const handleToggleItemFeatured = (itemId: string, currentFeatured: string[]) => {
    if (!firestore || !sellerId) return;
    const current = currentFeatured || [];
    const nextFeatured = current.includes(configMode) ? current.filter(m => m !== configMode) : [...current, configMode];
    updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', itemId), { featuredOn: nextFeatured });
  };

  const handleToggleCategoryVisibility = (cat: string) => {
    if (!firestore || !sellerId || !seller) return;
    const currentList = seller.categoryVisibility?.[configMode] || categories.filter(c => c !== 'Featured');
    const nextList = currentList.includes(cat) ? currentList.filter(c => c !== cat) : [...currentList, cat];
    updateDoc(doc(firestore, 'sellers', sellerId), { [`categoryVisibility.${configMode}`]: nextList });
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "modifiers", label: "Modifiers", icon: Tags },
    { id: "service", label: "Service Modes", icon: Zap },
    { id: "staff", label: "Staff", icon: Users },
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar min-h-0 text-left">
          {NAV_ITEMS.map((item) => (
            <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={(id) => { setActiveNav(id); if (isMobile) setSidebarOpen(false); }} sidebarOpen={showLabels} />
          ))}
        </nav>
        <div className="mt-auto border-t border-white/5 p-4 shrink-0 space-y-4">
          {showLabels && (
            <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-left">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'V'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-white truncate uppercase tracking-tight">{seller?.courseName || 'Venue Admin'}</span>
                  <span className="text-[8px] font-bold text-slate-400 truncate uppercase">{user?.email}</span>
                </div>
              </div>
            </div>
          )}
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const SERVICE_MODE_ICONS: Record<string, any> = { 'Beverage Cart': Truck, 'Clubhouse': Building, 'Lane Delivery': Users, 'Take Out': ShoppingBag };

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
      <header className="h-20 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-3 text-left">
          <StylizedKoopLogo size="sm" colorClass="text-[#213147]" />
          <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" />
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1">{seller?.courseName}</h1>
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">{greeting}, {user?.email}</h2>
              {isSuperAdmin && <Badge variant="outline" className="h-4 px-1.5 bg-amber-500 text-white border-0 font-black uppercase text-[7px] animate-pulse">Impersonation Active</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" asChild className="h-9 text-[10px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 gap-2">
              <Link href="/admin"><ShieldAlert className="h-3.5 w-3.5" /> Return to Global Admin</Link>
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 border border-green-100 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest">Live Sync Online</span>
          </div>
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-[#213147]"><LucideMenu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="p-0 bg-[#213147] border-l-4 border-primary/20">
                <SheetHeader className="p-6 border-b border-white/5 text-left"><StylizedKoopLogo size="md" /><SheetTitle className="sr-only">Venue Navigation</SheetTitle></SheetHeader>
                <SideBarContent forceLabels={true} />
              </SheetContent>
            </Sheet>
          )}
          <button onClick={handleLogout} title="Sign Out & Release Device" className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span>
            <LogOut className="h-5 w-5" />
          </button>
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
                  <Card className="border-2 shadow-md overflow-hidden bg-white">
                    <CardHeader className="border-b bg-[#213147] text-white flex flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl"><Power className="h-5 w-5 text-primary" /></div>
                        <div className="text-left">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-white leading-none">Service Command Center</CardTitle>
                          <CardDescription className="text-[8px] font-bold uppercase text-white/40 mt-1">Real-time channel authorization</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 text-left">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {seller?.menuTypes?.map(mode => {
                          const fieldMap: Record<string, keyof Seller> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive', 'Take Out': 'takeoutActive' };
                          const isActive = !!(seller?.[fieldMap[mode] as keyof Seller]);
                          const ModeIcon = SERVICE_MODE_ICONS[mode] || Zap;
                          return (
                            <div key={`dashboard-mode-${mode}`} className={cn("flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group relative", isActive ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 bg-slate-50 opacity-60")}>
                              <div className={cn("p-2.5 rounded-xl transition-all shadow-sm", isActive ? "bg-primary text-white scale-110" : "bg-slate-200 text-slate-400")}><ModeIcon className="h-5 w-5" /></div>
                              <div className="text-center space-y-0.5">
                                <p className={cn("text-[10px] font-black uppercase tracking-tight", isActive ? "text-[#213147]" : "text-slate-400")}>{mode}</p>
                                <p className={cn("text-[8px] font-bold uppercase", isActive ? "text-green-600" : "text-slate-400")}>{isActive ? 'LIVE' : 'OFFLINE'}</p>
                              </div>
                              <div className="flex flex-col gap-2 w-full pt-2">
                                <div className="flex items-center justify-center gap-2"><Switch checked={isActive} onCheckedChange={() => handleToggleMode(mode, isActive)} className="data-[state=checked]:bg-primary" /></div>
                                <Button variant="outline" size="sm" className="h-8 w-full text-[9px] font-black uppercase tracking-widest gap-1.5 border-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all" onClick={() => handleImpersonate(mode)}><ExternalLink className="h-3 w-3" /> Terminal</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-col sm:row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border-2 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Filter className="h-4 w-4" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Real-Time Snapshot (Today)</h3>
                    </div>
                    <Tabs value={dashboardFilter} onValueChange={setDashboardFilter} className="w-full sm:w-auto">
                      <TabsList className="bg-slate-100 p-1 rounded-xl h-10 w-full sm:w-auto"><TabsTrigger value="All" className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">All Modes</TabsTrigger>{seller?.menuTypes?.map(mode => (<TabsTrigger key={mode} value={mode} className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">{mode}</TabsTrigger>))}</TabsList>
                    </Tabs>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <KPICard label="Today's Revenue" value={`$${stats?.revenue}`} sub="Live Earnings" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Avg. Order" value={`$${stats?.avg}`} sub="Mean Revenue" icon={TrendingUp} colorClass="bg-indigo-600" />
                    <KPICard label="Today's Volume" value={stats?.volume || 0} sub="Processed" icon={ShoppingBag} colorClass="bg-primary" />
                    <KPICard label="Active Tickets" value={stats?.active || 0} sub="In Pipeline" icon={Clock} colorClass="bg-red-600" highlight={!!(stats?.active && stats.active > 0)} />
                  </div>

                  <Card className="border-2 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Today's Revenue Velocity</CardTitle><CardDescription className="text-[8px] font-bold uppercase text-muted-foreground">Hourly distribution across authorized channels</CardDescription></CardHeader>
                    <CardContent className="pt-10 h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={todayChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '10px', borderRadius: '12px', border: '2px solid #E2E8F0' }} />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                          {seller?.menuTypes?.map(mode => (<Bar key={mode} dataKey={mode} stackId="a" fill={MODE_COLORS[mode] || '#64748B'} />))}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left"><div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Performance Analytics</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Historical revenue trends and channel distribution</p></div></div>
                  <Card className="border-2 shadow-lg overflow-hidden bg-white text-left">
                    <CardHeader className="bg-slate-50/50 border-b flex flex-row sm:flex-row justify-between items-start sm:items-center gap-4"><div className="space-y-0.5 text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Revenue Distribution</CardTitle><CardDescription className="text-[8px] font-bold uppercase">Toggle range for deeper historical analysis</CardDescription></div><div className="flex bg-slate-100 p-0.5 rounded-lg border-2">{['Today', 'MTD', 'YTD'].map((r) => (<button key={r} onClick={() => setAnalyticsRange(r as any)} className={cn("px-4 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-md transition-all", analyticsRange === r ? "bg-white text-[#213147] shadow-sm" : "text-slate-400 hover:text-slate-600")}>{r}</button>))}</div></CardHeader>
                    <CardContent className="pt-10 h-[450px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                          <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '10px', borderRadius: '12px', border: '2px solid #E2E8F0' }} />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                          {seller?.menuTypes?.map(mode => (<Bar key={mode} dataKey={mode} stackId="a" fill={MODE_COLORS[mode] || '#64748B'} />))}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t py-4 text-left"><p className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Reporting Currency: USD • Last Updated: {format(new Date(now), 'h:mm a')}</p></CardFooter>
                  </Card>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left"><div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Order Audit Log</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction level oversight & reporting</p></div></div>
                  <Card className="border-2 shadow-sm p-4 bg-white text-left">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Date Range</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-11 border-2 justify-start font-bold text-xs gap-2"><CalendarDays className="h-4 w-4 text-primary" />{orderDateRange?.from ? (orderDateRange.to ? <>{format(orderDateRange.from, 'MMM d')} - {format(orderDateRange.to, 'MMM d, yyyy')}</> : format(orderDateRange.from, 'MMM d, yyyy')) : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl border-2" align="start"><Calendar initialFocus mode="range" defaultMonth={orderDateRange?.from} selected={orderDateRange} onSelect={setOrderDateRange} numberOfMonths={2} classNames={{ range_start: "bg-primary text-primary-foreground rounded-l-md", range_end: "bg-primary text-primary-foreground rounded-r-md", range_middle: "bg-primary/10 text-primary", selected: "bg-primary text-primary-foreground" }} /></PopoverContent></Popover></div>
                      <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Service Mode</Label><Select value={orderModeFilter} onValueChange={setOrderModeFilter}><SelectTrigger className="h-11 border-2 font-bold text-xs"><SelectValue placeholder="All Modes" /></SelectTrigger><SelectContent><SelectItem value="All" className="text-xs font-bold uppercase">All Modes</SelectItem>{seller?.menuTypes?.map(m => <SelectItem key={m} value={m} className="text-xs font-bold uppercase">{m}</SelectItem>)}</SelectContent></Select></div>
                      <div className="md:col-span-2 space-y-1.5"><Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Search Tickets</Label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Order ID or Patron Name..." className="h-11 pl-10 border-2 font-bold text-xs" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} /></div></div>
                    </div>
                  </Card>
                  <Card className="border-2 shadow-sm overflow-hidden text-left">
                    <div className="overflow-x-auto no-scrollbar">
                      <Table className="min-w-[800px]">
                        <TableHeader className="bg-slate-50 border-b"><TableRow><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Order ID</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Timestamp</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Patron</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Mode</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Total</TableHead><TableHead className="text-[9px] font-black uppercase tracking-widest px-3">Status</TableHead><TableHead className="text-right text-[9px] font-black uppercase tracking-widest px-4">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>{filteredOrderHistory.length === 0 ? <TableRow><TableCell colSpan={7} className="h-40 text-center text-muted-foreground font-bold uppercase text-[10px] opacity-40">No matching orders found</TableCell></TableRow> : filteredOrderHistory.map((o) => (<TableRow key={o.id} className="group"><TableCell className="font-mono text-[10px] font-black px-3 text-left">#{getNumericOrderId(o.id)}</TableCell><TableCell className="text-[10px] font-bold text-slate-500 uppercase px-3 text-left">{o.createdAt && typeof o.createdAt.toDate === 'function' ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}</TableCell><TableCell className="text-[10px] font-black text-[#213147] uppercase truncate max-w-[120px] px-3 text-left">{o.customerName}</TableCell><TableCell className="px-3 text-left"><Badge variant="outline" className="text-[8px] font-black uppercase whitespace-nowrap">{o.menuType}</Badge></TableCell><TableCell className="font-mono text-[10px] font-black text-primary px-3 text-left">${(o.total || 0).toFixed(2)}</TableCell><TableCell className="px-3 text-left"><Badge className={cn("text-[8px] font-black uppercase border-0 whitespace-nowrap", o.status === 'Delivered' ? 'bg-green-600' : 'bg-slate-400')}>{o.status}</Badge></TableCell><TableCell className="text-right px-4"><Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase border-2 gap-1.5" onClick={() => handleUpdateStatus(o.id, o.status)} disabled={o.status === 'Delivered' || o.status === 'Cancelled'}>Advance <ChevronRight className="h-3 w-3" /></Button></TableCell></TableRow>))}</TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left"><div className="space-y-1 text-left"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Master Menu Library</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global items available for all service modes</p></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    {categories.filter(c => c !== 'Featured').map(cat => {
                      const items = menuItems?.filter(i => i.category === cat);
                      return (
                        <div key={cat} className="space-y-4">
                          <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-2"><h4 className="text-[11px] font-black uppercase text-primary tracking-widest">{cat}</h4><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all" onClick={() => { setEditingItem(null); itemForm.reset({ name: '', description: '', price: 0, category: cat as any, isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] }); setIsItemFormOpen(true); }}><Plus className="h-3.5 w-3.5" /></Button></div>
                          <div className="space-y-3">{!items?.length ? <div className="py-8 text-center bg-slate-50 border-2 border-dashed rounded-2xl opacity-40"><p className="text-[9px] font-black uppercase text-slate-400 text-center">Empty Section</p></div> : items.map(item => (<Card key={item.id} className={cn("border-2 shadow-sm group transition-all", item.isAvailable ? "bg-white" : "bg-red-50 border-red-100")}><CardContent className="p-3.5 flex flex-col gap-3 text-left"><div className="flex items-start justify-between gap-3 text-left"><div className="flex-1 min-w-0 text-left"><div className="flex items-center gap-2"><p className="font-black text-[11px] uppercase text-[#213147] truncate">{item.name}</p>{!item.isAvailable && <Badge variant="destructive" className="h-3.5 px-1 text-[7px] font-black uppercase border-0">86'D</Badge>}</div><p className="text-[10px] font-bold text-primary font-mono mt-0.5">${item.price.toFixed(2)}</p></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingItem(item); itemForm.reset({ ...item, description: item.description || '', imageUrl: item.imageUrl || '', modifierGroupIds: item.modifierGroupIds || [] }); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button></div></div><div className="flex items-center justify-between pt-2 border-t border-slate-100 text-left"><div className="flex items-center gap-2"><Switch checked={!!(item.isAvailable)} onCheckedChange={() => handleQuickDisableItem(item.id, !!item.isAvailable)} className="scale-75 data-[state=checked]:bg-green-600" /><span className={cn("text-[8px] font-black uppercase tracking-widest", item.isAvailable ? "text-green-600" : "text-red-600")}>{item.isAvailable ? "Available" : "Disabled"}</span></div><Badge variant="outline" className="text-[7px] font-bold uppercase border-slate-100 text-slate-400">{item.availableOn?.length || 0} Modes</Badge></div></CardContent></Card>))}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeNav === 'modifiers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left"><div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Modifier Groups</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reusable sets of customizations and add-ons</p></div><div className="flex gap-3 w-full sm:w-auto"><Button onClick={handleSeedPresets} disabled={isSeeding} variant="outline" className="flex-1 sm:flex-initial h-12 border-2 font-black uppercase text-[10px] tracking-widest gap-2">{isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4 text-primary" />}Seed Library Templates</Button><Button onClick={() => { setEditingModifierGroup(null); modifierGroupForm.reset({ name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] }); setIsModifierGroupFormOpen(true); }} className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"><Plus className="h-4 w-4" /> Define New Set</Button></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">{modifierGroups?.map(group => (<Card key={group.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left"><CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0 text-left"><div className="space-y-0.5 text-left"><p className="font-black text-xs uppercase text-[#213147]">{group.name}</p><p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{group.minSelection > 0 ? `Required (${group.minSelection})` : 'Optional'} · Max {group.maxSelection}</p></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingModifierGroup(group); modifierGroupForm.reset(group); setIsModifierGroupFormOpen(true); }}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteModifierGroup(group.id)}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent className="p-4 text-left"><div className="flex flex-wrap gap-1.5">{group.options.map((opt, idx) => (<Badge key={`${group.id}-opt-${idx}`} variant="outline" className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 h-auto", !opt.isAvailable && "opacity-40 line-through")}>{opt.name} {opt.priceAdjustment > 0 && `(+$${opt.priceAdjustment.toFixed(2)})`}</Badge>))}</div></CardContent></Card>))}</div>
                </div>
              )}

              {activeNav === 'service' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Service Mode Menu Builder</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Construct specific menus for each active channel</p>
                    </div>
                    <div className="w-full sm:w-64">
                      <Select value={configMode} onValueChange={setConfigMode}>
                        <SelectTrigger className="h-12 border-2 font-black uppercase text-[10px] tracking-widest bg-white">
                          <Zap className="h-4 w-4 text-primary mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {seller?.menuTypes?.map(m => (
                            <SelectItem key={m} value={m} className="font-bold uppercase text-[10px] tracking-widest">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-12 text-left">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b-2 pb-2 px-1 text-left">
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><LayoutList className="h-4 w-4" /></div>
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#213147]">Category Visibility & Sorting</h4>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Enable categories and drag to define patron scroll order.</p>
                        </div>
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'layout')}>
                        <SortableContext items={seller?.categoryVisibility?.[configMode] || categories.filter(c => c !== 'Featured')} strategy={verticalListSortingStrategy}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {(seller?.categoryVisibility?.[configMode] || categories.filter(c => c !== 'Featured')).map(cat => (
                              <SortableCategory key={`cat-sort-${cat}`} id={cat} category={cat} isVisible={true} onToggleVisibility={handleToggleCategoryVisibility} />
                            ))}
                            {categories.filter(c => c !== 'Featured' && !(seller?.categoryVisibility?.[configMode] || []).includes(c)).map(cat => (
                              <div key={`cat-hidden-${cat}`} className="bg-slate-50 border-2 border-dashed rounded-xl p-3 flex items-center justify-between opacity-60">
                                <span className="text-[10px] font-black uppercase text-slate-400">{cat}</span>
                                <Switch checked={false} onToggle={() => handleToggleCategoryVisibility(cat)} className="scale-75" />
                              </div>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>

                    <div className="space-y-12">
                      <div className="space-y-4 bg-amber-50/30 p-4 sm:p-6 rounded-[2rem] border-2 border-amber-100/50">
                        <div className="flex items-center gap-2 border-b-2 border-amber-100 pb-2 px-1 text-left">
                          <Star className="h-4 w-4 text-amber-500 fill-current" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">Featured Highlight Items</h4>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'featured')}>
                          <SortableContext items={menuItems?.filter(i => i.featuredOn?.includes(configMode)).sort((a, b) => (a.featuredRanks?.[configMode] || 0) - (b.featuredRanks?.[configMode] || 0)).map(i => i.id) || []} strategy={verticalListSortingStrategy}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {menuItems?.filter(i => i.featuredOn?.includes(configMode)).sort((a, b) => (a.featuredRanks?.[configMode] || 0) - (b.featuredRanks?.[configMode] || 0)).map(item => (
                                <SortableItem key={item.id} id={item.id} item={item} activeMode={configMode} isFeatured={true} onToggleFeatured={handleToggleItemFeatured} onRemoveFromMode={() => handleToggleItemAvailability(item.id, item.availableOn || [])} onEdit={(it) => { setEditingItem(it); itemForm.reset(it); setIsItemFormOpen(true); }} />
                              ))}
                              {menuItems?.filter(i => i.featuredOn?.includes(configMode)).length === 0 && (
                                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-2xl opacity-40 bg-white">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-800/50 text-center">No Featured items</p>
                                </div>
                              )}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>

                      {categories.filter(c => c !== 'Featured').map(cat => {
                        const allItemsInCat = menuItems?.filter(i => i.category === cat) || [];
                        const activeInMode = allItemsInCat.filter(i => i.availableOn?.includes(configMode)).sort((a, b) => (a.menuRanks?.[configMode] || 0) - (b.menuRanks?.[configMode] || 0));
                        const remainingInLibrary = allItemsInCat.filter(i => !i.availableOn?.includes(configMode));
                        return (
                          <div key={`mode-cat-${cat}`} className="space-y-4 sm:space-y-6 text-left">
                            <div className="flex items-center justify-between border-b-2 pb-2 px-1 text-left">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="h-6 px-3 text-[10px] font-black uppercase tracking-widest bg-[#213147] text-white border-0">{cat}</Badge>
                                <div className="flex items-center gap-2">
                                  <Switch checked={(seller?.categoryVisibility?.[configMode] || []).includes(cat)} onToggle={() => handleToggleCategoryVisibility(cat)} className="scale-75" />
                                  <span className="text-[9px] font-black uppercase text-muted-foreground">Category Visible</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase gap-1.5 bg-slate-100 hover:bg-primary hover:text-white transition-all rounded-full" onClick={() => { setEditingItem(null); itemForm.reset({ name: '', description: '', price: 0, category: cat as any, isAvailable: true, availableOn: [configMode], featuredOn: [], modifierGroupIds: [] }); setIsItemFormOpen(true); }}>
                                <Plus className="h-3 w-3" /> Add Master Item
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 text-left">
                              <div className="lg:col-span-3 space-y-3">
                                <div className="flex items-center gap-2 px-1 mb-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /><span className="text-[10px] font-black uppercase tracking-widest text-green-700">Active on {configMode}</span></div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'category', cat)}>
                                  <SortableContext items={activeInMode.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {activeInMode.map(item => (
                                        <SortableItem key={`active-item-${item.id}`} id={item.id} item={item} activeMode={configMode} isFeatured={item.featuredOn?.includes(configMode) || false} onToggleFeatured={handleToggleItemFeatured} onRemoveFromMode={() => handleToggleItemAvailability(item.id, item.availableOn || [])} onEdit={(it) => { setEditingItem(it); itemForm.reset(it); setIsItemFormOpen(true); }} />
                                      ))}
                                      {activeInMode.length === 0 && (
                                        <div className="col-span-full py-10 text-center border-2 border-dashed rounded-2xl opacity-30 bg-slate-50">
                                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-center">No items authorized</p>
                                        </div>
                                      )}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              </div>
                              <div className="lg:col-span-1 space-y-3">
                                <div className="flex items-center gap-2 px-1 mb-2"><Library className="h-3.5 w-3.5 text-indigo-600" /><span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">From Master Library</span></div>
                                <ScrollArea className="h-[250px] lg:h-[400px] border-2 rounded-2xl bg-slate-50/50 p-2">
                                  <div className="space-y-2 text-left">
                                    {remainingInLibrary.map(item => (
                                      <div key={`lib-item-${item.id}`} className="bg-white border-2 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm group">
                                        <div className="min-w-0 flex-1 text-left">
                                          <p className="text-[10px] font-black uppercase text-[#213147] truncate">{item.name}</p>
                                          <p className="text-[8px] font-bold text-muted-foreground uppercase">${item.price.toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" onClick={() => handleToggleItemAvailability(item.id, item.availableOn || [])}><Plus className="h-3.5 w-3.5" /></Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                      </div>
                                    ))}
                                    {remainingInLibrary.length === 0 && (
                                      <div className="py-8 text-center opacity-30">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-center">Library empty</p>
                                      </div>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left"><div className="space-y-1 text-left"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Manage Personnel</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Shift management & access tokens</p></div><Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl font-black uppercase text-[11px] tracking-widest gap-2 shadow-xl shadow-primary/20"><Plus className="h-4 w-4" /> Provision New Identity</Button></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">{staff?.map((s) => (<Card key={s.id} className={cn("border-2 shadow-sm group transition-all", s.isActive ? "bg-white" : "bg-slate-50 border-slate-100 opacity-60")}><CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 text-left"><div className="flex items-center gap-3"><div className={cn("p-2 rounded-lg", s.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400")}><Users className="h-5 w-5" /></div><div className="min-w-0 text-left"><p className="font-black text-xs uppercase text-[#213147] truncate">{s.name}</p><Badge variant="secondary" className="h-4 px-1 text-[8px] font-black uppercase mt-0.5">{s.role}</Badge></div></div></CardHeader><CardContent className="p-4 flex items-center justify-between text-left"><div className="flex flex-col gap-1 text-left"><span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Access Key</span><span className="font-mono text-[10px] font-bold text-[#213147]">{s.pin}</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStaff(s.id)}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>))}</div>
                </div>
              )}

              {activeNav === 'marketing' && (
                <div className="space-y-10 animate-in fade-in duration-500 text-left"><div className="space-y-1 text-left"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Branding & Collateral</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Promotion assets for your establishment</p></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left"><Card className="lg:col-span-1 border-2 shadow-sm overflow-hidden h-fit"><CardHeader className="bg-slate-50/50 border-b text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Venue QR Code</CardTitle><CardDescription className="text-[8px] font-bold uppercase">Direct link to your digital menu</CardDescription></CardHeader><CardContent className="p-8 flex flex-col items-center justify-center space-y-6"><div className="bg-white p-4 rounded-[2rem] shadow-xl border-2"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/sellers/${sellerId}/order`)}`} alt="Venue QR" width={200} height={200} className="rounded-xl w-48 h-48" /></div><div className="text-center space-y-3 w-full"><code className="text-[9px] font-mono bg-muted p-2 rounded block truncate border-2 border-dashed">{typeof window !== 'undefined' ? `${window.location.origin}/sellers/${sellerId}/order` : 'Loading...'}</code><Button onClick={() => { const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/sellers/${sellerId}/order`)}`; window.open(url, '_blank'); }} className="w-full h-11 bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg"><Download className="h-4 w-4" /> Download Digital Copy</Button></div></CardContent></Card><div className="lg:col-span-2 space-y-8"><div className="flex items-center gap-3 border-b-2 pb-4 px-1 text-left"><div className="p-2 bg-primary/10 rounded-xl text-primary"><MapIcon className="h-5 w-5" /></div><div className="space-y-0.5 text-left"><h4 className="font-headline font-black text-lg text-[#213147] uppercase leading-tight">Print Collateral</h4><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Establishment-specific signage templates</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{seller?.type?.toLowerCase().includes('golf') ? (<><Card className="border-2 shadow-sm group hover:border-primary/30 transition-all cursor-pointer bg-white"><CardContent className="p-4 flex items-center gap-4 text-left"><div className="bg-slate-50 group-hover:bg-primary/10 p-3 rounded-xl transition-colors"><Smartphone className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" /></div><div className="min-w-0 flex-1 text-left"><p className="font-black text-xs uppercase text-[#213147] truncate leading-tight">Golf Cart Card</p><p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight mt-1">4x6 double-sided card for cart steering wheels</p></div><div className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0"><Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter h-4 border-slate-200">Soon</Badge></div></CardContent></Card><Card className="border-2 shadow-sm group hover:border-primary/30 transition-all cursor-pointer bg-white"><CardContent className="p-4 flex items-center gap-4 text-left"><div className="bg-slate-50 group-hover:bg-primary/10 p-3 rounded-xl transition-colors"><LucideImage className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" /></div><div className="min-w-0 flex-1 text-left"><p className="font-black text-xs uppercase text-[#213147] truncate leading-tight">Cart Sticker</p><p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight mt-1">3x3 vinyl decal for dash or windshield mounting</p></div><div className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0"><Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter h-4 border-slate-200">Soon</Badge></div></CardContent></Card></>) : seller?.type?.toLowerCase().includes('bowling') ? (<><Card className="border-2 shadow-sm group hover:border-primary/30 transition-all cursor-pointer bg-white"><CardContent className="p-4 flex items-center gap-4 text-left"><div className="bg-slate-50 group-hover:bg-primary/10 p-3 rounded-xl transition-colors"><Smartphone className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" /></div><div className="min-w-0 flex-1 text-left"><p className="font-black text-xs uppercase text-[#213147] truncate leading-tight">Lane Side Table Card</p><p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight mt-1">5x7 folded card for bowling lane scoring tables</p></div><div className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0"><Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter h-4 border-slate-200">Soon</Badge></div></CardContent></Card></>) : null}</div></div></div></div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-10 animate-in fade-in duration-500 text-left">
                  <form onSubmit={handleUpdateVenueSettings} className="space-y-10 text-left">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b-2 pb-4 text-left">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Building className="h-5 w-5" /></div>
                        <div className="space-y-0.5 text-left">
                          <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">General Identity</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Branding and menu presentation</p>
                        </div>
                      </div>
                      <Card className="border-2 shadow-sm overflow-hidden text-left">
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                          <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Venue Name</Label>
                            <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Oak Ridge Country Club" className="h-12 border-2 font-bold focus-visible:ring-primary" />
                          </div>
                          <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tax Rate (%)</Label>
                            <Input type="number" step="0.01" value={venueTaxRate || ''} onChange={(e) => setVenueTaxRate(parseFloat(e.target.value) || 0)} className="h-12 border-2 font-bold focus-visible:ring-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b-2 pb-4 text-left">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><Timer className="h-5 w-5" /></div>
                        <div className="space-y-0.5 text-left">
                          <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Operational Thresholds</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timing protocols for order fulfillment</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        {(seller?.menuTypes || []).map(mode => { 
                          const thresholds = venueThresholds[mode] || DEFAULT_THRESHOLDS[mode] || { warning: 15, max: 20 }; 
                          return (
                            <Card key={mode} className="border-2 shadow-sm overflow-hidden group text-left">
                              <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-3 text-left">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  <span className="text-[11px] font-black uppercase text-[#213147]">{mode}</span>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6 space-y-6 text-left">
                                <div className="grid grid-cols-2 gap-6 text-left">
                                  <div className="space-y-2 text-left">
                                    <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Warning (Min)</Label>
                                    <Input type="number" min="1" value={thresholds.warning || ''} onChange={(e) => setVenueThresholds(prev => ({ ...prev, [mode]: { ...thresholds, warning: parseInt(e.target.value, 10) || 0 } }))} className="h-11 border-2 font-bold focus-visible:ring-amber-500" />
                                  </div>
                                  <div className="space-y-2 text-left">
                                    <Label className="text-[10px] font-black uppercase text-red-600 tracking-widest">Max Window (Min)</Label>
                                    <Input type="number" min="1" value={thresholds.max || ''} onChange={(e) => setVenueThresholds(prev => ({ ...prev, [mode]: { ...thresholds, max: parseInt(e.target.value, 10) || 0 } }))} className="h-11 border-2 font-bold focus-visible:ring-red-500" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ); 
                        })}
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isProcessingSave} className="h-14 px-10 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl">
                          {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Commit Venue Settings
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </main>
      </div>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0"><Users className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingStaff ? 'Modify Identity' : 'Provision Staff'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1 text-left">Set secure terminal access tokens</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 text-left">
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" disabled={isProcessingSave} className="flex-1 h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Identity
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setIsStaffFormOpen(false); setEditingStaff(null); staffForm.reset(); }} className="h-14 px-8 border-2 font-black uppercase tracking-widest text-[11px]">Discard</Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0"><UtensilsCrossed className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingItem ? 'Modify Item' : 'New Menu Item'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1 text-left">Configure digital menu presence</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] text-left">
            <div className="p-8 text-left">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                  <FormField control={itemForm.control} name="modifierGroupIds" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Attached Modifier Sets</FormLabel>
                      <div className="grid grid-cols-1 gap-2">
                        {modifierGroups?.map(group => (
                          <div key={group.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border-2 hover:bg-white transition-all">
                            <Checkbox checked={field.value?.includes(group.id)} onCheckedChange={(checked) => { 
                              const next = checked ? [...(field.value || []), group.id] : field.value?.filter(id => id !== group.id); 
                              field.onChange(next); 
                            }} />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[10px] font-black uppercase text-[#213147]">{group.name}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">{group.options.length} options</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button type="submit" disabled={isProcessingSave} className="flex-1 h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                      {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Item
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsItemFormOpen(false); setEditingItem(null); itemForm.reset(); }} className="h-14 px-8 border-2 font-black uppercase tracking-widest text-[11px]">Discard</Button>
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isModifierGroupFormOpen} onOpenChange={setIsModifierGroupFormOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/20 p-3 rounded-2xl shrink-0"><Tags className="h-6 w-6 text-white" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingModifierGroup ? 'Modify Modifier Set' : 'New Modifier Set'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1 text-left">Configure options and add-ons</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] text-left">
            <div className="p-8 text-left">
              <Form {...modifierGroupForm}>
                <form onSubmit={modifierGroupForm.handleSubmit(handleSaveModifierGroup)} className="space-y-8">
                  <FormField control={modifierGroupForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest">Group Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Side Options" className="h-12 border-2 font-bold" /></FormControl>
                      <FormDescription className="text-[8px] font-medium uppercase text-muted-foreground">e.g. "Pizza Toppings", "Choice of Dressing"</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border-2">
                    <FormField control={modifierGroupForm.control} name="minSelection" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Min Choice</FormLabel>
                        <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                        <FormDescription className="text-[7px] font-bold uppercase">1 = Required</FormDescription>
                      </FormItem>
                    )} />
                    <FormField control={modifierGroupForm.control} name="maxSelection" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Max Choice</FormLabel>
                        <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                        <FormDescription className="text-[7px] font-bold uppercase">Limit selections</FormDescription>
                      </FormItem>
                    )} />
                  </div>
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Option Variations</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true })} className="h-7 text-[8px] font-black uppercase gap-1"><Plus className="h-3 w-3" /> Add Variation</Button>
                    </div>
                    <div className="space-y-3">
                      {optionFields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-end bg-white p-3 border-2 rounded-xl group">
                          <div className="col-span-6 space-y-1">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground">Option Name</Label>
                            <Input {...modifierGroupForm.register(`options.${index}.name` as const)} placeholder="Extra Bacon" className="h-9 text-xs font-bold border-0 bg-slate-50" />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground">Price (+)</Label>
                            <Input {...modifierGroupForm.register(`options.${index}.priceAdjustment` as const)} type="number" step="0.01" className="h-9 text-xs font-bold border-0 bg-slate-50" />
                          </div>
                          <div className="col-span-2 flex items-center justify-center pb-2">
                            <FormField control={modifierGroupForm.control} name={`options.${index}.isAvailable`} render={({ field }) => (
                              <Switch checked={field.value} onToggle={() => field.onChange(!field.value)} className="data-[state=checked]:bg-green-600 scale-75" />
                            )} />
                          </div>
                          <div className="col-span-1 flex items-center justify-center pb-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-8 w-8 text-destructive/40 hover:text-destructive"><X className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 text-left">
                    <Button type="submit" disabled={isProcessingSave} className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                      {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Commit Modifier Group
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsModifierGroupFormOpen(false); setEditingModifierGroup(null); modifierGroupForm.reset(); }} className="h-14 px-8 border-2 font-black uppercase tracking-widest text-[11px]">Discard</Button>
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
