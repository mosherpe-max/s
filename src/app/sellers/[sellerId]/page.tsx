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
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Save,
  PanelLeft,
  ChevronRightSquare,
  Search,
  Trash2,
  Activity,
  Star,
  Smartphone,
  X,
  Building,
  ChevronLeft,
  GripVertical,
  ClipboardCheck,
  Menu,
  Image as LucideImage,
  AlertTriangle,
  MapPin,
  Mail,
  Timer,
  Lock,
  Info,
  Truck
} from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn, SUPER_ADMIN_ID, getNumericOrderId, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';
import { 
  isToday, 
  format, 
  subDays, 
  startOfDay, 
  differenceInMinutes, 
  differenceInSeconds,
  startOfMonth,
  startOfYear,
  addDays,
  addMonths
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, SolutionConfig, ModifierGroup, Venue } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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

const getModeColor = (mode: string) => {
  switch (mode) {
    case 'Beverage Cart': return '#E50000';
    case 'Clubhouse': return '#213147';
    case 'Lane Delivery': return '#4f46e5';
    default: return '#94a3b8';
  }
};

function SortableItem({ id, item, isFeatured, onToggleFeature, onRemove }: { 
  id: string, 
  item: MenuItem, 
  isFeatured: boolean, 
  onToggleFeature: (id: string) => void,
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center justify-between p-3 bg-white border-2 rounded-xl group hover:border-primary/30 transition-all"
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted border shrink-0">
          {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
        </div>
        <div className="text-left">
          <p className="text-[11px] font-black uppercase text-[#213147] leading-none mb-1">{item.name}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase">${item.price.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onToggleFeature(item.id)} className={cn("h-8 w-8 rounded-full", isFeatured ? "text-amber-500 hover:text-amber-600" : "text-slate-200 hover:text-amber-500")}>
          <Star className={cn("h-4 w-4", isFeatured && "fill-current")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-8 w-8 rounded-full text-slate-200 hover:text-destructive">
          <X className="h-4 w-4" />
        </Button>
      </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [activeModeTab, setActiveModeTab] = useState('');
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  // Analytics Controls
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | 'month' | 'year'>('7d');
  const [analyticsMode, setAnalyticsMode] = useState<string>('All');

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', sellerId) : null), [firestore, sellerId]);
  const { data: venue, isLoading: isVenueLoading } = useDoc<Venue>(venueRef);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffListQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffListQuery);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const analyticsData = useMemo(() => {
    if (!orders || !seller) return { dailyRevenue: [], fulfillmentEfficiency: [], revenueByMode: [], modes: [], realTimeOperations: {} };
    
    const modes = (seller.menuTypes || []).filter(m => AUTHORIZED_SERVICE_MODES.includes(m));
    const now = new Date();
    
    const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(now), 6 - i);
      const dayLabel = format(date, 'MMM d');
      const dayData: any = { name: dayLabel };
      modes.forEach(mode => {
        const modeOrders = orders.filter(o => o.menuType === mode && o.status === 'Delivered' && o.createdAt && format(o.createdAt.toDate(), 'MMM d') === dayLabel);
        dayData[mode] = modeOrders.reduce((sum, o) => sum + (o.total - (o.serviceFee || 0)), 0);
      });
      return dayData;
    });

    const realTimeOperations: Record<string, any> = {};
    modes.forEach(mode => {
      const modeOrdersToday = orders.filter(o => o.menuType === mode && o.createdAt && isToday(o.createdAt.toDate()));
      const deliveredToday = modeOrdersToday.filter(o => o.status === 'Delivered');
      
      const thresholds = seller.orderThresholds?.[mode] || { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 };
      
      const acknowledged = modeOrdersToday.filter(o => o.acknowledgedAt);
      const avgAck = acknowledged.length > 0 ? acknowledged.reduce((sum, o) => sum + differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()), 0) / acknowledged.length : 0;
      const exceedMaxAckCount = acknowledged.filter(o => differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()) > thresholds.maxOrderAcknowledgeSeconds).length;

      const fulfilled = deliveredToday.filter(o => o.deliveredAt);
      const avgDuration = fulfilled.length > 0 ? fulfilled.reduce((sum, o) => sum + differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()), 0) / fulfilled.length : 0;
      const exceedWarnCount = fulfilled.filter(o => differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()) > thresholds.warningOrderProcessingMinutes).length;
      const exceedMaxCount = fulfilled.filter(o => differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()) > thresholds.maxOrderProcessingMinutes).length;

      realTimeOperations[mode] = {
        avgAck: Math.round(avgAck),
        exceedMaxAckCount,
        avgDuration: parseFloat(avgDuration.toFixed(1)),
        exceedWarnCount,
        exceedMaxCount,
        orderCount: modeOrdersToday.length,
        totalNetRevenue: modeOrdersToday.reduce((sum, o) => sum + (o.total - (o.serviceFee || 0)), 0),
        activeStaff: staffList?.filter(s => s.activeMode === mode).map(s => s.name) || []
      };
    });

    return { dailyRevenue, modes, realTimeOperations };
  }, [orders, seller, staffList]);

  // Comprehensive Analytics Data Generation
  const analyticsTimeframeData = useMemo(() => {
    if (!orders || !seller) return { revenue: [], acknowledgement: [], duration: [], modes: [] };
    
    const now = new Date();
    let interval: { start: Date, end: Date };
    let formatStr: string;
    let step: 'day' | 'month';

    if (analyticsTimeframe === '7d') {
      interval = { start: subDays(startOfDay(now), 6), end: now };
      formatStr = 'MMM d';
      step = 'day';
    } else if (analyticsTimeframe === 'month') {
      interval = { start: startOfMonth(now), end: now };
      formatStr = 'MMM d';
      step = 'day';
    } else {
      interval = { start: startOfYear(now), end: now };
      formatStr = 'MMM';
      step = 'month';
    }

    const labels: { label: string, date: Date }[] = [];
    let curr = new Date(interval.start);
    if (step === 'day') {
      while (curr <= interval.end) {
        labels.push({ label: format(curr, formatStr), date: new Date(curr) });
        curr = addDays(curr, 1);
      }
    } else {
      while (curr <= interval.end) {
        labels.push({ label: format(curr, formatStr), date: new Date(curr) });
        curr = addMonths(curr, 1);
      }
    }

    const modes = (seller.menuTypes || []).filter(m => AUTHORIZED_SERVICE_MODES.includes(m));

    const revenueData = labels.map(({ label, date }) => {
      const data: any = { name: label };
      const dayStart = startOfDay(date);
      const dayEnd = step === 'day' ? addDays(dayStart, 1) : addMonths(dayStart, 1);
      
      const filteredOrders = orders.filter(o => 
        o.status === 'Delivered' && 
        o.createdAt && 
        o.createdAt.toDate() >= dayStart && 
        o.createdAt.toDate() < dayEnd
      );
      
      if (analyticsMode === 'All') {
        modes.forEach(mode => {
          const modeOrders = filteredOrders.filter(o => o.menuType === mode);
          data[mode] = modeOrders.reduce((sum, o) => sum + (o.total - (o.serviceFee || 0)), 0);
        });
      } else {
        const modeOrders = filteredOrders.filter(o => o.menuType === analyticsMode);
        data[analyticsMode] = modeOrders.reduce((sum, o) => sum + (o.total - (o.serviceFee || 0)), 0);
      }
      return data;
    });

    const ackData = labels.map(({ label, date }) => {
      const data: any = { name: label };
      const dayStart = startOfDay(date);
      const dayEnd = step === 'day' ? addDays(dayStart, 1) : addMonths(dayStart, 1);
      
      const targetModes = analyticsMode === 'All' ? modes : [analyticsMode];
      
      const filteredOrders = orders.filter(o => 
        targetModes.includes(o.menuType) && 
        o.createdAt && 
        o.createdAt.toDate() >= dayStart && 
        o.createdAt.toDate() < dayEnd
      );
      
      const ackOrders = filteredOrders.filter(o => o.acknowledgedAt);
      const avgAck = ackOrders.length > 0 ? ackOrders.reduce((sum, o) => sum + differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()), 0) / ackOrders.length : 0;
      
      const thresholds = seller.orderThresholds || {};
      const exceedCount = ackOrders.filter(o => {
        const modeT = thresholds[o.menuType]?.maxOrderAcknowledgeSeconds || 120;
        return differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()) > modeT;
      }).length;

      data.avgSeconds = Math.round(avgAck);
      data.exceedCount = exceedCount;
      return data;
    });

    const durData = labels.map(({ label, date }) => {
      const data: any = { name: label };
      const dayStart = startOfDay(date);
      const dayEnd = step === 'day' ? addDays(dayStart, 1) : addMonths(dayStart, 1);
      
      const targetModes = analyticsMode === 'All' ? modes : [analyticsMode];
      
      const filteredOrders = orders.filter(o => 
        targetModes.includes(o.menuType) && 
        o.status === 'Delivered' &&
        o.deliveredAt &&
        o.createdAt && 
        o.createdAt.toDate() >= dayStart && 
        o.createdAt.toDate() < dayEnd
      );
      
      const avgDur = filteredOrders.length > 0 ? filteredOrders.reduce((sum, o) => sum + differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()), 0) / filteredOrders.length : 0;
      
      const thresholds = seller.orderThresholds || {};
      const exceedWarn = filteredOrders.filter(o => {
        const modeT = thresholds[o.menuType]?.warningOrderProcessingMinutes || 15;
        return differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()) > modeT;
      }).length;
      
      const exceedMax = filteredOrders.filter(o => {
        const modeT = thresholds[o.menuType]?.maxOrderProcessingMinutes || 25;
        return differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()) > modeT;
      }).length;

      data.avgMinutes = parseFloat(avgDur.toFixed(1));
      data.exceedWarn = exceedWarn;
      data.exceedMax = exceedMax;
      return data;
    });

    return { revenue: revenueData, acknowledgement: ackData, duration: durData, modes };
  }, [orders, seller, analyticsTimeframe, analyticsMode]);

  const patrons = useMemo(() => {
    if (!orders) return [];
    const map = new Map<string, { email: string, name: string, phone: string, count: number, total: number, id: string }>();
    orders.forEach(o => {
      const key = `${o.customerEmail || ''}-${o.customerPhone || ''}-${o.buyerProfileId || 'anon'}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.total += (o.total - (o.serviceFee || 0));
      } else {
        map.set(key, { 
          id: key,
          email: o.customerEmail || 'N/A', 
          name: o.customerName || 'Guest', 
          phone: o.customerPhone || 'N/A', 
          count: 1, 
          total: (o.total - (o.serviceFee || 0))
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);
  }, [orders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (seller && !activeModeTab) {
      const modes = (seller.menuTypes || []).filter(m => AUTHORIZED_SERVICE_MODES.includes(m));
      if (modes.length > 0) setActiveModeTab(modes[0]);
    }
  }, [seller, activeModeTab]);

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    setDoc(doc(firestore, 'sellers', sellerId, 'staff', id), { ...data, id, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true })
      .then(() => { setIsStaffFormOpen(false); setIsProcessingSave(false); toast({ title: editingStaff ? "Staff Updated" : "Staff Added" }); });
  };

  const handleToggleCategoryVisibility = (mode: string, category: string, isVisible: boolean) => {
    if (!firestore || !sellerId || !seller) return;
    const currentVisibility = seller.categoryVisibility?.[mode] || categories.filter(c => c !== 'Featured');
    const newVisibility = isVisible 
      ? Array.from(new Set([...currentVisibility, category]))
      : currentVisibility.filter(c => c !== category);
    
    updateDoc(doc(firestore, 'sellers', sellerId), { [`categoryVisibility.${mode}`]: newVisibility });
  };

  const handleToggleItemInMode = (itemId: string, mode: string, action: 'add' | 'remove') => {
    if (!firestore || !sellerId) return;
    const item = menuItems?.find(i => i.id === itemId);
    if (!item) return;
    const availableOn = item.availableOn || [];
    const newAvailableOn = action === 'add' ? Array.from(new Set([...availableOn, mode])) : availableOn.filter(m => m !== mode);
    
    const updateData = { availableOn: newAvailableOn };
    const docRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);

    updateDoc(docRef, updateData).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    });
  };

  const handleToggleFeatureInMode = (itemId: string, mode: string) => {
    if (!firestore || !sellerId) return;
    const item = menuItems?.find(i => i.id === itemId);
    if (!item) return;
    const featuredOn = item.featuredOn || [];
    const newFeaturedOn = featuredOn.includes(mode) ? featuredOn.filter(m => m !== mode) : [...featuredOn, mode];
    
    const updateData = { featuredOn: newFeaturedOn };
    const docRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);

    updateDoc(docRef, updateData).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    });
  };

  const handleDragEnd = (event: any, category: string, mode: string) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const itemsInCat = (menuItems || []).filter(i => i.category === category && i.availableOn?.includes(mode)).sort((a, b) => (a.menuRanks?.[mode] || 999) - (b.menuRanks?.[mode] || 999));
      const oldIndex = itemsInCat.findIndex(i => i.id === active.id);
      const newIndex = itemsInCat.findIndex(i => i.id === over.id);
      const newArray = arrayMove(itemsInCat, oldIndex, newIndex);
      const batch = writeBatch(firestore!);
      newArray.forEach((item, index) => batch.update(doc(firestore!, 'sellers', sellerId, 'menuItems', item.id), { [`menuRanks.${mode}`]: index + 1 }));
      batch.commit();
    }
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!firestore || !sellerId) return;
    const docRef = doc(firestore, 'sellers', sellerId);
    updateDoc(docRef, { [field]: value, updatedAt: serverTimestamp() }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: { [field]: value },
      } satisfies SecurityRuleContext));
    });
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true }
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price: 0, category: '', isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] }
  });

  if (isUserLoading || isSellerLoading || isVenueLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Fulfillment Log", icon: ClipboardCheck },
    { id: "modes", label: "Service Modes", icon: Zap },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "staff", label: "Staff", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  const NavContent = () => (<nav className="space-y-1">{NAV_ITEMS.map((item) => (<NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen} />))}</nav>);

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'Beverage Cart': return Truck;
      case 'Clubhouse': return Building;
      case 'Lane Delivery': return MapPin;
      default: return Zap;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC] text-left">
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
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Venue Admin</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span><LogOut className="h-5 w-5" /></button>
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
                <div className="space-y-12 animate-in fade-in duration-500">
                  {/* REAL-TIME OPERATIONS SUITE */}
                  <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-6 w-6 text-primary" /></div>
                        <div className="text-left">
                           <h2 className="text-xl font-black uppercase text-[#213147]">Live Operations</h2>
                           <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Real-Time Mode Performance & Control</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {analyticsData.modes.map(mode => {
                           const stats = analyticsData.realTimeOperations[mode];
                           const field = mode === 'Beverage Cart' ? 'bevcartActive' : mode === 'Clubhouse' ? 'clubhouseActive' : 'lanedeliveryActive';
                           const isActive = !!seller?.[field as keyof Seller];
                           const ModeIcon = getModeIcon(mode);
                           
                           return (
                              <Card key={mode} className={cn("border-2 shadow-sm overflow-hidden", isActive ? "border-slate-100" : "opacity-60 border-dashed")}>
                                 <CardHeader className={cn("py-4 flex flex-row items-center justify-between", isActive ? "bg-slate-50" : "bg-muted/30")}>
                                    <div className="flex items-center gap-2">
                                       <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                                       <ModeIcon className="h-3.5 w-3.5 text-[#213147]/40" />
                                       <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">{mode}</CardTitle>
                                    </div>
                                    <Switch 
                                       checked={isActive} 
                                       onCheckedChange={(val) => updateDoc(doc(firestore!, 'sellers', sellerId), { [field]: val })} 
                                       className="data-[state=checked]:bg-green-500 scale-75" 
                                    />
                                 </CardHeader>
                                 <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4 border-b pb-6">
                                       <div className="space-y-1">
                                          <p className="text-[8px] font-black uppercase text-muted-foreground">Order Count</p>
                                          <p className="text-xl font-black text-[#213147]">{stats?.orderCount || 0}</p>
                                       </div>
                                       <div className="space-y-1 text-right">
                                          <p className="text-[8px] font-black uppercase text-muted-foreground">Net Today</p>
                                          <p className="text-xl font-black text-primary font-mono">${(stats?.totalNetRevenue || 0).toFixed(2)}</p>
                                       </div>
                                    </div>

                                    <div className="space-y-4">
                                       <div className="flex justify-between items-start">
                                          <div className="space-y-1">
                                             <p className="text-[8px] font-black uppercase text-muted-foreground flex items-center gap-1"><Timer className="h-2 w-2" /> Acknowledge</p>
                                             <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black">{stats?.avgAck || 0}s</span>
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Avg</span>
                                             </div>
                                          </div>
                                          {stats?.exceedMaxAckCount > 0 && (
                                             <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Exceed: {stats.exceedMaxAckCount}</Badge>
                                          )}
                                       </div>

                                       <div className="flex justify-between items-start">
                                          <div className="space-y-1">
                                             <p className="text-[8px] font-black uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-2 w-2" /> Duration</p>
                                             <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-black">{stats?.avgDuration || 0}m</span>
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Avg</span>
                                             </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                             {stats?.exceedWarnCount > 0 && <Badge className="bg-amber-500 text-white h-4 px-1 text-[7px] font-black uppercase">Warn: {stats.exceedWarnCount}</Badge>}
                                             {stats?.exceedMaxCount > 0 && <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Late: {stats.exceedMaxCount}</Badge>}
                                          </div>
                                       </div>
                                    </div>

                                    <div className="pt-4 border-t-2 border-dashed">
                                       <p className="text-[8px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-2 w-2" /> Active Staff</p>
                                       {stats?.activeStaff.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                             {stats.activeStaff.map((name: string) => (
                                                <Badge key={name} variant="outline" className="text-[7px] font-black uppercase bg-slate-50 border-slate-200">{name}</Badge>
                                             ))}
                                          </div>
                                       ) : (
                                          <p className="text-[8px] font-bold text-muted-foreground uppercase italic">No staff on-shift</p>
                                       )}
                                    </div>
                                 </CardContent>
                              </Card>
                           );
                        })}
                     </div>
                  </div>

                  {/* REVENUE OVERVIEW - BOTTOM OF DASHBOARD */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><BarChart3 className="h-6 w-6" /></div>
                       <div className="text-left">
                          <h2 className="text-xl font-black uppercase text-[#213147]">Revenue Overview</h2>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">7-Day Stacked Performance</p>
                       </div>
                    </div>
                    <Card className="border-2 shadow-sm">
                      <CardContent className="pt-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                            <Legend iconType="circle" />
                            {analyticsData.modes.map((mode) => (
                              <Bar key={mode} dataKey={mode} stackId="a" fill={getModeColor(mode)} radius={[0, 0, 0, 0]} barSize={40} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-12 animate-in fade-in duration-500">
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-6 w-6 text-primary" /></div>
                         <div className="text-left">
                            <h2 className="text-xl font-black uppercase text-[#213147]">Business Intelligence</h2>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Deep Performance Analysis</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white border-2 p-1.5 rounded-2xl shadow-sm">
                         <div className="flex gap-1 border-r pr-3 mr-1">
                            {['7d', 'month', 'year'].map(t => (
                               <Button 
                                 key={t} 
                                 variant={analyticsTimeframe === t ? 'default' : 'ghost'} 
                                 size="sm" 
                                 onClick={() => setAnalyticsTimeframe(t as any)}
                                 className={cn("h-8 text-[9px] font-black uppercase tracking-widest rounded-lg", analyticsTimeframe === t ? "bg-[#213147]" : "text-slate-400")}
                               >
                                 {t === '7d' ? '7 Days' : t === 'month' ? 'Month' : 'Year'}
                               </Button>
                            ))}
                         </div>
                         <Select value={analyticsMode} onValueChange={setAnalyticsMode}>
                            <SelectTrigger className="h-8 w-40 border-0 shadow-none font-black uppercase text-[9px] tracking-widest bg-slate-50">
                               <SelectValue placeholder="All Modes" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="All" className="text-[10px] font-black uppercase">All Channels</SelectItem>
                               {analyticsTimeframeData.modes.map(m => (
                                 <SelectItem key={m} value={m} className="text-[10px] font-black uppercase">{m}</SelectItem>
                               ))}
                            </SelectContent>
                         </Select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 gap-12">
                      {/* CHART 1: REVENUE TREND */}
                      <Card className="border-2 shadow-sm overflow-hidden">
                         <CardHeader className="bg-slate-50 border-b py-4">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Revenue Distribution</CardTitle>
                               </div>
                               <Badge variant="outline" className="text-[8px] font-black uppercase bg-white">{analyticsMode === 'All' ? 'Stacked' : analyticsMode}</Badge>
                            </div>
                         </CardHeader>
                         <CardContent className="pt-10 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={analyticsTimeframeData.revenue}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} tickFormatter={(v) => `$${v}`} />
                                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                                  <Legend iconType="circle" />
                                  {analyticsMode === 'All' ? (
                                    analyticsTimeframeData.modes.map(mode => (
                                      <Bar key={mode} dataKey={mode} stackId="a" fill={getModeColor(mode)} radius={[0, 0, 0, 0]} barSize={analyticsTimeframe === 'year' ? 40 : 20} />
                                    ))
                                  ) : (
                                    <Bar dataKey={analyticsMode} fill={getModeColor(analyticsMode)} radius={[4, 4, 0, 0]} barSize={analyticsTimeframe === 'year' ? 40 : 20} />
                                  )}
                               </BarChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>

                      {/* CHART 2: ACKNOWLEDGEMENT LOGISTICS */}
                      <Card className="border-2 shadow-sm overflow-hidden">
                         <CardHeader className="bg-slate-50 border-b py-4">
                            <div className="flex items-center gap-2">
                               <Timer className="h-3.5 w-3.5 text-indigo-600" />
                               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Acknowledgement Responsiveness</CardTitle>
                            </div>
                         </CardHeader>
                         <CardContent className="pt-10 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <ComposedChart data={analyticsTimeframeData.acknowledgement}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} tickFormatter={(v) => `${v}s`} />
                                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                                  <Tooltip />
                                  <Legend />
                                  <Bar yAxisId="left" name="Avg Seconds" dataKey="avgSeconds" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                  <Line yAxisId="right" name="Exceeding Limit" type="monotone" dataKey="exceedCount" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                               </ComposedChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>

                      {/* CHART 3: DURATION EFFICIENCY */}
                      <Card className="border-2 shadow-sm overflow-hidden">
                         <CardHeader className="bg-slate-50 border-b py-4">
                            <div className="flex items-center gap-2">
                               <Truck className="h-3.5 w-3.5 text-primary" />
                               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Fulfillment Lifecycle Efficiency</CardTitle>
                            </div>
                         </CardHeader>
                         <CardContent className="pt-10 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <ComposedChart data={analyticsTimeframeData.duration}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} tickFormatter={(v) => `${v}m`} />
                                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                                  <Tooltip />
                                  <Legend />
                                  <Bar yAxisId="left" name="Avg Minutes" dataKey="avgMinutes" fill="#213147" radius={[4, 4, 0, 0]} barSize={20} />
                                  <Line yAxisId="right" name="Warning Alert" type="monotone" dataKey="exceedWarn" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                  <Line yAxisId="right" name="Late Alert" type="monotone" dataKey="exceedMax" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                               </ComposedChart>
                            </ResponsiveContainer>
                         </CardContent>
                      </Card>
                   </div>

                   <Card className="border-2 shadow-sm bg-[#213147] text-white overflow-hidden mt-12">
                      <CardHeader className="border-b border-white/5 py-6">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm font-black uppercase tracking-widest">Patron Directory</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                         <Table>
                            <TableHeader className="bg-white/5">
                               <TableRow className="border-white/5 hover:bg-transparent">
                                  <TableHead className="text-[9px] font-black uppercase text-white/40 px-8">Patron Identity</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase text-white/40">Frequency</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase text-white/40 text-right px-8">LTV (Net Revenue)</TableHead>
                               </TableRow>
                            </TableHeader>
                            <TableBody>
                               {patrons.length === 0 ? (
                                 <TableRow><TableCell colSpan={3} className="py-20 text-center text-white/20 uppercase text-[10px] font-black">No patron history recorded</TableCell></TableRow>
                               ) : patrons.map(p => (
                                 <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                   <TableCell className="px-8">
                                     <div className="text-left">
                                       <p className="text-[11px] font-black uppercase tracking-tight leading-none mb-1">{p.name}</p>
                                       <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{p.email} • {p.phone}</p>
                                     </div>
                                   </TableCell>
                                   <TableCell>
                                      <Badge variant="outline" className="text-[8px] font-black uppercase bg-white/5 border-white/10 text-white/60">{p.count} Orders</Badge>
                                   </TableCell>
                                   <TableCell className="text-right px-8 font-mono font-black text-primary text-sm">${p.total.toFixed(2)}</TableCell>
                                 </TableRow>
                               ))}
                            </TableBody>
                         </Table>
                      </CardContent>
                   </Card>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase text-[#213147]">Fulfillment Log</h2>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search ticket or name..." 
                        value={orderSearchTerm} 
                        onChange={(e) => setOrderSearchTerm(e.target.value)} 
                        className="pl-10 h-10 border-2 rounded-xl" 
                      />
                    </div>
                  </div>
                  <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Ticket</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Customer</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Mode</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Net Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(orders || [])
                          .filter(o => o.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase()) || getNumericOrderId(o.id).includes(orderSearchTerm))
                          .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
                          .map(o => (
                            <TableRow key={o.id} className="group hover:bg-slate-50/50 transition-colors">
                              <TableCell className="px-8 font-mono font-black text-primary text-xs">#{getNumericOrderId(o.id)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{o.customerName}</span>
                                  <span className="text-[9px] uppercase text-muted-foreground">{o.createdAt ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : ''}</span>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">{o.menuType}</Badge></TableCell>
                              <TableCell><Badge className={cn("text-[8px] font-black uppercase border-0", o.status === 'Delivered' ? "bg-green-500" : o.status === 'Cancelled' ? "bg-red-500" : "bg-primary animate-pulse")}>{o.status}</Badge></TableCell>
                              <TableCell className="text-right px-8 font-mono font-black text-sm">${(o.total - (o.serviceFee || 0)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {activeNav === 'modes' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase text-[#213147]">Service Modes</h2>
                    <div className="flex gap-2 bg-[#213147] p-1 rounded-xl">
                      {seller?.menuTypes?.filter(m => AUTHORIZED_SERVICE_MODES.includes(m)).map(mode => (
                        <Button key={mode} variant={activeModeTab === mode ? 'default' : 'ghost'} size="sm" onClick={() => setActiveModeTab(mode)} className={cn("text-[9px] font-black uppercase tracking-widest h-9 px-4 rounded-lg", activeModeTab === mode ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5")}>{mode}</Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                       <Card className="border-2 shadow-sm overflow-hidden">
                          <CardHeader className="bg-[#213147] text-white py-4 border-b"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Active Channels</CardTitle></CardHeader>
                          <CardContent className="pt-6 space-y-4">
                            {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(m => seller?.menuTypes?.includes(m)).map(mode => {
                              const field = mode === 'Beverage Cart' ? 'bevcartActive' : mode === 'Clubhouse' ? 'clubhouseActive' : 'lanedeliveryActive';
                              return (
                                <div key={mode} className="flex items-center justify-between p-3 rounded-xl border-2 bg-slate-50 border-slate-100">
                                   <div className="text-left"><p className="text-[10px] font-black uppercase text-[#213147]">{mode}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">{seller?.[field as keyof Seller] ? 'OPEN' : 'CLOSED'}</p></div>
                                   <Switch checked={!!seller?.[field as keyof Seller]} onCheckedChange={(val) => updateDoc(doc(firestore!, 'sellers', sellerId), { [field]: val })} className="data-[state=checked]:bg-green-500" />
                                </div>
                              );
                            })}
                          </CardContent>
                       </Card>

                       <Card className="border-2 shadow-sm overflow-hidden">
                          <CardHeader className="bg-slate-50 border-b py-4"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Category Filters</CardTitle></CardHeader>
                          <CardContent className="pt-6 space-y-3">
                            {categories.filter(c => c !== 'Featured').map(cat => {
                              const isVisible = seller?.categoryVisibility?.[activeModeTab]?.includes(cat) ?? true;
                              return (
                                <div key={cat} className="flex items-center justify-between p-2 rounded-lg border hover:bg-slate-50 transition-colors">
                                   <span className="text-[10px] font-black uppercase text-[#213147]">{cat}</span>
                                   <Switch checked={isVisible} onCheckedChange={(val) => handleToggleCategoryVisibility(activeModeTab, cat, val)} className="scale-75 data-[state=checked]:bg-primary" />
                                </div>
                              );
                            })}
                          </CardContent>
                       </Card>
                    </div>

                    <div className="lg:col-span-3 space-y-10">
                      {categories.filter(c => c !== 'Featured').map(category => {
                        const isVisible = seller?.categoryVisibility?.[activeModeTab]?.includes(category) ?? true;
                        if (!isVisible) return null;

                        const itemsInMode = (menuItems || []).filter(i => i.category === category && i.availableOn?.includes(activeModeTab)).sort((a, b) => (a.menuRanks?.[activeModeTab] || 999) - (b.menuRanks?.[activeModeTab] || 999));
                        const itemsInCatalog = (menuItems || []).filter(i => i.category === category && !i.availableOn?.includes(activeModeTab));
                        
                        return (
                          <div key={category} className="space-y-4">
                             <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-2"><h3 className="font-headline font-black text-xs uppercase tracking-widest text-primary">{category}</h3><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-50">{itemsInMode.length} Active</Badge></div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                   <p className="text-[9px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2"><GripVertical className="h-3 w-3" /> Active Priority</p>
                                   <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, category, activeModeTab)}>
                                      <SortableContext items={itemsInMode.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                         <div className="grid gap-2">
                                            {itemsInMode.map(item => (
                                              <SortableItem 
                                                key={item.id} 
                                                id={item.id} 
                                                item={item} 
                                                isFeatured={item.featuredOn?.includes(activeModeTab) ?? false} 
                                                onToggleFeature={() => handleToggleFeatureInMode(item.id, activeModeTab)} 
                                                onRemove={() => handleToggleItemInMode(item.id, activeModeTab, 'remove')} 
                                              />
                                            ))}
                                         </div>
                                      </SortableContext>
                                   </DndContext>
                                </div>
                                <div className="space-y-3">
                                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Plus className="h-3 w-3" /> Pick from Catalog</p>
                                   <div className="grid gap-2">
                                      {itemsInCatalog.map(item => (
                                        <button key={item.id} onClick={() => handleToggleItemInMode(item.id, activeModeTab, 'add')} className="flex items-center gap-3 p-3 bg-white border-2 rounded-xl text-left hover:border-primary/30 transition-all group">
                                          <div className="h-8 w-8 rounded-lg overflow-hidden bg-muted shrink-0 relative">{item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}</div>
                                          <span className="text-[10px] font-black uppercase text-[#213147] flex-1">{item.name}</span>
                                          <Plus className="h-3.5 w-3.5 text-slate-200 group-hover:text-primary" />
                                        </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase text-[#213147]">Master Catalog</h2>
                    <Button onClick={() => { itemForm.reset(); toast({ title: "Product Module Initializing..." }); }} className="bg-primary font-black uppercase text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> New Product</Button>
                  </div>
                  <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Price</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Stock</TableHead>
                          <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(menuItems || []).sort((a, b) => a.category.localeCompare(b.category)).map(item => (
                          <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg overflow-hidden border relative shrink-0">
                                  {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <LucideImage className="h-full w-full p-2 text-muted-foreground/20" />}
                                </div>
                                <span className="font-bold text-sm text-[#213147] uppercase">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">{item.category}</Badge></TableCell>
                            <TableCell className="font-mono font-bold text-sm">${item.price.toFixed(2)}</TableCell>
                            <TableCell><Switch checked={item.isAvailable !== false} onCheckedChange={(val) => updateDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', item.id), { isAvailable: val })} className="scale-75 data-[state=checked]:bg-green-500" /></TableCell>
                            <TableCell className="text-right px-8">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', item.id))}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {activeNav === 'staff' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase text-[#213147]">Venue Personnel</h2>
                    <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="bg-[#213147] font-black uppercase text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
                  </div>
                  <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Access PIN</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                          <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(staffList || []).map(staff => (
                          <TableRow key={staff.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 font-bold text-sm uppercase">{staff.name}</TableCell>
                            <TableCell><Badge variant="outline" className={cn("text-[8px] font-black uppercase border-0", staff.role === 'Manager' ? "bg-[#213147] text-white" : "bg-slate-100 text-slate-600")}>{staff.role}</Badge></TableCell>
                            <TableCell><code className="bg-slate-100 px-2 py-1 rounded text-xs font-black tracking-widest">{staff.pin}</code></TableCell>
                            <TableCell><div className="flex items-center gap-2">{staff.activeMode ? (<Badge className="bg-green-500 border-0 h-2 w-2 rounded-full p-0 animate-pulse" />) : (<Badge className="bg-slate-300 border-0 h-2 w-2 rounded-full p-0" />)}<span className="text-[10px] font-black uppercase">{staff.activeMode || 'Offline'}</span></div></TableCell>
                            <TableCell className="text-right px-8"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingStaff(staff); staffForm.reset(staff); setIsStaffFormOpen(true); }} className="h-8 w-8 hover:text-primary"><Edit className="h-4 w-4" /></Button></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {activeNav === 'settings' && (
                <div className="max-w-4xl space-y-10 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg"><SettingsIcon className="h-6 w-6 text-primary" /></div>
                      <h2 className="text-2xl font-black uppercase text-[#213147]">Venue Operations</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* CORE IDENTITY */}
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
                          <Building className="h-3 w-3" /> Core Identity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase">Venue Name</Label>
                          <Input defaultValue={seller?.courseName} onBlur={(e) => handleUpdateField('courseName', e.target.value)} className="h-10 border-2 font-bold" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase">Street Address</Label>
                          <Input defaultValue={seller?.streetAddress} onBlur={(e) => handleUpdateField('streetAddress', e.target.value)} className="h-10 border-2 font-bold" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase">City</Label><Input defaultValue={seller?.city} onBlur={(e) => handleUpdateField('city', e.target.value)} className="h-10 border-2 font-bold" /></div>
                          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase">State</Label><Input defaultValue={seller?.state} onBlur={(e) => handleUpdateField('state', e.target.value)} className="h-10 border-2 font-bold" /></div>
                          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase">Zip</Label><Input defaultValue={seller?.zip} onBlur={(e) => handleUpdateField('zip', e.target.value)} className="h-10 border-2 font-bold" /></div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* BILLING & SOLUTION FEES (READ ONLY) */}
                    <Card className="border-2 shadow-sm border-primary/20 bg-primary/5">
                      <CardHeader className="bg-primary/10 border-b py-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <DollarSign className="h-3 w-3" /> Billing & Solution Fees
                          </CardTitle>
                          <Lock className="h-3 w-3 text-primary/40" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60">Koop Patron Convenience Fee</Label>
                          <div className="h-10 px-3 flex items-center bg-white border-2 rounded-md font-mono font-black text-sm text-[#213147]">
                            ${((venue?.patronConvenienceFee || 0) / 100).toFixed(2)}
                          </div>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase leading-tight">Paid by patrons at checkout to support the solution.</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-primary/60">Monthly Subscription</Label>
                          <div className="h-10 px-3 flex items-center bg-white border-2 rounded-md font-mono font-black text-sm text-[#213147]">
                            ${(venue?.monthlySolutionFee || 0).toFixed(2)}
                          </div>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase leading-tight">Fixed monthly fee for venue operational access.</p>
                        </div>
                        <div className="bg-primary/10 p-3 rounded-lg flex items-start gap-2">
                          <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-[8px] font-bold text-primary uppercase leading-relaxed">Fees are managed globally by Koop. Contact support to request changes.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* OPERATIONS & TAX */}
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
                          <Timer className="h-3 w-3" /> Operations & Tax
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                         <div className="space-y-1.5">
                           <Label className="text-[9px] font-black uppercase">Sales Tax Rate (%)</Label>
                           <Input type="number" step="0.01" defaultValue={seller?.taxRate} onBlur={(e) => handleUpdateField('taxRate', parseFloat(e.target.value))} className="h-10 border-2 font-bold" />
                           <p className="text-[8px] font-medium text-muted-foreground uppercase">Applied to all digital and manual orders.</p>
                         </div>
                      </CardContent>
                    </Card>

                    {/* FULFILLMENT GUARDRAILS */}
                    <Card className="border-2 shadow-sm md:col-span-2">
                       <CardHeader className="bg-[#213147] text-white py-4 border-b">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary" /> Fulfillment Guardrails
                          </CardTitle>
                       </CardHeader>
                       <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             {seller?.menuTypes?.filter(m => AUTHORIZED_SERVICE_MODES.includes(m)).map(mode => (
                               <div key={mode} className="space-y-4 p-4 rounded-xl border-2 bg-slate-50 border-slate-100">
                                  <div className="flex items-center gap-2 border-b pb-2 mb-2">
                                     <Zap className="h-3 w-3 text-primary" />
                                     <span className="text-[10px] font-black uppercase tracking-tight">{mode}</span>
                                  </div>
                                  <div className="space-y-4">
                                     <div className="space-y-1.5">
                                        <Label className="text-[8px] font-black uppercase">Max Ack. Time (Seconds)</Label>
                                        <Input 
                                          type="number" 
                                          defaultValue={seller?.orderThresholds?.[mode]?.maxOrderAcknowledgeSeconds || 120} 
                                          onBlur={(e) => handleUpdateField(`orderThresholds.${mode}.maxOrderAcknowledgeSeconds`, parseInt(e.target.value))}
                                          className="h-10 border-2 font-bold text-center" 
                                        />
                                     </div>
                                     <div className="grid grid-cols-2 gap-4">
                                       <div className="space-y-1.5">
                                          <Label className="text-[8px] font-black uppercase text-amber-600">Warn (Min)</Label>
                                          <Input 
                                            type="number" 
                                            defaultValue={seller?.orderThresholds?.[mode]?.warningOrderProcessingMinutes || 15} 
                                            onBlur={(e) => handleUpdateField(`orderThresholds.${mode}.warningOrderProcessingMinutes`, parseInt(e.target.value))}
                                            className="h-10 border-2 font-bold text-center" 
                                          />
                                       </div>
                                       <div className="space-y-1.5">
                                          <Label className="text-[8px] font-black uppercase text-red-600">Max (Min)</Label>
                                          <Input 
                                            type="number" 
                                            defaultValue={seller?.orderThresholds?.[mode]?.maxOrderProcessingMinutes || 25} 
                                            onBlur={(e) => handleUpdateField(`orderThresholds.${mode}.maxOrderProcessingMinutes`, parseInt(e.target.value))}
                                            className="h-10 border-2 font-bold text-center" 
                                          />
                                       </div>
                                     </div>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </CardContent>
                    </Card>

                    {/* MAP COORDINATES (READ ONLY) */}
                    <Card className="border-2 shadow-sm border-slate-200 bg-slate-50/50">
                       <CardHeader className="py-4 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
                              <MapPin className="h-3 w-3" /> Static Map Anchors
                            </CardTitle>
                            <Lock className="h-3 w-3 text-muted-foreground/30" />
                          </div>
                       </CardHeader>
                       <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                             <div className="space-y-1.5">
                               <Label className="text-[9px] font-black uppercase opacity-60">Anchor Latitude</Label>
                               <div className="h-11 px-3 flex items-center bg-white border-2 rounded-md font-mono font-bold text-xs text-[#213147]">
                                 {seller?.latitude}
                               </div>
                             </div>
                             <div className="space-y-1.5">
                               <Label className="text-[9px] font-black uppercase opacity-60">Anchor Longitude</Label>
                               <div className="h-11 px-3 flex items-center bg-white border-2 rounded-md font-mono font-bold text-xs text-[#213147]">
                                 {seller?.longitude}
                               </div>
                             </div>
                             <div className="bg-white p-4 rounded-xl border-2 border-slate-100 flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <div className="text-left"><p className="text-[9px] font-black uppercase text-[#213147]">Relocation Required?</p><p className="text-[8px] font-medium text-muted-foreground uppercase leading-tight">Contact Koop Admin to update anchors.</p></div>
                             </div>
                          </div>
                       </CardContent>
                    </Card>

                    {/* CONTACT & PERSONNEL */}
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#213147] flex items-center gap-2">
                          <Mail className="h-3 w-3" /> Contact & Personnel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase">Primary Manager Name</Label>
                          <Input defaultValue={seller?.contactName} onBlur={(e) => handleUpdateField('contactName', e.target.value)} className="h-10 border-2 font-bold" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase">Admin Email</Label><Input type="email" defaultValue={seller?.contactEmail} onBlur={(e) => handleUpdateField('contactEmail', e.target.value)} className="h-10 border-2 font-bold" /></div>
                          <div className="space-y-1.5"><Label className="text-[9px] font-black uppercase">Admin Phone</Label><Input type="tel" defaultValue={seller?.contactPhone} onBlur={(e) => handleUpdateField('contactPhone', e.target.value)} className="h-10 border-2 font-bold" /></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
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
                    <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Staff">Staff</SelectItem><SelectItem value="Manager">Manager</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <FormField control={staffForm.control} name="pin" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Login PIN</FormLabel><FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-bold text-center tracking-[0.5em]" /></FormControl></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Staff Record</Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
