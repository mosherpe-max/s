
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
  AlertTriangle,
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
import { getFunctions, httpsCallable } from 'firebase/functions';
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
  
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className={cn("bg-white border-2 rounded-xl p-3 flex items-center gap-3 transition-all", isDragging ? "shadow-2xl border-primary/50 scale-105" : "hover:border-slate-300 shadow-sm")}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 transition-colors"><GripVertical className="h-4 w-4" /></button>
      <div className="flex-1 min-w-0 text-left"><p className="text-[11px] font-black uppercase text-[#213147] truncate leading-none mb-1">{item.name}</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">${item.price.toFixed(2)}</p></div>
      <div className="flex items-center gap-1"><button onClick={() => onToggleFeatured(item.id, item.featuredOn || [])} className={cn("p-2 rounded-lg transition-all active:scale-95", isFeatured ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-300 hover:text-slate-400")} title={isFeatured ? "Remove from Featured" : "Add to Featured"}><Star className={cn("h-4 w-4", isFeatured && "fill-current")} /></button><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => onEdit(item)}><Edit className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => onRemoveFromMode(item.id)} title="Remove from Mode"><X className="h-4 w-4" /></Button></div>
    </div>
  );
}

function SortableCategory({ id, category, isVisible, onToggleVisibility }: { id: string; category: string; isVisible: boolean; onToggleVisibility: (cat: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  return (
    <div ref={setNodeRef} style={style} className={cn("bg-white border-2 rounded-xl p-3 flex items-center gap-3 transition-all", isDragging ? "shadow-2xl border-primary/50 scale-105" : "hover:border-slate-300 shadow-sm", !isVisible && "opacity-50 grayscale bg-slate-50")}><button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 transition-colors"><GripVertical className="h-4 w-4" /></button><div className="flex-1 min-w-0 text-left"><p className="text-[11px] font-black uppercase text-[#213147] truncate leading-none">{category}</p></div><Switch checked={isVisible} onCheckedChange={() => onToggleVisibility(category)} className="data-[state=checked]:bg-primary" /></div>
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
  const [isMounted, setIsMounted] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState('All');
  const [analyticsRange, setAnalyticsRange] = useState<'Today' | 'MTD' | 'YTD'>('Today');
  const [now, setNow] = useState<number>(Date.now());
  const [greeting, setGreeting] = useState('Hello');

  const [orderDateRange, setOrderDateRange] = useState<DateRange | undefined>({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const [orderModeFilter, setOrderModeFilter] = useState<string>('All');
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');

  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [configMode, setConfigMode] = useState<string>('Beverage Cart');

  const [isStarterMenuConfirmOpen, setIsStarterMenuConfirmOpen] = useState(false);
  const [isApplyingStarter, setIsApplyingStarter] = useState(false);
  const [starterVenueType, setStarterVenueType] = useState<string>('');
  
  const [isStarterItemsConfirmOpen, setIsStarterItemsConfirmOpen] = useState(false);
  const [isApplyingStarterItems, setIsApplyingStarterItems] = useState(false);

  const [venueThresholds, setVenueThresholds] = useState<Record<string, { warning: number; max: number }>>({});
  const [venueName, setVenueName] = useState('');
  const [venueTaxRate, setVenueTaxRate] = useState(0);

  useEffect(() => { setIsMounted(true); const interval = setInterval(() => setNow(Date.now()), 30000); const hour = new Date().getHours(); if (hour < 12) setGreeting('Good Morning'); else if (hour < 18) setGreeting('Good Afternoon'); else setGreeting('Good Evening'); return () => clearInterval(interval); }, []);

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

  const sellerRoleRef = useMemoFirebase(() => { if (!firestore || !user?.email) return null; return doc(firestore, 'roles_seller_admin', user.email.toLowerCase()); }, [firestore, user]);
  const { data: sellerRole, isLoading: isRoleLoading } = useDoc<SellerAdminRole>(sellerRoleRef);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  const isAuthorized = !!user && (isSuperAdmin || (sellerRole?.sellerId === sellerId) || (venueData?.ownerUid === user?.uid));

  useEffect(() => { if (seller) { setVenueName(seller.courseName || ''); setVenueTaxRate(seller.taxRate || 0); setVenueThresholds({ ...DEFAULT_THRESHOLDS, ...(seller.orderThresholds || {}) }); if (seller.menuTypes && seller.menuTypes.length > 0 && !seller.menuTypes.includes(configMode)) { setConfigMode(seller.menuTypes[0]); } const detectedType = seller.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf'; setStarterVenueType(detectedType); } }, [seller]);

  const stats = useMemo(() => { if (!orders) return null; const filteredOrders = dashboardFilter === 'All' ? orders : orders.filter(o => o.menuType === dashboardFilter); const today = filteredOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && isToday(o.createdAt.toDate())); const revenue = today.reduce((acc, o) => acc + (o.total || 0), 0); const avg = today.length > 0 ? (revenue / today.length).toFixed(2) : '0.00'; const overdueCount = filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.createdAt && typeof o.createdAt.toDate === 'function' && differenceInMinutes(new Date(), o.createdAt.toDate()) >= (seller?.orderThresholds?.[o.menuType]?.max || DEFAULT_THRESHOLDS[o.menuType]?.max || 20)).length; return { revenue: revenue.toFixed(2), active: filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length, volume: today.length, avg, overdue: overdueCount }; }, [orders, dashboardFilter, seller]);

  const handleApplyStarterMenu = async () => {
    if (!firebaseApp || !sellerId || !starterVenueType) return;
    setIsApplyingStarter(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyStarter = httpsCallable(functions, 'applyStarterMenu');
      const result = await applyStarter({ venueId: sellerId, venueType: starterVenueType });
      const data = result.data as { totalCreated: number };
      toast({ title: "Modifiers Provisioned", description: `Added ${data.totalCreated} standard modifier sets.` });
      setIsStarterMenuConfirmOpen(false);
    } catch (error: any) { toast({ variant: "destructive", title: "Setup Failed" }); } finally { setIsApplyingStarter(false); }
  };

  const handleApplyStarterItems = async () => {
    if (!firebaseApp || !sellerId || !starterVenueType) return;
    setIsApplyingStarterItems(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyItems = httpsCallable(functions, 'applyStarterItems');
      const result = await applyItems({ venueId: sellerId, venueType: starterVenueType });
      const data = result.data as { totalCreated: number };
      toast({ title: "Menu Items Provisioned", description: `Added ${data.totalCreated} industry-standard items.` });
      setIsStarterItemsConfirmOpen(false);
    } catch (error: any) { toast({ variant: "destructive", title: "Setup Failed" }); } finally { setIsApplyingStarterItems(false); }
  };

  const handleSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const staffId = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', staffId);
    setDoc(staffRef, { ...data, id: staffId, updatedAt: serverTimestamp(), createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true }).then(() => { toast({ title: editingStaff ? 'Staff Updated' : 'Staff Added' }); setIsStaffFormOpen(false); setEditingStaff(null); staffForm.reset(); }).finally(() => setIsProcessingSave(false));
  };

  const handleSaveItem = async (data: ItemFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const itemId = editingItem?.id || Math.random().toString(36).substr(2, 9);
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    setDoc(itemRef, { ...data, id: itemId, rank: editingItem?.rank ?? (menuItems?.length || 0) + 1, updatedAt: serverTimestamp(), createdAt: editingItem?.createdAt || serverTimestamp() }, { merge: true }).then(() => { toast({ title: editingItem ? 'Item Updated' : 'Item Added' }); setIsItemFormOpen(false); setEditingItem(null); itemForm.reset(); }).finally(() => setIsProcessingSave(false));
  };

  const handleSaveModifierGroup = async (data: ModifierGroupFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const groupId = editingModifierGroup?.id || Math.random().toString(36).substr(2, 9);
    const groupRef = doc(firestore, 'modifier_groups', groupId);
    setDoc(groupRef, { ...data, id: groupId, sellerId, updatedAt: serverTimestamp(), createdAt: editingModifierGroup?.createdAt || serverTimestamp() }, { merge: true }).then(() => { toast({ title: editingModifierGroup ? 'Modifier Group Updated' : 'Modifier Group Added' }); setIsModifierGroupFormOpen(false); setEditingModifierGroup(null); modifierGroupForm.reset(); }).finally(() => setIsProcessingSave(false));
  };

  const staffForm = useForm<StaffFormData>({ resolver: zodResolver(staffSchema), defaultValues: { name: '', role: 'Staff', pin: '', isActive: true } });
  const itemForm = useForm<ItemFormData>({ resolver: zodResolver(itemSchema), defaultValues: { name: '', description: '', price: 0, category: 'Other', isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] } });
  const modifierGroupForm = useForm<ModifierGroupFormData>({ resolver: zodResolver(modifierGroupSchema), defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] } });
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: modifierGroupForm.control, name: "options" });

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

  const handleImpersonate = (mode: string) => {
    if (typeof window === 'undefined' || !sellerId) return;
    localStorage.setItem('koop_staff_id', `admin-${user?.uid}`);
    localStorage.setItem('koop_staff_name', `${user?.email || 'Admin'} (Management)`);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    setTimeout(() => {
      switch (mode) {
        case 'Beverage Cart': router.push(`/sellers/${sellerId}/bevcart`); break;
        case 'Clubhouse': router.push(`/sellers/${sellerId}/clubhouse`); break;
        case 'Lane Delivery': router.push(`/sellers/${sellerId}/laneside`); break;
        default: router.push(`/sellers/${sellerId}/clubhouse`); break;
      }
    }, 500);
  };

  const handleToggleMode = async (mode: string, current: boolean) => {
    if (!firestore || !sellerId || !user) return;
    const fieldMap: Record<string, string> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive', 'Take Out': 'takeoutActive' };
    const field = fieldMap[mode];
    if (field) { updateDoc(doc(firestore, 'sellers', sellerId), { [field] : !current }); }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full bg-[#213147] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0"><StylizedKoopLogo size={showLabels ? "md" : "sm"} /></div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar min-h-0 text-left">
          {NAV_ITEMS.map((item) => (<NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={(id) => { setActiveNav(id); if (isMobile) setSidebarOpen(false); }} sidebarOpen={showLabels} />))}
        </nav>
        <div className="mt-auto border-t border-white/5 p-4 shrink-0 space-y-4 text-left">
          {showLabels && (<div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">{user?.email?.charAt(0).toUpperCase() || 'V'}</div><div className="flex flex-col min-w-0"><span className="text-[10px] font-black text-white truncate uppercase tracking-tight">{seller?.courseName || 'Venue Admin'}</span><span className="text-[8px] font-bold text-slate-400 truncate uppercase">{user?.email}</span></div></div></div>)}
          {!isMobile && <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">{sidebarOpen ? <ChevronLeft /> : <ChevronRight />}</button>}
        </div>
      </div>
    );
  };

  const NAV_ITEMS = [ { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }, { id: "analytics", label: "Analytics", icon: BarChart3 }, { id: "orders", label: "Orders", icon: ClipboardList }, { id: "menu", label: "Menu Items", icon: UtensilsCrossed }, { id: "modifiers", label: "Modifiers", icon: Tags }, { id: "service", label: "Service Modes", icon: Zap }, { id: "staff", label: "Staff", icon: Users }, { id: "settings", label: "Settings", icon: SettingsIcon }, { id: "marketing", label: "Marketing", icon: Smartphone } ];
  const SERVICE_MODE_ICONS: Record<string, any> = { 'Beverage Cart': Truck, 'Clubhouse': Building, 'Lane Delivery': Users, 'Take Out': ShoppingBag };

  if (isUserLoading || isSellerLoading || isVenueLoading || isRoleLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Securing Session...</p></div>;
  if (!isAuthorized) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white p-8 text-center"><div className="bg-red-500/10 p-6 rounded-[2.5rem] border-2 border-red-500/20 mb-8"><ShieldCheck className="h-16 w-16 text-red-500 mx-auto" /></div><h2 className="font-headline text-3xl font-black uppercase tracking-tight mb-4">Access Restricted</h2><Button asChild className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest px-10 shadow-xl"><Link href="/login">Return to Gateway</Link></Button></div>;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      <header className="h-20 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative text-left"><div className="flex items-center gap-3 text-left"><StylizedKoopLogo size="sm" colorClass="text-[#213147]" /><div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" /><div className="flex flex-col"><h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1">{seller?.courseName}</h1><div className="flex items-center gap-2"><h2 className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">{greeting}, {user?.email}</h2></div></div></div><div className="flex items-center gap-4">{isSuperAdmin && (<Button variant="outline" size="sm" asChild className="h-9 text-[10px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 gap-2"><Link href="/admin"><ShieldAlert className="h-3.5 w-3.5" /> Return to Global Admin</Link></Button>)}<button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span><LogOut className="h-5 w-5" /></button></div></header>

      <div className="flex-1 flex overflow-hidden"><aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0 shadow-2xl z-20", sidebarOpen ? "w-64" : "w-20")}><SideBarContent /></aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-10 pb-24 text-left">
              {activeNav === 'dashboard' && (
                <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                  <Card className="border-2 shadow-md overflow-hidden bg-white"><CardHeader className="border-b bg-[#213147] text-white flex flex-row items-center justify-between py-4"><div className="flex items-center gap-3"><div className="bg-primary/20 p-2 rounded-xl"><Power className="h-5 w-5 text-primary" /></div><div className="text-left"><CardTitle className="text-xs font-black uppercase tracking-widest text-white leading-none">Service Command Center</CardTitle><CardDescription className="text-[8px] font-bold uppercase text-white/40 mt-1">Real-time channel authorization</CardDescription></div></div></CardHeader><CardContent className="p-4 sm:p-6 text-left"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{seller?.menuTypes?.map(mode => { const fieldMap: Record<string, keyof Seller> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive', 'Take Out': 'takeoutActive' }; const isActive = !!(seller?.[fieldMap[mode] as keyof Seller]); const ModeIcon = SERVICE_MODE_ICONS[mode] || Zap; return (<div key={`dashboard-mode-${mode}`} className={cn("flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group relative", isActive ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 bg-slate-50 opacity-60")}><div className={cn("p-2.5 rounded-xl transition-all shadow-sm", isActive ? "bg-primary text-white scale-110" : "bg-slate-200 text-slate-400")}><ModeIcon className="h-5 w-5" /></div><div className="text-center space-y-0.5"><p className={cn("text-[10px] font-black uppercase tracking-tight", isActive ? "text-[#213147]" : "text-slate-400")}>{mode}</p><p className={cn("text-[8px] font-bold uppercase", isActive ? "text-green-600" : "text-slate-400")}>{isActive ? 'LIVE' : 'OFFLINE'}</p></div><div className="flex flex-col gap-2 w-full pt-2"><div className="flex items-center justify-center gap-2"><Switch checked={isActive} onCheckedChange={() => handleToggleMode(mode, isActive)} className="data-[state=checked]:bg-primary" /></div><Button variant="outline" size="sm" className="h-8 w-full text-[9px] font-black uppercase tracking-widest gap-1.5 border-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all" onClick={() => handleImpersonate(mode)}><ExternalLink className="h-3 w-3" /> Terminal</Button></div></div>); })}</div></CardContent></Card>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"><KPICard label="Today's Revenue" value={`$${stats?.revenue}`} sub="Live Earnings" icon={DollarSign} colorClass="bg-green-500" /><KPICard label="Avg. Order" value={`$${stats?.avg}`} sub="Mean Revenue" icon={TrendingUp} colorClass="bg-indigo-600" /><KPICard label="Today's Volume" value={stats?.volume || 0} sub="Processed" icon={ShoppingBag} colorClass="bg-primary" /><KPICard label="Active Tickets" value={stats?.active || 0} sub="In Pipeline" icon={Clock} colorClass="bg-red-600" highlight={!!(stats?.active && stats.active > 0)} /></div>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500 text-left">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left">
                    <div className="space-y-1 text-left"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Master Menu Library</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global items available for all service modes</p></div>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsStarterItemsConfirmOpen(true)} disabled={isApplyingStarterItems} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm hover:bg-indigo-50">{isApplyingStarterItems ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4 text-indigo-600" />} Apply Starter Menu Items</Button>
                      <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"><Plus className="h-4 w-4" /> Define Custom Item</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    {categories.filter(c => c !== 'Featured').map(cat => {
                      const items = menuItems?.filter(i => i.category === cat);
                      return (
                        <div key={cat} className="space-y-4">
                          <div className="flex items-center justify-between px-1 border-b border-slate-200 pb-2"><h4 className="text-[11px] font-black uppercase text-primary tracking-widest">{cat}</h4><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-slate-100 hover:bg-primary hover:text-white transition-all" onClick={() => { setEditingItem(null); itemForm.reset({ name: '', description: '', price: 0, category: cat as any, isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] }); setIsItemFormOpen(true); }}><Plus className="h-3.5 w-3.5" /></Button></div>
                          <div className="space-y-3">{!items?.length ? <div className="py-8 text-center bg-slate-50 border-2 border-dashed rounded-2xl opacity-40"><p className="text-[9px] font-black uppercase text-slate-400 text-center">Empty Section</p></div> : items.map(item => (<Card key={item.id} className={cn("border-2 shadow-sm group transition-all", item.isAvailable ? "bg-white" : "bg-red-50 border-red-100")}><CardContent className="p-3.5 flex flex-col gap-3 text-left"><div className="flex items-start justify-between gap-3 text-left"><div className="flex-1 min-w-0 text-left"><div className="flex items-center gap-2"><p className="font-black text-[11px] uppercase text-[#213147] truncate">{item.name}</p></div><p className="text-[10px] font-bold text-primary font-mono mt-0.5">${item.price.toFixed(2)}</p></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingItem(item); itemForm.reset(item); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button></div></div></CardContent></Card>))}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeNav === 'modifiers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 pb-4 text-left">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">Modifier Groups</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reusable sets of customizations and add-ons</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <Button onClick={() => setIsStarterMenuConfirmOpen(true)} disabled={isApplyingStarter} variant="outline" className="flex-1 sm:flex-initial h-12 border-2 font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm hover:bg-indigo-50">{isApplyingStarter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Library className="h-4 w-4 text-indigo-600" />} Apply Starter Modifiers</Button>
                      <Button onClick={() => { setEditingModifierGroup(null); modifierGroupForm.reset(); setIsModifierGroupFormOpen(true); }} className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"><Plus className="h-4 w-4" /> Define New Set</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">{modifierGroups?.map(group => (<Card key={group.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left"><CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0 text-left"><div className="space-y-0.5 text-left"><p className="font-black text-xs uppercase text-[#213147]">{group.name}</p><p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{group.minSelection > 0 ? `Required (${group.minSelection})` : 'Optional'} · Max {group.maxSelection}</p></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingModifierGroup(group); modifierGroupForm.reset(group); setIsModifierGroupFormOpen(true); }}><Edit className="h-4 w-4" /></Button></div></CardHeader><CardContent className="p-4 text-left"><div className="flex flex-wrap gap-1.5">{group.options.map((opt, idx) => (<Badge key={`${group.id}-opt-${idx}`} variant="outline" className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 h-auto", !opt.isAvailable && "opacity-40 line-through")}>{opt.name} {opt.priceAdjustment > 0 && `(+$${opt.priceAdjustment.toFixed(2)})`}</Badge>))}</div></CardContent></Card>))}</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      <Dialog open={isStarterMenuConfirmOpen} onOpenChange={setIsStarterMenuConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-indigo-600 text-white"><div className="flex items-center gap-4 text-left"><div className="bg-white/20 p-3 rounded-2xl shrink-0"><Library className="h-6 w-6 text-white" /></div><div className="text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Menu</DialogTitle></div></div></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase">This will add standard modifier sets (Doneness, Toppings, etc.) to your library.</p><Button onClick={handleApplyStarterMenu} disabled={isApplyingStarter} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarter ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />} {isApplyingStarter ? "Provisioning..." : "Confirm & Apply"}</Button></div></DialogContent>
      </Dialog>

      <Dialog open={isStarterItemsConfirmOpen} onOpenChange={setIsStarterItemsConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-indigo-600 text-white"><div className="flex items-center gap-4 text-left"><div className="bg-white/20 p-3 rounded-2xl shrink-0"><UtensilsCrossed className="h-6 w-6 text-white" /></div><div className="text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Menu Items</DialogTitle></div></div></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase">This will populate your menu with standard items and auto-link them to your active modifiers.</p><Button onClick={handleApplyStarterItems} disabled={isApplyingStarterItems} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarterItems ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} {isApplyingStarterItems ? "Cloning Menu..." : "Confirm & Populate"}</Button></div></DialogContent>
      </Dialog>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}><DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-[#213147] text-white"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Menu Item</DialogTitle></DialogHeader><ScrollArea className="max-h-[70vh]"><div className="p-8"><Form {...itemForm}><form onSubmit={itemForm.handleSubmit(handleSaveItem)} className="space-y-6"><FormField control={itemForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={itemForm.control} name="price" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Price</FormLabel><FormControl><Input {...field} type="number" step="0.01" className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={itemForm.control} name="category" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.filter(c => c !== 'Featured').map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>)} /></div><FormField control={itemForm.control} name="modifierGroupIds" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-indigo-600">Linked Modifiers</FormLabel><div className="grid grid-cols-1 gap-2">{modifierGroups?.map(group => (<div key={group.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border-2"><Checkbox checked={field.value?.includes(group.id)} onCheckedChange={(checked) => { const next = checked ? [...(field.value || []), group.id] : field.value?.filter(id => id !== group.id); field.onChange(next); }} /><p className="text-[10px] font-black uppercase text-[#213147]">{group.name}</p></div>))}</div></FormItem>)} /><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Item</Button></form></Form></div></ScrollArea></DialogContent></Dialog>

      <Dialog open={isModifierGroupFormOpen} onOpenChange={setIsModifierGroupFormOpen}><DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-indigo-600 text-white"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Modifier Set</DialogTitle></DialogHeader><ScrollArea className="max-h-[70vh]"><div className="p-8"><Form {...modifierGroupForm}><form onSubmit={modifierGroupForm.handleSubmit(handleSaveModifierGroup)} className="space-y-8"><FormField control={modifierGroupForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Group Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border-2"><FormField control={modifierGroupForm.control} name="minSelection" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Min</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={modifierGroupForm.control} name="maxSelection" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Max</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>)} /></div><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Modifier Group</Button></form></Form></div></ScrollArea></DialogContent></Dialog>
    </div>
  );
}
