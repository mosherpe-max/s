
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
  Globe
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
          {!isSelected && isGloballyAvailable && (
            <Badge variant="secondary" className="h-4 px-1 text-[7px] font-black uppercase border-0">In Master</Badge>
          )}
        </div>
        <p className="text-[10px] text-primary font-bold font-mono mt-0.5">${item.price.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Global 86 Toggle */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[7px] font-black text-slate-400 uppercase">Stock</span>
          <Switch 
            checked={isGloballyAvailable} 
            onCheckedChange={onToggleAvailability}
            onPointerDown={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-green-600 scale-75"
          />
        </div>

        {/* Channel Toggle */}
        <div className="flex flex-col items-center gap-0.5">
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
  const [reportStartDate, setReportStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reportModeFilter, setReportModeFilter] = useState<string>('All');

  // Settings State
  const [venueThresholds, setVenueThresholds] = useState<Record<string, { warning: number; max: number }>>({});
  const [venueName, setVenueName] = useState('');
  const [venueTaxRate, setVenueTaxRate] = useState(0);

  useEffect(() => { 
    setIsMounted(true); 
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) setSidebarOpen(false);
    }

    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Data Fetching
  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staff } = useCollection<StaffMember>(staffQuery);

  const venueDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venueData, isLoading: isVenueLoading } = useDoc<Venue>(venueDocRef);

  // Security Verification for Venue Admin
  const sellerRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole, isLoading: isRoleLoading } = useDoc<SellerAdminRole>(sellerRoleRef);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  const isAuthorized = isSuperAdmin || (sellerRole?.sellerId === sellerId) || (venueData?.ownerUid === user?.uid);

  // Initialize Settings State from Seller Data
  useEffect(() => {
    if (seller) {
      setVenueName(seller.courseName || '');
      setVenueTaxRate(seller.taxRate || 0);
      
      setVenueThresholds({
        ...DEFAULT_THRESHOLDS,
        ...(seller.orderThresholds || {})
      });
      
      if (seller.menuTypes && seller.menuTypes.length > 0 && !seller.menuTypes.includes(configMode)) {
        setConfigMode(seller.menuTypes[0]);
      }
    }
  }, [seller]);

  // DND Configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Form Logic
  const staffForm = useForm<StaffFormData>({ 
    resolver: zodResolver(staffSchema), 
    defaultValues: { name: '', role: 'Driver', pin: '', isActive: true } 
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price: 0, category: 'Beer', availableOn: [], isAvailable: true }
  });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore) return;
    const id = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', id);
    const payload = { 
      ...data, 
      id, 
      createdAt: editingStaff?.createdAt || serverTimestamp() 
    };

    setDoc(staffRef, payload, { merge: true })
      .then(() => {
        setIsStaffFormOpen(false); 
        setEditingStaff(null); 
        staffForm.reset();
        toast({ title: "Staff member saved" });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: staffRef.path,
          operation: 'write',
          requestResourceData: payload,
        }));
      });
  };

  const onSaveItem = async (data: ItemFormData) => {
    if (!firestore) return;
    const id = editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9);
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', id);
    const payload = {
      ...data,
      id,
      rank: editingItem?.rank || 0,
      createdAt: editingItem?.createdAt || serverTimestamp()
    };

    setDoc(itemRef, payload, { merge: true })
      .then(() => {
        setIsItemFormOpen(false);
        setEditingItem(null);
        itemForm.reset();
        toast({ title: editingItem ? "Item Updated" : "Item Added" });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'write',
          requestResourceData: payload,
        }));
      });
  };

  const toggleItemAvailability = (item: MenuItem) => {
    if (!firestore) return;
    const isCurrentlyAvailable = item.isAvailable !== false;
    const nextAvailable = !isCurrentlyAvailable;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
    const updateData = { isAvailable: nextAvailable };

    updateDoc(itemRef, updateData)
      .then(() => {
        toast({ title: nextAvailable ? "Item Restored" : "Item 86'd", description: `${item.name} availability updated.` });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
  };

  const handleUpdateStatus = (orderId: string, current: string) => {
    if (!firestore) return;
    const stages: Order['status'][] = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
    const nextIdx = stages.indexOf(current as any) + 1;
    if (nextIdx < stages.length) {
      const orderRef = doc(firestore, 'orders', orderId);
      const updateData = { 
        status: stages[nextIdx],
        deliveredAt: stages[nextIdx] === 'Delivered' ? serverTimestamp() : null 
      };

      updateDoc(orderRef, updateData)
        .catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: orderRef.path,
            operation: 'update',
            requestResourceData: updateData,
          }));
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
      const updateData = { [field]: !current };
      updateDoc(doc(firestore, 'sellers', sellerId), updateData)
        .then(() => {
          toast({ title: `${mode} status updated` });
        })
        .catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `sellers/${sellerId}`,
            operation: 'update',
            requestResourceData: updateData,
          }));
        });
    }
  };

  const handleDragEnd = (event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !firestore) return;

    const activeItems = menuItems
      ?.filter(i => i.category === category && i.availableOn?.includes(configMode))
      .sort((a, b) => {
        const rankA = a.menuRanks?.[configMode] ?? 999;
        const rankB = b.menuRanks?.[configMode] ?? 999;
        return rankA - rankB;
      }) || [];

    const oldIndex = activeItems.findIndex(i => i.id === active.id);
    const newIndex = activeItems.findIndex(i => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = arrayMove(activeItems, oldIndex, newIndex);
      const batch = writeBatch(firestore);
      newItems.forEach((item, index) => {
        const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
        batch.update(itemRef, { [`menuRanks.${configMode}`]: index });
      });
      batch.commit().then(() => {
        toast({ title: "Rankings Synchronized", description: `New display order saved for ${category}.` });
      });
    }
  };

  const handleToggleItemInMode = (itemId: string, currentAvailable: string[]) => {
    if (!firestore) return;
    const exists = currentAvailable.includes(configMode);
    const nextAvailable = exists 
      ? currentAvailable.filter(m => m !== configMode)
      : [...currentAvailable, configMode];
    
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    const updateData = { availableOn: nextAvailable };

    updateDoc(itemRef, updateData)
      .then(() => {
        toast({ title: "Menu Composition Updated" });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
  };

  const handleToggleCategoryVisibility = (category: string) => {
    if (!firestore || !seller || !configMode) return;
    
    const currentEnabled = seller.categoryVisibility?.[configMode] || categories.filter(c => c !== 'Featured'); // Default to all if missing
    const isEnabled = currentEnabled.includes(category);
    
    let nextEnabled: string[];
    if (isEnabled) {
      nextEnabled = currentEnabled.filter(c => c !== category);
    } else {
      nextEnabled = [...currentEnabled, category];
    }

    const sellerRef = doc(firestore, 'sellers', sellerId);
    const updateData = { [`categoryVisibility.${configMode}`]: nextEnabled };
    
    updateDoc(sellerRef, updateData)
      .then(() => {
        toast({ title: `${category} visibility updated for ${configMode}` });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
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

  const handleUpdateVenueRegistry = async () => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const updateData = {
      courseName: venueName,
      taxRate: venueTaxRate,
      orderThresholds: venueThresholds,
      updatedAt: serverTimestamp()
    };
    
    updateDoc(doc(firestore, 'sellers', sellerId), updateData)
      .then(() => {
        toast({ title: "Venue Registry Updated", description: "All profile and timing settings have been synchronized." });
      })
      .catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `sellers/${sellerId}`,
          operation: 'update',
          requestResourceData: updateData,
        }));
      })
      .finally(() => {
        setIsProcessingSave(false);
      });
  };

  const handleThresholdChange = (mode: string, type: 'warning' | 'max', value: string) => {
    const numValue = parseInt(value, 10);
    setVenueThresholds(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [type]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  const stats = useMemo(() => {
    if (!orders) return null;
    
    const filteredOrders = dashboardFilter === 'All' 
      ? orders 
      : orders.filter(o => o.menuType === dashboardFilter);

    const today = filteredOrders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const revenue = today.reduce((acc, o) => acc + o.total, 0);
    const fees = today.reduce((acc, o) => acc + o.serviceFee, 0);
    
    const nowLocal = new Date();
    const overdueCount = filteredOrders.filter(o => {
      if (o.status === 'Delivered' || o.status === 'Cancelled' || !o.createdAt || typeof o.createdAt.toDate !== 'function') return false;
      const threshold = seller?.orderThresholds?.[o.menuType]?.max || DEFAULT_THRESHOLDS[o.menuType]?.max || 20;
      const minutes = differenceInMinutes(nowLocal, o.createdAt.toDate());
      return minutes >= threshold;
    }).length;

    return {
      revenue: revenue.toFixed(2),
      fees: fees.toFixed(2),
      active: filteredOrders.filter(o => o.status !== 'Delivered').length,
      volume: today.length,
      avg: today.length > 0 ? (revenue / today.length).toFixed(2) : '0.00',
      overdue: overdueCount
    };
  }, [orders, dashboardFilter, seller]);

  const availableMonths = useMemo(() => {
    if (!orders) return [];
    const months = new Set<string>();
    orders.forEach(o => {
      if (o.createdAt && typeof o.createdAt.toDate === 'function') {
        months.add(format(o.createdAt.toDate(), 'MMMM yyyy'));
      }
    });
    return Array.from(months).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [orders]);

  const analyticsData = useMemo(() => {
    if (!orders || !seller) return { chartData: [], revenueByMode: [] };

    const activeModes = seller.menuTypes || [];
    const now = new Date();
    let chartData: any[] = [];

    if (analyticsRange === 'Today') {
      const start = startOfDay(now);
      const intervals = Array.from({ length: 24 }, (_, i) => addHours(start, i));
      chartData = intervals.map(hour => {
        const entry: any = { time: format(hour, 'ha') };
        activeModes.forEach(mode => {
          const matchingOrders = orders.filter(o => 
            o.menuType === mode && 
            o.createdAt && 
            typeof o.createdAt.toDate === 'function' &&
            isSameHour(o.createdAt.toDate(), hour) && 
            isSameDay(o.createdAt.toDate(), now)
          );
          const total = matchingOrders.reduce((sum, o) => sum + o.total, 0);
          entry[mode] = Math.round(total);
          entry[`${mode}_count`] = matchingOrders.length;
        });
        return entry;
      });
    } else if (analyticsRange === 'MTD') {
      const start = startOfMonth(now);
      const intervals = eachDayOfInterval({ start, end: now });
      chartData = intervals.map(day => {
        const entry: any = { time: format(day, 'MMM d') };
        activeModes.forEach(mode => {
          const matchingOrders = orders.filter(o => 
            o.menuType === mode && 
            o.createdAt && 
            typeof o.createdAt.toDate === 'function' &&
            isSameDay(o.createdAt.toDate(), day)
          );
          const total = matchingOrders.reduce((sum, o) => sum + o.total, 0);
          entry[mode] = Math.round(total);
          entry[`${mode}_count`] = matchingOrders.length;
        });
        return entry;
      });
    } else {
      const start = startOfYear(now);
      const currentMonthIndex = now.getMonth();
      const intervals = Array.from({ length: currentMonthIndex + 1 }, (_, i) => addMonths(start, i));
      chartData = intervals.map(month => {
        const entry: any = { time: format(month, 'MMM') };
        activeModes.forEach(mode => {
          const matchingOrders = orders.filter(o => 
            o.menuType === mode && 
            o.createdAt && 
            typeof o.createdAt.toDate === 'function' &&
            isSameMonth(o.createdAt.toDate(), month) && 
            isSameYear(o.createdAt.toDate(), now)
          );
          const total = matchingOrders.reduce((sum, o) => sum + o.total, 0);
          entry[mode] = Math.round(total);
          entry[`${mode}_count`] = matchingOrders.length;
        });
        return entry;
      });
    }

    return { chartData };
  }, [orders, seller, analyticsRange]);

  const pieChartData = useMemo(() => {
    if (!orders || !seller) return [];
    const modes = seller.menuTypes || [];
    
    const filteredOrders = pieMonthFilter === 'All' 
      ? orders 
      : orders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && format(o.createdAt.toDate(), 'MMMM yyyy') === pieMonthFilter);

    return modes.map(mode => {
      const modeOrders = filteredOrders.filter(o => o.menuType === mode);
      const revenue = modeOrders.reduce((sum, o) => sum + o.total, 0);
      const count = modeOrders.length;
      const avg = count > 0 ? (revenue / count) : 0;
      return { name: mode, value: revenue, count, avg };
    }).filter(d => d.count > 0);
  }, [orders, seller, pieMonthFilter]);

  const detailedReportOrders = useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders;

    // Filter by Service Mode
    if (reportModeFilter !== 'All') {
      filtered = filtered.filter(o => o.menuType === reportModeFilter);
    }

    // Filter by Date Range
    const start = startOfDay(new Date(reportStartDate));
    const end = endOfDay(new Date(reportEndDate));

    filtered = filtered.filter(o => {
      if (!o.createdAt || typeof o.createdAt.toDate !== 'function') return false;
      const orderDate = o.createdAt.toDate();
      return isWithinInterval(orderDate, { start, end });
    });

    // Sort by Date Descending
    return [...filtered].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [orders, reportStartDate, reportEndDate, reportModeFilter]);

  const detailedReportStats = useMemo(() => {
    const revenue = detailedReportOrders.reduce((acc, o) => acc + o.total, 0);
    const volume = detailedReportOrders.length;
    return { revenue, volume };
  }, [detailedReportOrders]);

  const mappedBuyers = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled')
      .map(o => ({
        id: o.id,
        name: o.customerName,
        location: o.deliveryLocation,
        colorClass: o.menuType === 'Beverage Cart' ? "bg-red-600" : "bg-indigo-600"
      }));
  }, [orders]);

  const mappedDrivers = useMemo(() => {
    if (!seller) return [];
    const drivers = [];
    if (seller.bevcartActive && seller.latitude) {
      drivers.push({
        id: 'primary-bevcart',
        name: 'Beverage Cart',
        location: { latitude: seller.latitude, longitude: seller.longitude },
        type: 'Beverage Cart'
      });
    }
    if (seller.clubhouseActive) {
      drivers.push({
        id: 'clubhouse-server',
        name: 'Clubhouse Dispatch',
        location: { latitude: (seller.latitude || 0) + 0.0002, longitude: (seller.longitude || 0) + 0.0002 },
        type: 'Clubhouse'
      });
    }
    return drivers;
  }, [seller]);

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
          {showLabels && (
            <div className="bg-white/5 rounded-xl p-3 border border-white/10 animate-in fade-in duration-500">
              <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-1">Administrative Port</p>
              <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight">{seller?.courseName || 'Establishing...'}</p>
            </div>
          )}
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

  if (!isMounted) return null;

  const isDataLoading = isSellerLoading || isRoleLoading || isUserLoading || isVenueLoading;

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Admin Credentials...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white p-8 text-center">
        <div className="bg-red-500/10 p-6 rounded-[2.5rem] border-2 border-red-500/20 mb-8">
          <ShieldCheck className="h-16 w-16 text-red-500 mx-auto" />
        </div>
        <h2 className="font-headline text-3xl font-black uppercase tracking-tight mb-4">Access Restricted</h2>
        <p className="text-white/60 text-sm max-w-md mb-10 leading-relaxed font-medium">
          You are not authorized to manage the administration terminal for this establishment. Please sign in with an authorized account.
        </p>
        <Button asChild className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-10 shadow-xl">
          <Link href="/login">Return to Gateway</Link>
        </Button>
      </div>
    );
  }

  // Determine categories to show under composition
  // Featured is always first.
  const compositionCategories = [...categories].sort((a, b) => {
    if (a === 'Featured') return -1;
    if (b === 'Featured') return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
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

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-10 pb-24">

              {activeNav === 'dashboard' && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border-2 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Filter className="h-4 w-4" /></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Dashboard Filter</h3>
                    </div>
                    <div className="w-full sm:w-auto overflow-x-auto no-scrollbar">
                      <Tabs value={dashboardFilter} onValueChange={setDashboardFilter} className="w-full sm:w-auto">
                        <TabsList className="bg-slate-100 p-1 rounded-xl h-10 w-fit sm:w-full">
                          <TabsTrigger value="All" className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">All Modes</TabsTrigger>
                          {seller?.menuTypes?.map(mode => (
                            <TabsTrigger key={mode} value={mode} className="text-[10px] font-black uppercase tracking-widest px-4 h-8 whitespace-nowrap">{mode}</TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <KPICard label="Filtered Sales" value={`$${stats?.revenue}`} sub="Today" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Avg. Order" value={`$${stats?.avg}`} sub="Mean Revenue" icon={TrendingUp} colorClass="bg-indigo-600" />
                    <KPICard label="Active Tickets" value={stats?.active || 0} sub="In Pipeline" icon={ShoppingBag} colorClass="bg-primary" />
                    <KPICard 
                      label="Overdue Orders" 
                      value={stats?.overdue || 0} 
                      sub="Beyond Threshold" 
                      icon={Clock} 
                      colorClass="bg-red-600" 
                      highlight={!!(stats?.overdue && stats.overdue > 0)}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-2 shadow-sm overflow-hidden">
                      <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
                         <div className="space-y-0.5">
                            <CardTitle className="text-xs font-black uppercase tracking-widest">Today's Pulse</CardTitle>
                            <CardDescription className="text-[9px] font-bold uppercase">Hourly Sales & Deliveries</CardDescription>
                         </div>
                         <Badge variant="outline" className="text-[9px] font-black uppercase border-2 text-indigo-600 border-indigo-100">{dashboardFilter}</Badge>
                      </CardHeader>
                      <CardContent className="pt-8 h-[300px] sm:h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748B' }} />
                            <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" tick={{ fill: '#64748B' }} />
                            <ChartTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: '2px solid #E2E8F0', padding: '12px' }} />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                            {seller?.menuTypes?.map(mode => (
                              <Bar key={mode} stackId="a" dataKey={mode} fill={MODE_COLORS[mode] || '#64748B'} radius={[0, 0, 0, 0]} barSize={20} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <div className="lg:col-span-1 space-y-6">
                      <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b">
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Active Channels</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                          {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                            const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || (mode === 'Clubhouse' && seller?.clubhouseActive) || (mode === 'Lane Delivery' && seller?.lanedeliveryActive) || (mode === 'Take Out' && seller?.takeoutActive);
                            if (!seller?.menuTypes?.includes(mode)) return null;
                            return (
                              <div key={mode} className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", isActive ? "bg-white border-primary/20 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60")}>
                                <div className="flex items-center gap-2"><div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isActive ? "bg-green-500" : "bg-slate-300")} /><span className="text-[10px] font-black uppercase text-[#213147]">{mode}</span></div>
                                <Switch 
                                  checked={isActive} 
                                  onCheckedChange={() => handleToggleMode(mode, !!isActive)} 
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-primary" 
                                />
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  {seller?.type?.toLowerCase().includes('golf') && (
                    <Card className="border-2 shadow-sm overflow-hidden h-[300px] relative">
                      <MapView 
                        sellerLocation={seller ? { latitude: seller.latitude, longitude: seller.longitude } : undefined}
                        buyers={mappedBuyers}
                        drivers={mappedDrivers}
                        interactive={true}
                        showPrimaryMarker={true}
                      />
                    </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders?.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map((order, idx) => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        orderNumber={idx + 1} 
                        now={now} 
                        onUpdateStatus={handleUpdateStatus} 
                        thresholds={seller?.orderThresholds?.[order.menuType]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary"><Database className="h-5 w-5" /></div>
                      <div>
                        <h3 className="font-headline font-black text-lg text-[#213147] uppercase leading-tight">Master Inventory</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Item Registry</p>
                      </div>
                    </div>
                    <Button onClick={() => { setEditingItem(null); itemForm.reset({ name: '', description: '', price: 0, category: 'Beer', availableOn: [], isAvailable: true }); setIsItemFormOpen(true); }} className="bg-primary hover:bg-primary/90 font-black uppercase text-[10px] h-10 gap-2 shadow-lg"><Plus className="h-4 w-4" /> New Master Item</Button>
                  </div>
                  <div className="space-y-10">
                    {categories.map(cat => {
                      const items = menuItems?.filter(i => i.category === cat) || [];
                      if (!items.length) return null;
                      return (
                        <div key={cat} className="space-y-4">
                           <div className="flex items-center gap-3 border-b-2 pb-2">
                              <h4 className="font-headline font-black text-sm uppercase tracking-widest text-[#213147]">{cat}</h4>
                              <Badge variant="secondary" className="text-[9px] font-black uppercase h-5">{items.length} Items</Badge>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {items.map(item => (
                                <Card key={item.id} className={cn("border-2 overflow-hidden group transition-all", item.isAvailable === false && "opacity-60 bg-slate-50 border-dashed")}>
                                   <div className="flex h-24">
                                      <div className="w-24 bg-slate-100 border-r-2 flex items-center justify-center relative shrink-0">
                                         {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <LucideImage className="h-8 w-8 text-slate-300" />}
                                      </div>
                                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                         <div>
                                            <p className="font-black text-xs uppercase text-[#213147] truncate">{item.name}</p>
                                            <p className="font-mono text-primary text-[10px] font-bold">${item.price.toFixed(2)}</p>
                                         </div>
                                         <div className="flex items-center justify-between gap-1">
                                            <div className="flex flex-col">
                                              <span className="text-[7px] font-black uppercase text-muted-foreground mb-0.5">86 Stock</span>
                                              <Switch 
                                                checked={item.isAvailable !== false} 
                                                onCheckedChange={() => toggleItemAvailability(item)} 
                                                onPointerDown={(e) => e.stopPropagation()}
                                                className="data-[state=checked]:bg-green-600 h-4 w-7" 
                                              />
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
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary"><Zap className="h-5 w-5" /></div>
                      <h3 className="font-headline font-black text-lg text-[#213147] uppercase">Channel Status</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                       {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                          const isActive = (mode === 'Beverage Cart' && seller?.bevcartActive) || (mode === 'Clubhouse' && seller?.clubhouseActive) || (mode === 'Lane Delivery' && seller?.lanedeliveryActive) || (mode === 'Take Out' && seller?.takeoutActive);
                          if (!seller?.menuTypes?.includes(mode)) return null;
                          return (
                            <Card key={mode} className={cn("border-2 transition-all cursor-pointer group", isActive ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200")} onClick={() => handleToggleMode(mode, !!isActive)}>
                               <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                                  <div className={cn("p-3 rounded-xl transition-all group-hover:scale-110", isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}><Zap className="h-4 w-4" /></div>
                                  <div className="space-y-1">
                                    <p className="font-black uppercase text-[10px] text-[#213147] leading-tight truncate w-full">{mode}</p>
                                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-4 px-2", isActive ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-50 text-slate-400 border-slate-200")}>{isActive ? 'ON' : 'OFF'}</Badge>
                                  </div>
                               </CardContent>
                            </Card>
                          );
                       })}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl sm:rounded-[2rem] border-2 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><Layers className="h-5 w-5" /></div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#213147]">Menu Composition</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Populate channel menus from master inventory</p>
                        </div>
                      </div>
                      <Select value={configMode} onValueChange={setConfigMode}>
                        <SelectTrigger className="w-full sm:w-[240px] h-12 border-2 font-black uppercase tracking-widest text-[10px] bg-slate-50">
                          <SelectValue placeholder="Select Channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {seller?.menuTypes?.map(mode => <SelectItem key={mode} value={mode}>{mode}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* CATEGORY VISIBILITY CONTROLS */}
                    <Card className="border-2 shadow-sm overflow-hidden">
                       <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
                          <div className="space-y-0.5">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Category Visibility</CardTitle>
                            <CardDescription className="text-[9px] font-bold uppercase">Toggle sub-menus for {configMode}</CardDescription>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-black uppercase">Channel Config</Badge>
                       </CardHeader>
                       <CardContent className="p-4">
                          <div className="flex flex-wrap gap-2">
                             {compositionCategories.map(cat => {
                               const isFeatured = cat === 'Featured';
                               // Featured is always first and forced on.
                               const isEnabled = isFeatured || (seller?.categoryVisibility?.[configMode]?.includes(cat) ?? true);
                               
                               return (
                                 <button
                                   key={cat}
                                   disabled={isFeatured}
                                   onClick={() => handleToggleCategoryVisibility(cat)}
                                   className={cn(
                                     "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-tight",
                                     isEnabled 
                                       ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                       : "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60",
                                     isFeatured && "border-amber-400 bg-amber-50 text-amber-600 opacity-100 cursor-default"
                                   )}
                                 >
                                   {isEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                   {cat}
                                   {isFeatured && <Badge variant="secondary" className="h-3 px-1 text-[7px] bg-amber-200 text-amber-800 border-0">PRIMARY</Badge>}
                                 </button>
                               );
                             })}
                          </div>
                       </CardContent>
                    </Card>

                    <div className="space-y-12">
                      {compositionCategories.map(cat => {
                        const isFeatured = cat === 'Featured';
                        const isCatEnabled = isFeatured || (seller?.categoryVisibility?.[configMode]?.includes(cat) ?? true);
                        
                        if (!isCatEnabled) return null;

                        const allItemsInCategory = menuItems?.filter(i => i.category === cat) || [];
                        
                        const activeItems = allItemsInCategory
                          .filter(i => i.availableOn?.includes(configMode))
                          .sort((a, b) => {
                            const rankA = a.menuRanks?.[configMode] ?? 999;
                            const rankB = b.menuRanks?.[configMode] ?? 999;
                            return rankA - rankB;
                          });
                        
                        const inactiveItems = allItemsInCategory.filter(i => !i.availableOn?.includes(configMode));

                        return (
                          <div key={cat} className="space-y-6">
                            <div className="flex items-center justify-between border-b-2 pb-2">
                              <div className="flex items-center gap-3">
                                <h5 className="font-headline font-black text-sm uppercase tracking-widest text-[#213147]">{cat}</h5>
                                <Badge variant="secondary" className="text-[9px] font-black uppercase">{activeItems.length} Live</Badge>
                                {inactiveItems.length > 0 && (
                                  <Badge variant="outline" className="text-[9px] font-black uppercase border-dashed text-slate-400">{inactiveItems.length} Master Only</Badge>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingItem(null);
                                  itemForm.reset({ 
                                    name: '', 
                                    description: '', 
                                    price: 0, 
                                    category: cat, 
                                    availableOn: [configMode], 
                                    isAvailable: true 
                                  });
                                  setIsItemFormOpen(true);
                                }}
                                className="h-8 border-2 font-black uppercase text-[8px] tracking-widest gap-1.5 px-3"
                              >
                                <Plus className="h-3 w-3" /> New Item to {cat}
                              </Button>
                            </div>
                            
                            {allItemsInCategory.length === 0 ? (
                              <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-slate-50/50">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No items in Master Inventory for {cat}</p>
                                <Button 
                                  variant="link" 
                                  onClick={() => {
                                    setEditingItem(null);
                                    itemForm.reset({ name: '', description: '', price: 0, category: cat, availableOn: [configMode], isAvailable: true });
                                    setIsItemFormOpen(true);
                                  }}
                                  className="text-primary text-[10px] font-black uppercase"
                                >
                                  Create first item
                                </Button>
                              </div>
                            ) : (
                              <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) => handleDragEnd(e, cat)}
                              >
                                <SortableContext 
                                  items={activeItems.map(i => i.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeItems.map(item => (
                                      <SortableMenuItem 
                                        key={item.id} 
                                        item={item} 
                                        isSelected={true} 
                                        onToggleChannel={() => handleToggleItemInMode(item.id, item.availableOn || [])}
                                        onToggleAvailability={() => toggleItemAvailability(item)}
                                      />
                                    ))}
                                    {inactiveItems.map(item => (
                                      <SortableMenuItem 
                                        key={item.id} 
                                        item={item} 
                                        isSelected={false} 
                                        onToggleChannel={() => handleToggleItemInMode(item.id, item.availableOn || [])}
                                        onToggleAvailability={() => toggleItemAvailability(item)}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center">
                      <h3 className="font-headline font-black text-lg text-[#213147] uppercase">Personnel Registry</h3>
                      <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-[#213147] font-black uppercase text-[10px] h-10 tracking-widest px-4 sm:px-6 shadow-lg">Add New Personnel</Button>
                   </div>
                   <Card className="border-2 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                           <TableHeader className="bg-slate-50 border-b">
                              <TableRow>
                                 <TableHead className="text-[10px] font-black uppercase whitespace-nowrap">Name</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase whitespace-nowrap">Role</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase whitespace-nowrap">PIN</TableHead>
                                 <TableHead className="text-right text-[10px] font-black uppercase whitespace-nowrap">Actions</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {staff?.map(s => (
                                <TableRow key={s.id}>
                                   <TableCell className="font-bold text-xs uppercase text-[#213147] whitespace-nowrap">{s.name}</TableCell>
                                   <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase whitespace-nowrap">{s.role}</Badge></TableCell>
                                   <TableCell><code className="text-xs font-mono font-black text-primary">{s.pin}</code></TableCell>
                                   <TableCell className="text-right whitespace-nowrap">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'sellers', sellerId, 'staff', s.id))}><Trash2 className="h-4 w-4" /></Button>
                                   </TableCell>
                                </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                      </div>
                   </Card>
                </div>
              )}

              {activeNav === 'payments' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <Card className="bg-[#213147] text-white border-0 shadow-xl overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign className="h-24 w-24" /></div>
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-white/60 text-[9px] font-black uppercase tracking-widest">Available Revenue</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-3xl sm:text-4xl font-black font-headline tracking-tighter">${stats?.revenue}</div></CardContent>
                      </Card>
                      <Card className="border-2 border-indigo-100 bg-indigo-50/30">
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-indigo-600/60 text-[9px] font-black uppercase tracking-widest">Platform Fees</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-3xl sm:text-4xl font-black font-headline tracking-tighter text-indigo-700">${stats?.fees}</div></CardContent>
                      </Card>
                      <Card className="border-2 border-amber-100 bg-amber-50/30 sm:col-span-2 md:col-span-1">
                         <CardHeader className="pb-2 pt-6 px-6"><CardDescription className="text-amber-600/60 text-[9px] font-black uppercase tracking-widest">Venue Commission</CardDescription></CardHeader>
                         <CardContent className="px-6 pb-8"><div className="text-3xl sm:text-4xl font-black font-headline tracking-tighter text-amber-700">100%</div></CardContent>
                      </Card>
                   </div>
                </div>
              )}

              {activeNav === 'stripe' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <h3 className="font-headline font-black text-lg text-[#213147] uppercase">Stripe Settings</h3>
                  <Card className="border-2 shadow-sm max-w-2xl">
                    <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                       <div className="space-y-1">
                         <CardTitle className="text-xs font-black uppercase tracking-widest">Stripe Engine</CardTitle>
                         <CardDescription className="text-[9px] uppercase font-bold text-muted-foreground">Revenue disbursement configuration</CardDescription>
                       </div>
                       <Badge className="bg-indigo-600 uppercase text-[8px] font-black">PCI-DSS Secure</Badge>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4">
                       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-2xl border-2 border-indigo-100 gap-4">
                          <div className="flex items-center gap-4">
                             <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ShieldCheck className="h-6 w-6" /></div>
                             <div>
                               <p className="text-[10px] font-black uppercase text-[#213147]">Status: {venueData?.payoutsEnabled ? 'Live' : 'Onboarding'}</p>
                               <p className="text-[8px] font-bold text-indigo-600 uppercase">Payouts Settlement: Direct to Bank</p>
                             </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleVerifyStripe} disabled={isVerifyingStripe} className="w-full sm:w-auto text-[9px] font-black uppercase border-2">{isVerifyingStripe ? <Loader2 className="animate-spin" /> : "Run Diagnostic"}</Button>
                       </div>
                       {verificationResult && <div className="p-3 bg-slate-50 rounded-xl border-2 border-dashed text-center"><p className="text-[8px] font-black uppercase text-indigo-600">{verificationResult.businessName}: {verificationResult.status}</p></div>}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Card className="border-2 shadow-sm">
                         <CardHeader className="bg-slate-50/50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-0.5">
                              <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Revenue Distribution</CardTitle>
                              <CardDescription className="text-[8px] font-bold uppercase">Stacked performance by mode</CardDescription>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border-2">
                               {['Today', 'MTD', 'YTD'].map((r) => (
                                 <button
                                   key={r}
                                   onClick={() => setAnalyticsRange(r as any)}
                                   className={cn(
                                     "px-3 py-1 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all",
                                     analyticsRange === r ? "bg-white text-[#213147] shadow-sm" : "text-slate-400 hover:text-slate-600"
                                   )}
                                 >
                                   {r}
                                 </button>
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
                                        let labelText = "";
                                        if (analyticsRange === 'YTD') {
                                          const count = entry[`${mode}_count`] || 0;
                                          const avg = count > 0 ? (value / count).toFixed(0) : '0';
                                          labelText = `$${avg}`;
                                        } else {
                                          labelText = (entry[`${mode}_count`] || 0).toString();
                                        }

                                        return (
                                          <text
                                            x={x + width / 2}
                                            y={y + height / 2}
                                            fill="#FFFFFF"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize={height < 20 ? 7 : 8}
                                            fontWeight="900"
                                            className="pointer-events-none drop-shadow-sm"
                                          >
                                            {labelText}
                                          </text>
                                        );
                                      }}
                                    />
                                  ))}
                               </BarChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>
                      
                      <Card className="border-2 shadow-sm lg:col-span-1">
                         <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between py-4">
                            <div className="space-y-0.5">
                              <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Revenue Share</CardTitle>
                              <CardDescription className="text-[8px] font-bold uppercase">Channel Mix & Efficiency</CardDescription>
                            </div>
                            <Select value={pieMonthFilter} onValueChange={setPieMonthFilter}>
                              <SelectTrigger className="w-[140px] h-8 text-[9px] font-black uppercase tracking-widest border-2 bg-white">
                                <SelectValue placeholder="All Time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="All">All Time</SelectItem>
                                {availableMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                         </CardHeader>
                         <CardContent className="p-0">
                            <div className="h-[240px] pt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie 
                                      data={pieChartData} 
                                      innerRadius={50} 
                                      outerRadius={70} 
                                      paddingAngle={5} 
                                      dataKey="value"
                                      animationDuration={1000}
                                    >
                                       {pieChartData.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={MODE_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                                       ))}
                                    </Pie>
                                    <ChartTooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                                 </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="px-4 pb-6 space-y-2">
                               {pieChartData.map((data, idx) => (
                                 <div key={data.name} className="flex items-center justify-between p-2.5 rounded-xl border-2 bg-slate-50/30">
                                    <div className="flex items-center gap-2">
                                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MODE_COLORS[data.name] || PIE_COLORS[idx % PIE_COLORS.length] }} />
                                       <span className="text-[10px] font-black uppercase text-[#213147]">{data.name}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                       <div className="text-right">
                                          <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none mb-1">Rev / Orders</p>
                                          <p className="text-[10px] font-black text-[#213147] font-mono">${data.value.toFixed(2)} <span className="text-slate-400">({data.count})</span></p>
                                       </div>
                                       <div className="text-right border-l pl-4">
                                          <p className="text-[8px] font-bold text-muted-foreground uppercase leading-none mb-1">Avg Ticket</p>
                                          <p className="text-[10px] font-black text-primary font-mono">${data.avg.toFixed(2)}</p>
                                       </div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </CardContent>
                      </Card>
                   </div>

                   {/* DETAILED SALES SECTION */}
                   <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-xl text-primary"><FileText className="h-5 w-5" /></div>
                          <div>
                            <h3 className="font-headline font-black text-xl text-[#213147] uppercase leading-tight">Detailed Sales Audit</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction level reporting</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center bg-white border-2 rounded-xl px-3 h-10 gap-2">
                             <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                             <input 
                               type="date" 
                               value={reportStartDate} 
                               onChange={(e) => setReportStartDate(e.target.value)}
                               className="text-[10px] font-black uppercase bg-transparent outline-none"
                             />
                             <span className="text-[10px] text-muted-foreground font-bold">TO</span>
                             <input 
                               type="date" 
                               value={reportEndDate} 
                               onChange={(e) => setReportEndDate(e.target.value)}
                               className="text-[10px] font-black uppercase bg-transparent outline-none"
                             />
                          </div>
                          <Select value={reportModeFilter} onValueChange={setReportModeFilter}>
                            <SelectTrigger className="w-[140px] h-10 border-2 font-black uppercase tracking-widest text-[9px] bg-white">
                              <SelectValue placeholder="All Modes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All">All Modes</SelectItem>
                              {seller?.menuTypes?.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="bg-white p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-center">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Audit Volume</p>
                            <p className="text-xl font-black font-headline text-[#213147]">{detailedReportStats.volume} <span className="text-[10px] text-muted-foreground uppercase font-bold">Tickets</span></p>
                         </div>
                         <div className="bg-white p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-center">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Audit Revenue</p>
                            <p className="text-xl font-black font-headline text-green-600">${detailedReportStats.revenue.toFixed(2)}</p>
                         </div>
                         <Button variant="outline" className="h-full border-2 rounded-2xl gap-2 font-black uppercase text-[10px] tracking-widest">
                            <Download className="h-4 w-4" /> Export Audit Log
                         </Button>
                      </div>

                      <Card className="border-2 shadow-sm overflow-hidden">
                         <div className="overflow-x-auto">
                            <Table>
                               <TableHeader className="bg-slate-50 border-b">
                                  <TableRow>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest">Order ID</TableHead>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest">Timestamp</TableHead>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest">Patron</TableHead>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest">Mode</TableHead>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest">Total</TableHead>
                                     <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Status</TableHead>
                                  </TableRow>
                               </TableHeader>
                               <TableBody>
                                  {detailedReportOrders.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={6} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase">
                                        No transactions found for this audit window.
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    detailedReportOrders.map((o) => (
                                      <TableRow key={o.id}>
                                         <TableCell className="font-mono text-[10px] font-black">#{getNumericOrderId(o.id)}</TableCell>
                                         <TableCell className="text-[10px] font-bold text-slate-500 uppercase">{o.createdAt && typeof o.createdAt.toDate === 'function' ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}</TableCell>
                                         <TableCell className="text-[10px] font-black text-[#213147] uppercase truncate max-w-[120px]">{o.customerName}</TableCell>
                                         <TableCell>
                                            <Badge variant="secondary" className="text-[8px] font-black uppercase">{o.menuType}</Badge>
                                         </TableCell>
                                         <TableCell className="font-mono text-[10px] font-black text-primary">${o.total.toFixed(2)}</TableCell>
                                         <TableCell className="text-right">
                                            <Badge className={cn("text-[8px] font-black uppercase border-0", o.status === 'Delivered' ? 'bg-green-600' : 'bg-slate-400')}>{o.status}</Badge>
                                         </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                               </TableBody>
                            </Table>
                         </div>
                      </Card>
                   </div>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <h3 className="font-headline font-black text-xl text-[#213147] uppercase">Venue Settings</h3>
                     <Button onClick={handleUpdateVenueRegistry} disabled={isProcessingSave} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 gap-2 shadow-xl h-12">
                       {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Terminal
                     </Button>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center gap-3">
                          <Target className="h-4 w-4 text-indigo-600" />
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Venue Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 space-y-4">
                           <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Official Venue Name</Label>
                                <Input value={venueName} onChange={e => setVenueName(e.target.value)} className="border-2 font-bold h-11" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Sales Tax Rate (%)</Label>
                                <Input type="number" value={venueTaxRate} onChange={e => setVenueTaxRate(Number(e.target.value))} className="border-2 font-bold h-11" />
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center gap-3">
                          <Timer className="h-4 w-4 text-primary" />
                          <CardTitle className="text-xs font-black uppercase tracking-widest">Delivery Thresholds</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                           <p className="text-[9px] font-bold text-muted-foreground uppercase mb-6 leading-relaxed">
                             Define fulfill times in minutes. Alerts will trigger based on these settings.
                           </p>
                           <div className="space-y-6">
                              {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                                const thresholds = venueThresholds[mode] || DEFAULT_THRESHOLDS[mode] || { warning: 15, max: 20 };
                                return (
                                  <div key={mode} className="space-y-3 p-4 bg-slate-50 rounded-2xl border-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-black uppercase text-[#213147]">{mode}</span>
                                      <Badge variant="outline" className="text-[8px] font-bold">Active</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <Label className="text-[8px] font-black uppercase text-amber-600">Warn (Min)</Label>
                                          <Input 
                                            type="number" 
                                            min="0"
                                            step="1"
                                            value={thresholds.warning} 
                                            onChange={e => handleThresholdChange(mode, 'warning', e.target.value)} 
                                            className="h-10 border-2 font-bold focus-visible:ring-amber-400"
                                          />
                                       </div>
                                       <div className="space-y-1.5">
                                          <Label className="text-[8px] font-black uppercase text-red-600">Max (Overdue)</Label>
                                          <Input 
                                            type="number" 
                                            min="0"
                                            step="1"
                                            value={thresholds.max} 
                                            onChange={e => handleThresholdChange(mode, 'max', e.target.value)} 
                                            className="h-10 border-2 font-bold focus-visible:ring-red-600"
                                          />
                                       </div>
                                    </div>
                                  </div>
                                );
                              })}
                           </div>
                        </CardContent>
                     </Card>
                   </div>
                </div>
              )}

              {activeNav === 'marketing' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                   <h3 className="font-headline font-black text-lg text-[#213147] uppercase">Marketing</h3>
                   <Card className="max-w-md border-2 text-center p-6 sm:p-8 bg-slate-50 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                      <div className="bg-white p-4 rounded-[2rem] shadow-2xl border-4 border-white mb-6 inline-block">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/sellers/${sellerId}/order`)}`} className="w-40 h-40" alt="" />
                      </div>
                      <h3 className="font-headline font-black text-sm uppercase tracking-tight mb-4">Master Order QR</h3>
                      <div className="grid gap-2">
                         <Button variant="outline" className="h-11 text-[9px] font-black uppercase tracking-widest border-2 gap-2"><Download className="h-4 w-4" /> Download PNG</Button>
                         <Button variant="ghost" className="h-11 text-[9px] font-black uppercase tracking-widest gap-2"><Smartphone className="h-4 w-4" /> View Sample Signs</Button>
                      </div>
                   </Card>
                </div>
              )}

            </div>
          </ScrollArea>
        </main>

        <aside className={cn(
          "bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-l-4 border-primary/20 shrink-0 shadow-2xl z-20",
          sidebarOpen ? "w-64" : "w-20"
        )}>
          <SideBarContent />
        </aside>
      </div>

      {/* ITEM DIALOG */}
      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="rounded-3xl sm:rounded-[2.5rem] border-2 max-w-xl">
           <DialogHeader>
              <DialogTitle className="font-headline font-black uppercase text-[#213147]">
                {editingItem ? 'Edit Master Record' : 'New Inventory Item'}
              </DialogTitle>
           </DialogHeader>
           <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-6 pt-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField 
                      control={itemForm.control} 
                      name="name" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Display Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 border-2 font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={itemForm.control} 
                      name="category" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField 
                      control={itemForm.control} 
                      name="price" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} className="h-12 border-2 font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={itemForm.control} 
                      name="imageUrl" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-11 border-2 font-bold" />
                          </FormControl>
                        </FormItem>
                      )} 
                    />
                 </div>
                 <Button type="submit" className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-xs shadow-xl">{editingItem ? 'Update Registry' : 'Add to Inventory'}</Button>
              </form>
           </Form>
        </DialogContent>
      </Dialog>

      {/* STAFF DIALOG */}
      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="rounded-3xl sm:rounded-[2.5rem] border-2 max-w-md">
           <DialogHeader>
              <DialogTitle className="font-headline font-black uppercase text-[#213147]">
                {editingStaff ? 'Edit Credentials' : 'New Personnel'}
              </DialogTitle>
           </DialogHeader>
           <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6 pt-4">
                 <FormField 
                   control={staffForm.control} 
                   name="name" 
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-[10px] font-black uppercase">Full Name</FormLabel>
                       <FormControl>
                         <Input {...field} className="h-12 border-2 font-bold uppercase" />
                       </FormControl>
                     </FormItem>
                   )} 
                 />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField 
                      control={staffForm.control} 
                      name="role" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Driver">Driver (BevCart)</SelectItem>
                              <SelectItem value="Server">Server (Clubhouse)</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={staffForm.control} 
                      name="pin" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">4-Digit PIN</FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={4} className="h-12 border-2 font-mono text-xl font-black text-center tracking-[0.5em] text-primary" />
                          </FormControl>
                        </FormItem>
                      )} 
                    />
                 </div>
                 <Button type="submit" className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-xs shadow-xl">Save Registry</Button>
              </form>
           </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
