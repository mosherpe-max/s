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
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LayoutDashboard,
  UtensilsCrossed,
  Zap,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Loader2,
  LogOut,
  Clock,
  DollarSign,
  ShoppingBag,
  Save,
  Library,
  Power,
  Tags,
  Sparkles,
  Wand2,
  PanelLeft,
  ChevronRightSquare,
  TrendingUp,
  Mail,
  Phone,
  Search,
  Trash2,
  Calendar as CalendarIcon,
  QrCode,
  Image as LucideImage,
  Download,
  Package,
  Menu,
  HeartPulse,
  ClipboardCheck,
  Timer,
  Activity,
  Info,
  User,
  Star,
  CreditCard,
  Banknote,
  Percent,
  Smartphone,
  X,
  Building,
  ChevronLeft,
  GripVertical
} from 'lucide-react';
import Image from 'next/image';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
import { 
  isToday, 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  differenceInMinutes, 
  differenceInSeconds,
  startOfMonth,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachHourOfInterval,
  isSameHour,
  isSameDay,
  isSameMonth,
  endOfMonth,
  endOfYear
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, ModifierGroup, SolutionConfig, OrderFulfillmentThresholds, Venue, Category } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  imageUrl: z.string().default(''),
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

interface SortableItemProps {
  item: MenuItem;
  mode: string;
  isFeatured?: boolean;
  onToggleAvailability: (itemId: string, enabled: boolean) => void;
  onToggleFeatured: (itemId: string, enabled: boolean) => void;
}

function SortableItem({ item, mode, isFeatured, onToggleAvailability, onToggleFeatured }: SortableItemProps) {
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
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1
  };

  const isEnabled = item.availableOn?.includes(mode);
  const isFeatureActive = item.featuredOn?.includes(mode);

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all bg-white mb-2",
        isEnabled ? "border-slate-100 shadow-sm" : "opacity-50 grayscale border-dashed border-slate-200"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 border">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <LucideImage className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase text-[#213147] truncate">{item.name}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">${item.price.toFixed(2)}</p>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => onToggleFeatured(item.id, !isFeatureActive)}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
            isFeatureActive ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-500 hover:bg-amber-50"
          )}
        >
          <Star className={cn("h-4 w-4", isFeatureActive && "fill-current")} />
        </button>
        <Switch 
          checked={isEnabled} 
          onCheckedChange={(val) => onToggleAvailability(item.id, val)}
          className="data-[state=checked]:bg-green-600"
        />
      </div>
    </div>
  );
}

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
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDateRange, setOrderDateRange] = useState<'today' | '7days' | '30days' | 'all'>('today');
  const [patronSearchTerm, setPatronSearchTerm] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState<'today' | 'mtd' | 'ytd'>('mtd');

  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isStarterMenuConfirmOpen, setIsStarterMenuConfirmOpen] = useState(false);
  const [isStarterItemsConfirmOpen, setIsStarterItemsConfirmOpen] = useState(false);

  const [activeModeForMenu, setActiveModeForMenu] = useState<string | null>(null);

  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isApplyingStarter, setIsApplyingStarter] = useState(false);
  const [isApplyingStarterItems, setIsApplyingStarterItems] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig, isLoading: isConfigLoading } = useDoc<SolutionConfig>(configRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modifierGroupsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: modifierGroups } = useCollection<ModifierGroup>(modifierGroupsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffListQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffListQuery);

  const [fulfillmentSettings, setFulfillmentSettings] = useState<Record<string, OrderFulfillmentThresholds>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (seller && solutionConfig) {
      const activeModes = seller.menuTypes || [];
      const initial: Record<string, OrderFulfillmentThresholds> = {};
      
      activeModes.forEach(mode => {
        initial[mode] = seller.orderThresholds?.[mode] || 
                        solutionConfig.orderThresholds?.[mode] || 
                        { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 };
      });
      
      setFulfillmentSettings(initial);
    }
  }, [seller, solutionConfig]);

  const onSaveModeSettings = async () => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    try {
      await updateDoc(doc(firestore, 'sellers', sellerId), {
        orderThresholds: fulfillmentSettings,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Service Rules Saved" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsProcessingSave(false);
    }
  };

  const updateThreshold = (mode: string, field: keyof OrderFulfillmentThresholds, value: number) => {
    setFulfillmentSettings(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  const handleToggleItemAvailability = async (itemId: string, enabled: boolean) => {
    if (!firestore || !sellerId || !activeModeForMenu) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    const item = menuItems?.find(i => i.id === itemId);
    if (!item) return;

    const currentModes = item.availableOn || [];
    const nextModes = enabled 
      ? [...currentModes, activeModeForMenu]
      : currentModes.filter(m => m !== activeModeForMenu);

    updateDoc(itemRef, { availableOn: Array.from(new Set(nextModes)), updatedAt: serverTimestamp() });
  };

  const handleToggleItemFeatured = async (itemId: string, enabled: boolean) => {
    if (!firestore || !sellerId || !activeModeForMenu) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    const item = menuItems?.find(i => i.id === itemId);
    if (!item) return;

    const currentFeatured = item.featuredOn || [];
    const nextFeatured = enabled 
      ? [...currentFeatured, activeModeForMenu]
      : currentFeatured.filter(m => m !== activeModeForMenu);

    updateDoc(itemRef, { featuredOn: Array.from(new Set(nextFeatured)), updatedAt: serverTimestamp() });
  };

  const handleDragEnd = async (event: DragEndEvent, category: string, isFeatured?: boolean) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeModeForMenu || !menuItems || !firestore) return;

    const itemsInCategory = menuItems
      .filter(i => isFeatured ? i.featuredOn?.includes(activeModeForMenu) : (i.category === category && i.availableOn?.includes(activeModeForMenu)))
      .sort((a, b) => {
        const rankField = isFeatured ? 'featuredRanks' : 'menuRanks';
        const rankA = a[rankField]?.[activeModeForMenu] ?? 999;
        const rankB = b[rankField]?.[activeModeForMenu] ?? 999;
        return rankA - rankB;
      });

    const oldIndex = itemsInCategory.findIndex(i => i.id === active.id);
    const newIndex = itemsInCategory.findIndex(i => i.id === over.id);

    const reordered = arrayMove(itemsInCategory, oldIndex, newIndex);
    const batch = writeBatch(firestore);

    reordered.forEach((item, index) => {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
      const rankField = isFeatured ? `featuredRanks.${activeModeForMenu}` : `menuRanks.${activeModeForMenu}`;
      batch.update(itemRef, { [rankField]: index });
    });

    await batch.commit();
    toast({ title: "Priority Updated" });
  };

  const analyticsData = useMemo(() => {
    if (!orders || !seller || !solutionConfig) return { dailyRevenue: [], topItems: [], channelSplit: [], avgFulfillment: [], operationalHealth: [] };
    
    const now = new Date();
    let rangeStart = startOfMonth(now);
    let rangeEnd = endOfMonth(now);

    if (analyticsRange === 'today') {
      rangeStart = startOfDay(now);
      rangeEnd = endOfDay(now);
    } else if (analyticsRange === 'mtd') {
      rangeStart = startOfMonth(now);
      rangeEnd = endOfMonth(now);
    } else if (analyticsRange === 'ytd') {
      rangeStart = startOfYear(now);
      rangeEnd = endOfYear(now);
    }

    const filteredOrders = orders.filter(o => {
      if (!o.createdAt || o.status === 'Cancelled') return false;
      const orderDate = o.createdAt.toDate();
      return orderDate >= rangeStart && orderDate <= rangeEnd;
    });

    let revenueData = [];
    const modes = seller.menuTypes || [];
    
    if (analyticsRange === 'today') {
      const hours = eachHourOfInterval({ start: startOfDay(now), end: endOfDay(now) });
      revenueData = hours.map(h => {
        const bucket: any = { name: format(h, 'ha') };
        modes.forEach(m => bucket[m] = 0);
        
        filteredOrders
          .filter(o => isSameHour(o.createdAt.toDate(), h))
          .forEach(o => {
            bucket[o.menuType] = (bucket[o.menuType] || 0) + (o.subtotal || 0);
          });
        return bucket;
      });
    } else if (analyticsRange === 'mtd') {
      const days = eachDayOfInterval({ start: startOfMonth(now), end: now });
      revenueData = days.map(d => {
        const bucket: any = { name: format(d, 'MMM d') };
        modes.forEach(m => bucket[m] = 0);

        filteredOrders
          .filter(o => isSameDay(o.createdAt.toDate(), d))
          .forEach(o => {
            bucket[o.menuType] = (bucket[o.menuType] || 0) + (o.subtotal || 0);
          });
        return bucket;
      });
    } else {
      const months = eachMonthOfInterval({ start: startOfYear(now), end: now });
      revenueData = months.map(m => {
        const bucket: any = { name: format(m, 'MMM') };
        modes.forEach(m => bucket[m] = 0);

        filteredOrders
          .filter(o => isSameMonth(o.createdAt.toDate(), m))
          .forEach(o => {
            bucket[o.menuType] = (bucket[o.menuType] || 0) + (o.subtotal || 0);
          });
        return bucket;
      });
    }

    const itemMap: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(i => {
        itemMap[i.name] = (itemMap[i.name] || 0) + i.quantity;
      });
    });

    const topItems = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const activeModes = seller.menuTypes || [];
    const healthDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'MMM d');
      const start = startOfDay(d);
      const end = endOfDay(d);
      
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.toDate() >= start && o.createdAt.toDate() <= end);
      
      const dayStats: any = { name: key };
      activeModes.forEach(mode => {
        const modeOrders = dayOrders.filter(o => o.menuType === mode && o.status === 'Delivered' && o.deliveredAt);
        if (modeOrders.length > 0) {
          const totalTime = modeOrders.reduce((acc, o) => acc + differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()), 0);
          dayStats[mode] = parseFloat((totalTime / modeOrders.length).toFixed(1));
        } else {
          dayStats[mode] = 0;
        }
      });
      healthDays.push(dayStats);
    }

    const incidentReport = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'MMM d');
      const start = startOfDay(d);
      const end = endOfDay(d);
      
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.toDate() >= start && o.createdAt.toDate() <= end);
      
      let ackMaxCount = 0;
      let warnCount = 0;
      let maxCount = 0;

      dayOrders.forEach(o => {
        const t = seller.orderThresholds?.[o.menuType] || solutionConfig.orderThresholds?.[o.menuType] || { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 };
        
        if (o.acknowledgedAt) {
          const ackSeconds = differenceInSeconds(o.acknowledgedAt.toDate(), o.createdAt.toDate());
          if (ackSeconds > t.maxOrderAcknowledgeSeconds) ackMaxCount++;
        }
        
        if (o.deliveredAt) {
          const fullMinutes = differenceInMinutes(o.deliveredAt.toDate(), o.createdAt.toDate());
          if (fullMinutes > t.maxOrderProcessingMinutes) maxCount++;
          else if (fullMinutes > t.warningOrderProcessingMinutes) warnCount++;
        }
      });

      incidentReport.push({
        name: key,
        'Acknowledge Max': ackMaxCount,
        'Fulfillment Warning': warnCount,
        'Fulfillment Max': maxCount
      });
    }

    return { dailyRevenue: revenueData, topItems, avgFulfillment: healthDays, operationalHealth: incidentReport };
  }, [orders, seller, solutionConfig, analyticsRange]);

  const patrons = useMemo(() => {
    if (!orders) return [];
    const patronMap: Record<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      orderCount: number;
      totalSpent: number;
      lastOrder: Date | null;
      isSaved: boolean;
    }> = {};

    orders.forEach(o => {
      const key = o.customerEmail?.toLowerCase() || o.customerPhone || `guest-${o.id}`;
      if (!patronMap[key]) {
        patronMap[key] = {
          id: key,
          name: o.customerName || 'Guest Patron',
          email: o.customerEmail || 'N/A',
          phone: o.customerPhone || 'N/A',
          orderCount: 0,
          totalSpent: 0,
          lastOrder: null,
          isSaved: !!o.buyerProfileId && o.buyerProfileId !== 'anonymous'
        };
      }
      
      if (o.status !== 'Cancelled') {
        patronMap[key].orderCount += 1;
        patronMap[key].totalSpent += (o.total || 0);
        const orderDate = o.createdAt?.toDate();
        if (orderDate && (!patronMap[key].lastOrder || orderDate > patronMap[key].lastOrder)) {
          patronMap[key].lastOrder = orderDate;
        }
      }
    });

    const filtered = Object.values(patronMap).filter(p => {
      if (!patronSearchTerm) return true;
      const s = patronSearchTerm.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.phone.includes(s);
    });

    return filtered.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders, patronSearchTerm]);

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
      list = list.filter(o => o.customerName.toLowerCase().includes(s) || o.id.toLowerCase().includes(s) || o.customerPhone.includes(s));
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

  const staffForm = useForm<StaffFormData>({ resolver: zodResolver(staffSchema), defaultValues: { name: '', role: 'Staff', pin: '', isActive: true } });
  const itemForm = useForm<ItemFormData>({ resolver: zodResolver(itemSchema), defaultValues: { name: '', description: '', price: 0, category: 'Other', isAvailable: true, imageUrl: '', availableOn: [], featuredOn: [], modifierGroupIds: [] } });
  const modifierGroupForm = useForm<ModifierGroupFormData>({ resolver: zodResolver(modifierGroupSchema), defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] } });

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

  const onSaveItem = async (data: ItemFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingItem?.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'menuItems', id), { ...data, id, rank: editingItem?.rank || 99, createdAt: editingItem?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    setIsItemFormOpen(false);
    setIsProcessingSave(false);
    toast({ title: editingItem ? "Item Updated" : "Item Added" });
  };

  const onSaveModifierGroup = async (data: ModifierGroupFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingModifierGroup?.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'modifier_groups', id), { 
      ...data, 
      id, 
      sellerId, 
      updatedAt: serverTimestamp(),
      createdAt: editingModifierGroup?.createdAt || serverTimestamp() 
    }, { merge: true });
    setIsModifierGroupFormOpen(false);
    setIsProcessingSave(false);
    toast({ title: editingModifierGroup ? "Modifier Updated" : "Modifier Added" });
  };

  const handleApplyStarterMenu = async () => {
    if (!firebaseApp || !sellerId || !seller) {
      toast({ variant: "destructive", title: "Error", description: "Establishment data is still loading. Please try again." });
      return;
    }
    
    setIsApplyingStarter(true);
    try {
      const type = seller.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyStarter = httpsCallable(functions, 'applyStarterMenu');
      
      const result = await applyStarter({ venueId: sellerId, venueType: type });
      const data = result.data as { totalCreated: number; status: string };
      
      if (data.status === 'success') {
        toast({ title: "Modifiers Provisioned", description: `Added ${data.totalCreated} modifier groups to your library.` });
        setIsStarterMenuConfirmOpen(false);
      } else {
        throw new Error(data.status === 'no_templates_found' ? "No modifier templates found for your venue type." : "Unknown error occurred.");
      }
    } catch (error: any) { 
      console.error("[VenueAdmin] applyStarterMenu error:", error);
      toast({ variant: "destructive", title: "Setup Failed", description: error.message || "Failed to call provisioning function." }); 
    } finally { 
      setIsApplyingStarter(false); 
    }
  };

  const handleApplyStarterItems = async () => {
    if (!firebaseApp || !sellerId || !seller) {
      toast({ variant: "destructive", title: "Error", description: "Establishment data is still loading. Please try again." });
      return;
    }
    
    setIsApplyingStarterItems(true);
    try {
      const type = seller.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyItems = httpsCallable(functions, 'applyStarterItems');
      
      const result = await applyItems({ venueId: sellerId, venueType: type });
      const data = result.data as { totalCreated: number; status: string };
      
      if (data.status === 'success') {
        toast({ title: "Menu Items Provisioned", description: `Cloned ${data.totalCreated} items to your catalog.` });
        setIsStarterItemsConfirmOpen(false);
      } else {
        throw new Error(data.status === 'no_templates_found' ? "No menu templates found for your venue type." : "Unknown error occurred.");
      }
    } catch (error: any) { 
      console.error("[VenueAdmin] applyStarterItems error:", error);
      toast({ variant: "destructive", title: "Setup Failed", description: error.message || "Failed to call provisioning function." }); 
    } finally { 
      setIsApplyingStarterItems(false); 
    }
  };

  const handleImpersonate = (mode: string) => {
    localStorage.setItem('koop_is_admin_session', 'true');
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

  const handleToggleModeStatus = async (mode: string, currentState: boolean) => {
    if (!firestore || !sellerId) return;
    const fieldMap: Record<string, string> = { 
      'Beverage Cart': 'bevcartActive', 
      'Clubhouse': 'clubhouseActive', 
      'Lane Delivery': 'lanedeliveryActive' 
    };
    const field = fieldMap[mode];
    if (!field) return;

    try {
      await updateDoc(doc(firestore, 'sellers', sellerId), {
        [field]: !currentState,
        updatedAt: serverTimestamp()
      });
      toast({ title: `${mode} ${!currentState ? 'Activated' : 'Deactivated'}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Toggle Failed", description: e.message });
    }
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ClipboardCheck },
    { id: "patrons", label: "Patrons", icon: User },
    { id: "modes", label: "Service Modes", icon: Zap },
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

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="flex flex-col h-screen overflow-x-auto bg-[#F8FAFC] text-left">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-6 w-6 text-[#213147]" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#213147] border-0 p-0 text-white">
              <SheetHeader className="p-6 border-b border-white/5 text-left"><StylizedKoopLogo size="md" /><SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Venue Control</SheetTitle></SheetHeader>
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
          <Badge variant="outline" className="hidden sm:flex text-[8px] font-black uppercase tracking-widest bg-slate-50">{seller?.type}</Badge>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">{sidebarOpen && <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Navigation</p>}<Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">{sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}</Button></div>
          <ScrollArea className="flex-1 p-3"><NavContent /></ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto relative">
          <div className="p-8">
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
                    <CardHeader className="bg-[#213147] text-white py-5 border-b"><div className="flex items-center gap-3"><Power className="h-5 w-5 text-primary" /><div className="text-left"><CardTitle className="text-xs font-black uppercase tracking-widest">Service Control Terminal</CardTitle><p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Activate fulfillment channels and monitor signals</p></div></div></CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(mode => seller?.menuTypes?.includes(mode)).map(mode => {
                          const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                          const isActive = !!(seller as any)?.[fieldMap[mode]];
                          return (
                            <div key={mode} className={cn("p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 relative group", isActive ? "border-primary bg-primary/5 shadow-inner" : "bg-slate-50 opacity-60 grayscale")}>
                              <div className="absolute top-4 right-4">
                                <Switch 
                                  checked={isActive} 
                                  onCheckedChange={() => handleToggleModeStatus(mode, isActive)} 
                                  className="data-[state=checked]:bg-green-600"
                                />
                              </div>

                              <div className={cn("p-3 rounded-2xl transition-all shadow-lg", isActive ? "bg-primary text-white scale-110" : "bg-slate-200 text-slate-400")}><Zap className="h-6 w-6" /></div>
                              <div className="text-center"><p className="text-11px font-black uppercase tracking-widest text-[#213147]">{mode}</p><Badge variant="outline" className={cn("mt-2 text-[8px] font-black uppercase", isActive ? "LIVE SIGNAL" : "INACTIVE")}>{isActive ? "LIVE SIGNAL" : "INACTIVE"}</Badge></div>
                              <div className="flex flex-col w-full gap-2 mt-2">
                                <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm" onClick={() => handleImpersonate(mode)}>Enter Channel</Button>
                                <Button variant="secondary" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase gap-1.5" onClick={() => setActiveModeForMenu(mode)}><UtensilsCrossed className="h-3.5 w-3.5" /> Manage Menu</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-6 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Analytics</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Revenue and Operational Health metrics</p>
                    </div>
                    <div className="flex gap-3">
                      <Select value={analyticsRange} onValueChange={(v: any) => setAnalyticsRange(v)}>
                        <SelectTrigger className="h-11 border-2 rounded-xl w-40 text-[10px] font-black uppercase tracking-widest bg-white">
                          <CalendarIcon className="h-3 w-3 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="mtd">Month to Date</SelectItem>
                          <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" className="h-11 border-2 font-black uppercase text-[10px] gap-2 bg-white">
                        <Download className="h-4 w-4" /> Export
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#213147] flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-primary" /> Commercial Performance
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <Card className="border-2 p-8 space-y-6 lg:col-span-2">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-primary" /> 
                          {analyticsRange === 'today' ? 'Hourly Sales' : analyticsRange === 'mtd' ? 'Daily Sales' : 'Monthly Sales'} Trend
                        </h4>
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.dailyRevenue}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                              <ChartTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: '2px solid #f1f5f9' }} />
                              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                              {seller?.menuTypes?.map((mode, idx) => (
                                <Bar 
                                  key={mode} 
                                  stackId="a" 
                                  dataKey={mode} 
                                  fill={['#E50000', '#213147', '#4F46E5'][idx % 3]} 
                                  radius={[0, 0, 0, 0]} 
                                  barSize={analyticsRange === 'today' ? 15 : 30} 
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                      
                      <Card className="border-2 p-6 space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Top Items ({analyticsRange.toUpperCase()})</h4>
                        <div className="space-y-4">
                          {analyticsData.topItems.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground opacity-30"><ShoppingBag className="h-8 w-8 mx-auto mb-2" /><p className="text-[8px] font-black uppercase">No Sales</p></div>
                          ) : analyticsData.topItems.map((item, idx) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-white bg-[#213147] h-5 w-5 rounded flex items-center justify-center">{idx + 1}</span>
                                <span className="text-xs font-bold uppercase truncate max-w-[120px]">{item.name}</span>
                              </div>
                              <span className="text-xs font-black text-primary">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-8 pb-10">
                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#213147] flex items-center gap-3">
                      <HeartPulse className="h-4 w-4 text-primary" /> Operational Health (Past 7 Days)
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Card className="border-2 p-8 space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          <Timer className="h-3 w-3 text-primary" /> Avg Fulfillment (Minutes)
                        </h4>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.avgFulfillment}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                              <ChartTooltip contentStyle={{ borderRadius: '1rem', border: '2px solid #f1f5f9' }} />
                              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                              {seller?.menuTypes?.map((mode, idx) => (
                                <Line 
                                  key={mode} 
                                  type="monotone" 
                                  dataKey={mode} 
                                  stroke={['#E50000', '#213147', '#4F46E5'][idx % 3]} 
                                  strokeWidth={3} 
                                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      <Card className="border-2 p-8 space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          <Activity className="h-3 w-3 text-primary" /> Service Exceptions
                        </h4>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.operationalHealth}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                              <ChartTooltip cursor={{fill: '#f8fafc'}} />
                              <Legend verticalAlign="top" align="right" iconType="rect" wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                              <Bar dataKey="Acknowledge Max" stackId="a" fill="#213147" barSize={30} />
                              <Bar dataKey="Fulfillment Warning" stackId="a" fill="#f59e0b" barSize={30} />
                              <Bar dataKey="Fulfillment Max" stackId="a" fill="#ef4444" barSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-6 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Fulfillment Log</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Monitor establishment queue and history</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search orders..." className="pl-10 h-10 border-2 rounded-xl text-xs w-64" value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} />
                      </div>
                      <Select value={orderDateRange} onValueChange={(v: any) => setOrderDateRange(v)}>
                        <SelectTrigger className="h-10 border-2 rounded-xl w-40 text-[10px] font-black uppercase tracking-widest">
                          <CalendarIcon className="h-3 w-3 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border-2 rounded-[2.5rem] overflow-hidden bg-white shadow-sm overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase h-14 px-8">Ticket</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14">Customer</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14">Channel</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14">Items</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14 text-right px-8">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map(o => (
                          <TableRow key={o.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 py-5">
                              <p className="font-mono font-black text-xs text-[#213147]">#{getNumericOrderId(o.id)}</p>
                              <p className="text-[9px] text-muted-foreground uppercase mt-0.5">{o.createdAt ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-black text-sm text-[#213147] uppercase">{o.customerName}</p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold">{o.customerPhone}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">{o.menuType}</Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs font-medium text-slate-600 line-clamp-1">{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                            </TableCell>
                            <TableCell className="text-right px-8">
                              <Badge className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full", o.status === 'Delivered' ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700")}>{o.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {activeNav === 'patrons' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-6 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Patron Directory</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customers with saved profiles</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search patrons..." 
                        className="pl-10 h-11 border-2 rounded-xl text-xs w-72 bg-white" 
                        value={patronSearchTerm} 
                        onChange={(e) => setPatronSearchTerm(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="border-2 rounded-[2.5rem] overflow-hidden bg-white shadow-sm overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase h-14 px-8">Patron</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14">Contact Info</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14 text-center">Orders</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14 text-right">LTV</TableHead>
                          <TableHead className="text-[10px] font-black uppercase h-14 text-right px-8">Last Seen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patrons.map((patron) => (
                          <TableRow key={patron.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="bg-[#213147] h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                                  {patron.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-black text-sm text-[#213147]">{patron.name}</p>
                                    {patron.isSaved && <Star className="h-3 w-3 text-primary fill-primary" />}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-left">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                  <Mail className="h-3 w-3 text-muted-foreground" /> {patron.email}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                  <Phone className="h-3 w-3 text-muted-foreground" /> {patron.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-slate-100 text-slate-700 border-0 font-black px-2">{patron.orderCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-mono font-black text-sm text-primary">${patron.totalSpent.toFixed(2)}</p>
                            </TableCell>
                            <TableCell className="text-right px-8">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">
                                {patron.lastOrder ? format(patron.lastOrder, 'MMM d, yyyy') : 'N/A'}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {activeNav === 'modes' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-6 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Service Mode Terminal</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage menu visibility and delivery channels</p>
                    </div>
                    <Button onClick={onSaveModeSettings} disabled={isProcessingSave} className="bg-[#213147] font-black uppercase text-[10px] gap-2 h-11 px-6 shadow-xl">
                      {isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Mode Settings
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(m => seller?.menuTypes?.includes(m)).map((mode) => {
                      const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                      const isActive = !!(seller as any)?.[fieldMap[mode]];
                      
                      return (
                        <Card key={mode} className={cn("border-2 shadow-sm overflow-hidden", !isActive && "opacity-60")}>
                          <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-xl", isActive ? "bg-primary text-white" : "bg-slate-200 text-slate-400")}>
                                <Zap className="h-4 w-4" />
                              </div>
                              <div className="text-left">
                                <CardTitle className="text-xs font-black uppercase tracking-widest">{mode}</CardTitle>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">{isActive ? 'Receiving Orders' : 'Offline'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase text-muted-foreground">Mode Switch</span>
                              <Switch checked={isActive} onCheckedChange={() => handleToggleModeStatus(mode, isActive)} />
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                  <Menu className="h-3 w-3" /> Menu Control
                                </h4>
                                <Button variant="secondary" size="sm" className="h-7 text-[8px] font-black uppercase shadow-sm" onClick={() => setActiveModeForMenu(mode)}>Open Menu Manager</Button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {categories.filter(c => c !== 'Featured').map(cat => {
                                  const isVisible = seller?.categoryVisibility?.[mode]?.includes(cat) ?? true;
                                  return (
                                    <div key={cat} className="flex items-center space-x-3 p-2 rounded-lg border-2 bg-slate-50/50">
                                      <Checkbox 
                                        id={`${mode}-${cat}`} 
                                        checked={isVisible} 
                                        onCheckedChange={(checked) => {
                                          const currentVisibility = seller?.categoryVisibility?.[mode] || categories.filter(c => c !== 'Featured');
                                          const nextVisibility = checked 
                                            ? [...currentVisibility, cat]
                                            : currentVisibility.filter(c => c !== cat);
                                          updateDoc(doc(firestore!, 'sellers', sellerId), {
                                            [`categoryVisibility.${mode}`]: nextVisibility
                                          });
                                        }} 
                                      />
                                      <label htmlFor={`${mode}-${cat}`} className="text-[9px] font-black uppercase cursor-pointer truncate">{cat}</label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <Separator className="opacity-50" />

                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
                                <Timer className="h-3 w-3" /> Fulfillment Rules
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1 text-left">
                                  <Label className="text-[8px] font-black uppercase text-muted-foreground">Ack (sec)</Label>
                                  <Input 
                                    type="number" 
                                    value={fulfillmentSettings[mode]?.maxOrderAcknowledgeSeconds} 
                                    onChange={(e) => updateThreshold(mode, 'maxOrderAcknowledgeSeconds', parseInt(e.target.value))} 
                                    className="h-8 text-[10px] font-black border-2"
                                  />
                                </div>
                                <div className="space-y-1 text-left">
                                  <Label className="text-[8px] font-black uppercase text-muted-foreground">Warn (min)</Label>
                                  <Input 
                                    type="number" 
                                    value={fulfillmentSettings[mode]?.warningOrderProcessingMinutes} 
                                    onChange={(e) => updateThreshold(mode, 'warningOrderProcessingMinutes', parseInt(e.target.value))} 
                                    className="h-8 text-[10px] font-black border-2"
                                  />
                                </div>
                                <div className="space-y-1 text-left">
                                  <Label className="text-[8px] font-black uppercase text-muted-foreground">Max (min)</Label>
                                  <Input 
                                    type="number" 
                                    value={fulfillmentSettings[mode]?.maxOrderProcessingMinutes} 
                                    onChange={(e) => updateThreshold(mode, 'maxOrderProcessingMinutes', parseInt(e.target.value))} 
                                    className="h-8 text-[10px] font-black border-2"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-4 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Master Menu Library</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global product catalog for this establishment</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsStarterItemsConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] gap-2 bg-white">
                        <Library className="h-4 w-4 text-indigo-600" /> Apply Starter Items
                      </Button>
                      <Button onClick={() => { setEditingItem(null); itemForm.reset({ name: '', description: '', price: 0, category: 'Other', isAvailable: true, imageUrl: '', availableOn: [], featuredOn: [], modifierGroupIds: [] }); setIsItemFormOpen(true); }} className="bg-primary h-12 px-6 font-black uppercase text-[10px] gap-2 shadow-xl">
                        <Plus className="h-4 w-4" /> Add New Product
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {menuItems?.map(item => (
                      <Card key={item.id} className="border-2 shadow-sm group bg-white relative text-left overflow-hidden">
                        <div className="relative aspect-video w-full bg-slate-100 border-b overflow-hidden">
                          {item.imageUrl ? (
                            <Image 
                              src={item.imageUrl} 
                              alt={item.name} 
                              fill 
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-300">
                              <LucideImage className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-start justify-between space-y-0">
                          <div className="space-y-0.5 text-left">
                            <p className="font-black text-xs uppercase text-[#213147] truncate max-w-[140px]">{item.name}</p>
                            <p className="text-[10px] font-bold text-primary font-mono">${item.price.toFixed(2)}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100" onClick={() => { setEditingItem(item); itemForm.reset(item as any); setIsItemFormOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-left">
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{item.description || 'No description provided.'}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.availableOn?.length ? item.availableOn.map(m => (<Badge key={m} variant="secondary" className="text-[7px] px-1 h-3.5 border-0 uppercase">{m.split(' ')[0]}</Badge>)) : <span className="text-[7px] font-black text-slate-300 uppercase">Not Assigned</span>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'modifiers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 pb-4 gap-4">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Customization Sets</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global modifiers and options library</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsStarterMenuConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] gap-2 bg-white">
                        <Tags className="h-4 w-4 text-indigo-600" /> Provision Starters
                      </Button>
                      <Button onClick={() => { setEditingModifierGroup(null); modifierGroupForm.reset({ name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] }); setIsModifierGroupFormOpen(true); }} className="bg-indigo-600 h-12 px-6 font-black uppercase text-[10px] gap-2 shadow-xl">
                        <Plus className="h-4 w-4" /> New Modifier Set
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modifierGroups?.map(group => (
                      <Card key={group.id} className="border-2 shadow-sm group bg-white text-left">
                        <CardHeader className="p-5 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                          <div className="space-y-1 text-left">
                            <p className="font-black text-xs uppercase text-[#213147]">{group.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[7px] font-black bg-indigo-100 text-indigo-700 uppercase h-3.5 px-1">{group.minSelection > 0 ? 'Required' : 'Optional'}</Badge>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Min {group.minSelection} / Max {group.maxSelection}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100" onClick={() => { setEditingModifierGroup(group); modifierGroupForm.reset(group as any); setIsModifierGroupFormOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-5 flex flex-wrap gap-2 text-left">
                          {group.options.map((opt, idx) => (<Badge key={idx} variant="outline" className="text-[9px] font-bold uppercase border-slate-100 bg-white shadow-sm">{opt.name} {opt.priceAdjustment > 0 && <span className="text-primary ml-1">+${opt.priceAdjustment.toFixed(2)}</span>}</Badge>))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Personnel Registry</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage fulfillment staff and security PINs</p>
                    </div>
                    <Button onClick={() => { setEditingStaff(null); staffForm.reset({ name: '', role: 'Staff', pin: '', isActive: true }); setIsStaffFormOpen(true); }} className="bg-indigo-600 h-12 px-6 font-black uppercase text-[10px] shadow-xl">
                      <Plus className="h-4 w-4" /> New Staff Member
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staffList?.map(s => (
                      <Card key={s.id} className="border-2 shadow-sm group bg-white overflow-hidden text-left">
                        <CardHeader className="p-6 pb-4 flex flex-row items-center gap-4 relative">
                          <div className="bg-slate-100 p-3 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-colors shadow-inner">
                            <Users className="h-6 w-6" />
                          </div>
                          <div className="text-left">
                            <p className="font-black text-sm uppercase text-[#213147] tracking-tight">{s.name}</p>
                            <Badge variant="secondary" className="text-[8px] font-black uppercase mt-1 px-1.5 h-4 border-0">{s.role}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => { setEditingStaff(s); staffForm.reset(s as any); setIsStaffFormOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="space-y-0.5 text-left">
                              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Secure Access PIN</p>
                              <p className="text-sm font-black font-mono tracking-[0.4em] text-indigo-600">{s.pin}</p>
                            </div>
                            <Badge className={cn("text-[8px] font-black uppercase px-2 h-4 border-0", s.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'marketing' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6 text-left"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Growth & Signage</h3></div>
                  <Card className="border-2 shadow-sm p-8 text-left"><div className="space-y-10"><div className="flex items-center gap-4"><div className="bg-indigo-50 p-4 rounded-[2rem] text-indigo-600 border-2 shadow-sm"><QrCode className="h-8 w-8" /></div><div className="text-left"><h4 className="font-headline font-black text-xl uppercase tracking-tight text-[#213147]">QR Distribution Terminal</h4><h4 className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Download and print location-aware order points</h4></div></div><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">{['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(m => seller?.menuTypes?.includes(m)).map(mode => (<div key={mode} className="p-8 bg-slate-50 border-2 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:border-primary transition-all shadow-sm"><div className="bg-white p-4 rounded-2xl border-2 shadow-md group-hover:scale-105 transition-transform"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${appBaseUrl}/sellers/${sellerId}/order?menuType=${encodeURIComponent(mode)}`} alt={`${mode} QR`} className="w-28 h-28" /></div><div className="text-center"><p className="text-xs font-black uppercase text-[#213147] tracking-widest">{mode}</p><Button variant="ghost" size="sm" className="h-9 mt-2 text-[9px] font-black uppercase text-primary gap-2 hover:bg-primary/10 border-2 border-transparent hover:border-primary/20"><Download className="h-3.5 w-3.5" /> Get Placard Asset</Button></div></div>))}</div></div></Card>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                    <div className="space-y-1 text-left">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Global Configuration</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Business profile and payment authorization</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-2 shadow-sm p-8 space-y-8 text-left h-fit bg-white">
                      <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> Core Business Identity</h4>
                        <div className="grid gap-6">
                          <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Official Name</Label><Input defaultValue={seller?.courseName} onChange={(e) => updateDoc(doc(firestore!, 'sellers', sellerId), { courseName: e.target.value })} className="h-12 border-2 font-bold focus-visible:ring-primary" /></div>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Category</Label><Select defaultValue={seller?.type} onValueChange={(v) => updateDoc(doc(firestore!, 'sellers', sellerId), { type: v as any })}><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2 text-left"><Label className="text-[10px] font-black uppercase">Operational State</Label><div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border-2 h-12 shadow-sm"><Switch checked={seller?.status === 'Active'} onCheckedChange={(v) => updateDoc(doc(firestore!, 'sellers', sellerId), { status: v ? 'Active' : 'Inactive' })} className="data-[state=checked]:bg-green-600" /><span className="text-[10px] font-black uppercase text-[#213147]">{seller?.status}</span></div></div>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Commercial Terminal</h4>
                        <div className="space-y-4">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Authorized Payout Methods</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {['Pay at Delivery', 'Digital Payment', 'Member Account'].map((method) => {
                              const isGolf = seller?.type?.toLowerCase().includes('golf');
                              const isDisabled = method === 'Member Account' && !isGolf;
                              const isChecked = seller?.enabledPaymentMethods?.includes(method as any) || false;

                              return (
                                <div key={method} className={cn("flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all shadow-sm", isChecked ? "bg-primary/5 border-primary/30" : "bg-slate-50/50 border-slate-100", isDisabled && "opacity-40 grayscale pointer-events-none")}>
                                  <Checkbox 
                                    id={`pay-${method}`} 
                                    checked={isChecked} 
                                    onCheckedChange={(checked) => {
                                      const currentEnabled = seller?.enabledPaymentMethods || [];
                                      const nextEnabled = checked ? [...currentEnabled, method as any] : currentEnabled.filter(m => m !== method);
                                      updateDoc(doc(firestore!, 'sellers', sellerId), { enabledPaymentMethods: nextEnabled });
                                    }}
                                  />
                                  <label htmlFor={`pay-${method}`} className="text-[11px] font-black uppercase cursor-pointer flex-1 select-none">
                                    <div className="flex items-center gap-3">
                                      {method === 'Pay at Delivery' && <Banknote className="h-4 w-4 text-slate-400" />}
                                      {method === 'Digital Payment' && <CreditCard className="h-4 w-4 text-slate-400" />}
                                      {method === 'Member Account' && <User className="h-4 w-4 text-slate-400" />}
                                      {method}
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Sheet open={!!activeModeForMenu} onOpenChange={(val) => !val && setActiveModeForMenu(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col bg-[#F8FAFC] border-l-4 border-primary/20 outline-none">
          <SheetHeader className="p-8 bg-[#213147] text-white shrink-0 shadow-xl relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 text-left">
                <SheetTitle className="text-2xl font-black uppercase text-white tracking-tight">Menu Manager</SheetTitle>
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary border-0 text-[10px] font-black uppercase px-2 h-5 shadow-lg">{activeModeForMenu}</Badge>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Live Priority Engine</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setActiveModeForMenu(null)} className="text-white/40 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 transition-all"><X className="h-6 w-6" /></Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-12 pb-32">
              {/* Featured Section Terminal */}
              <div className="bg-white p-6 rounded-[2.5rem] border-2 shadow-md space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500 shadow-sm border border-amber-100"><Star className="h-5.5 w-5.5 fill-current" /></div>
                    <div className="text-left">
                      <h4 className="text-xs font-black uppercase text-[#213147] tracking-tight">Featured Terminal</h4>
                      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Promotion slot prioritization</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase h-5 border-amber-200 text-amber-600 bg-amber-50">Priority Enabled</Badge>
                </div>
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'Featured', true)}>
                  <SortableContext items={menuItems?.filter(i => i.featuredOn?.includes(activeModeForMenu!)).map(i => i.id) || []} strategy={verticalListSortingStrategy}>
                    {menuItems?.filter(i => i.featuredOn?.includes(activeModeForMenu!)).length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed rounded-[2rem] opacity-30 bg-slate-50/50"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active featured items in this channel</p></div>
                    ) : (
                      <div className="space-y-1">
                        {menuItems
                          ?.filter(i => i.featuredOn?.includes(activeModeForMenu!))
                          .sort((a, b) => (a.featuredRanks?.[activeModeForMenu!] ?? 999) - (b.featuredRanks?.[activeModeForMenu!] ?? 999))
                          .map(item => (
                            <SortableItem 
                              key={item.id} 
                              item={item} 
                              mode={activeModeForMenu!} 
                              isFeatured 
                              onToggleAvailability={handleToggleItemAvailability} 
                              onToggleFeatured={handleToggleItemFeatured} 
                            />
                          ))}
                      </div>
                    )}
                  </SortableContext>
                </DndContext>
              </div>

              {/* Standard Category Registry */}
              <div className="space-y-12">
                {categories.filter(c => c !== 'Featured' && (seller?.categoryVisibility?.[activeModeForMenu!]?.includes(c) ?? true)).map(category => {
                  const itemsInCategory = menuItems?.filter(i => i.category === category) || [];
                  const modeItems = itemsInCategory
                    .filter(i => i.availableOn?.includes(activeModeForMenu!))
                    .sort((a, b) => (a.menuRanks?.[activeModeForMenu!] ?? 999) - (b.menuRanks?.[activeModeForMenu!] ?? 999));
                  const otherItems = itemsInCategory.filter(i => !i.availableOn?.includes(activeModeForMenu!));

                  return (
                    <div key={category} className="space-y-5 group/category">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <h4 className="text-[13px] font-black uppercase text-[#213147] tracking-[0.1em]">{category}</h4>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 border-0 text-[8px] font-black uppercase px-2 h-4.5">{modeItems.length} ACTIVE</Badge>
                      </div>

                      <div className="bg-white p-6 rounded-[2.5rem] border-2 shadow-sm space-y-6 transition-all group-hover/category:border-primary/20">
                         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, category)}>
                          <SortableContext items={modeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            {modeItems.length === 0 ? (
                               <div className="py-8 text-center border-2 border-dashed rounded-[1.5rem] opacity-20"><p className="text-[9px] font-black uppercase">No active items</p></div>
                            ) : (
                              modeItems.map(item => (
                                <SortableItem 
                                  key={item.id} 
                                  item={item} 
                                  mode={activeModeForMenu!} 
                                  onToggleAvailability={handleToggleItemAvailability} 
                                  onToggleFeatured={handleToggleItemFeatured} 
                                />
                              ))
                            )}
                          </SortableContext>
                        </DndContext>

                        {otherItems.length > 0 && (
                          <div className="pt-6 border-t-2 border-slate-50 space-y-4">
                            <div className="flex items-center justify-between px-2">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                                  <ShoppingBag className="h-3 w-3" /> Master Catalog Picker
                               </p>
                               <span className="text-[8px] font-bold text-slate-300 uppercase">INACTIVE IN MODE</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {otherItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-50 bg-slate-50/30 transition-all hover:border-primary/30 group/picker">
                                   <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-7 w-7 rounded bg-white border shrink-0 overflow-hidden opacity-60">
                                         {item.imageUrl ? <Image src={item.imageUrl} alt="" width={28} height={28} className="object-cover" /> : <LucideImage className="h-3 w-3 m-auto text-slate-200" />}
                                      </div>
                                      <p className="text-[10px] font-black uppercase text-slate-400 truncate group-hover/picker:text-primary transition-colors">{item.name}</p>
                                   </div>
                                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg" onClick={() => handleToggleItemAvailability(item.id, true)}>
                                      <Plus className="h-4 w-4" />
                                   </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={isStarterMenuConfirmOpen} onOpenChange={setIsStarterMenuConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left relative">
             <div className="absolute top-4 right-8 opacity-20"><Tags className="h-16 w-16" /></div>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Provision Modifiers?</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 text-left">
            <p className="text-xs text-muted-foreground leading-relaxed font-medium uppercase tracking-tight">This will clone industry-standard options (Doneness, Cheese, Mixers) directly to your master library. <strong className="text-indigo-600">Existing modifiers with matching IDs will be preserved.</strong></p>
            <Button onClick={handleApplyStarterMenu} disabled={isApplyingStarter} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl">
              {isApplyingStarter ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />} CLONE STARTER LIBRARY
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStarterItemsConfirmOpen} onOpenChange={setIsStarterItemsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left relative">
            <div className="absolute top-4 right-8 opacity-20"><Library className="h-16 w-16" /></div>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Provision Items?</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 text-left">
            <p className="text-xs text-muted-foreground leading-relaxed font-medium uppercase tracking-tight">This will populate your catalog with high-fidelity product templates (Burgers, Specialty Cocktails, Snacks) including pre-linked modifiers. <strong className="text-primary">Recommended for rapid onboarding.</strong></p>
            <Button onClick={handleApplyStarterItems} disabled={isApplyingStarterItems} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl">
              {isApplyingStarterItems ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />} CLONE MENU TEMPLATES
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingStaff ? 'Edit Personnel' : 'Add Fulfillment Staff'}</DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6">
                <FormField control={staffForm.control} name="name" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Legal Full Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                  )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={staffForm.control} name="role" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Authorization Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Staff">Delivery Staff</SelectItem><SelectItem value="Manager">Venue Manager</SelectItem></SelectContent></Select></FormItem>
                    )} />
                  <FormField control={staffForm.control} name="pin" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Access PIN (4-Digits)</FormLabel><FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-black font-mono tracking-[0.4em] text-center text-indigo-600" /></FormControl></FormItem>
                    )} />
                </div>
                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Staff Record</Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModifierGroupFormOpen} onOpenChange={setIsModifierGroupFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left">
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingModifierGroup ? 'Edit Modifier Set' : 'New Customization Set'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 text-left">
              <Form {...modifierGroupForm}>
                <form onSubmit={modifierGroupForm.handleSubmit(onSaveModifierGroup)} className="space-y-8">
                  <FormField control={modifierGroupForm.control} name="name" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Group Identity (e.g. "Choose Sauce")</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={modifierGroupForm.control} name="minSelection" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Min Required</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    <FormField control={modifierGroupForm.control} name="maxSelection" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Max Selection</FormLabel><FormControl><Input type="number" {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1"><Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Option Registry</Label><Button type="button" variant="ghost" size="sm" onClick={() => appendOption({ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true })} className="text-[9px] font-black uppercase gap-1.5 h-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"><Plus className="h-3.5 w-3.5" /> Add Choice</Button></div>
                    <div className="space-y-2">
                      {optionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                          <FormField control={modifierGroupForm.control} name={`options.${index}.name`} render={({ field }) => (
                              <FormItem className="flex-1 text-left"><FormControl><Input {...field} placeholder="Option Name" className="h-10 border-2 font-bold bg-white" /></FormControl></FormItem>
                            )} />
                          <FormField control={modifierGroupForm.control} name={`options.${index}.priceAdjustment`} render={({ field }) => (
                              <FormItem className="w-28 text-left"><FormControl><div className="relative"><DollarSign className="absolute left-2 top-3 h-3 w-3 text-slate-300" /><Input {...field} type="number" step="0.01" placeholder="0.00" className="h-10 pl-6 border-2 font-black bg-white" /></div></FormControl></FormItem>
                            )} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-10 w-10 text-muted-foreground hover:text-destructive shrink-0"><X className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Master Modifier</Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-primary text-white text-left relative">
            <div className="absolute top-4 right-8 opacity-20"><UtensilsCrossed className="h-16 w-16" /></div>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingItem ? 'Edit Product' : 'New Master Product'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 text-left">
              <Form {...itemForm}>
                <form onSubmit={itemForm.handleSubmit(onSaveItem)} className="space-y-8">
                  <FormField control={itemForm.control} name="name" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Product Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                  <FormField control={itemForm.control} name="description" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Patron-Facing Description</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={itemForm.control} name="price" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Base Price ($)</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-4 h-4 w-4 text-slate-300" /><Input type="number" step="0.01" {...field} className="h-12 pl-8 border-2 font-black" /></div></FormControl></FormItem>
                      )} />
                    <FormField control={itemForm.control} name="category" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Menu Section</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.filter(c => c !== 'Featured').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <Tags className="h-3.5 w-3.5" /> Associated Modifiers
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-[1.5rem] border-2">
                      {modifierGroups?.map(group => (
                        <FormField key={group.id} control={itemForm.control} name="modifierGroupIds" render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0 p-2.5 rounded-xl border bg-white shadow-sm">
                              <FormControl><Checkbox checked={field.value?.includes(group.id)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, group.id]) : field.onChange(field.value.filter(v => v !== group.id))} /></FormControl>
                              <FormLabel className="text-[9px] font-black uppercase cursor-pointer truncate">{group.name}</FormLabel>
                            </FormItem>
                          )} />
                      ))}
                      {modifierGroups?.length === 0 && <p className="col-span-full py-4 text-center text-[9px] font-bold text-muted-foreground uppercase">No modifiers in library yet.</p>}
                    </div>
                  </div>

                  <FormField control={itemForm.control} name="imageUrl" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Image Asset URL</FormLabel><FormControl><div className="relative"><LucideImage className="absolute left-3 top-4 h-4 w-4 text-slate-300" /><Input {...field} placeholder="https://images.unsplash.com/..." className="h-12 pl-10 border-2 font-bold" /></div></FormControl><FormDescription className="text-[8px] uppercase tracking-widest mt-1">High-quality 1:1 square ratio recommended.</FormDescription></FormItem>
                    )} />
                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Master Item</Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
