
'use client';

import React, { useState, useMemo, useEffect, use, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebaseApp } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Database, 
  Users, 
  Sparkles, 
  Loader2, 
  ListChecks, 
  Check, 
  BarChart3, 
  Settings2, 
  GripVertical,
  DollarSign,
  ShoppingBag,
  Clock,
  Activity,
  ImageIcon,
  Timer,
  Truck,
  Building,
  MapPin,
  Utensils,
  AlertTriangle,
  ListOrdered,
  Download,
  Calendar as CalendarIcon,
  ExternalLink,
  ArrowUp,
  Layers,
  QrCode,
  Printer,
  Lock,
  LogOut,
  Search,
  Calendar,
  Settings,
  Bell,
  Smartphone,
  UserPlus,
  Pencil,
  CreditCard,
  Zap,
  CheckCircle2,
  FlaskConical
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear, format, startOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { httpsCallable, getFunctions } from 'firebase/functions';

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

import type { MenuItem, Seller, Category, Order, ModifierGroup, ModifierOption, StaffMember, PlatformConfig } from '@/lib/types';
import { categories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const staffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(['Driver', 'Server', 'Manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'Numbers only'),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

const modifierOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Option name required'),
  price: z.coerce.number().min(0)
});

const modifierGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Group name required'),
  minSelection: z.coerce.number().min(0),
  maxSelection: z.coerce.number().min(1),
  options: z.array(modifierOptionSchema).min(1, 'At least one option required')
});

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
  imageUrl: z.string().url('Please enter a valid image URL').or(z.literal('')).optional(),
  availableOn: z.array(z.string()).optional(),
  modifierGroups: z.array(modifierGroupSchema).optional()
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const getCategoriesForMenu = (menuType: string): Category[] => {
  if (menuType === 'Beverage Cart') {
    return ['Beer', 'Spirits', 'Soft Drinks', 'Snacks', 'Other'];
  }
  return [...categories] as Category[];
};

function SortableMenuItem({ 
  item, 
  onRemove 
}: { 
  item: MenuItem; 
  onRemove: (item: MenuItem) => void 
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
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card transition-shadow",
        isDragging ? "shadow-xl border-primary ring-2 ring-primary/20 opacity-90" : "shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{item.name}</span>
          {item.modifierGroups?.length ? <Layers className="h-3 w-3 text-primary" /> : null}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => onRemove(item)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ModifierGroupManager({ 
  control, 
  groupIndex 
}: { 
  control: any, 
  groupIndex: number 
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modifierGroups.${groupIndex}.options`
  });

  return (
    <div className="p-4 bg-background border rounded-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField control={control} name={`modifierGroups.${groupIndex}.name`} render={({ field }) => (
          <FormItem><FormLabel className="text-[10px] font-black uppercase">Group Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Add-ons" /></FormControl></FormItem>
        )} />
        <div className="flex gap-2">
          <FormField control={control} name={`modifierGroups.${groupIndex}.minSelection`} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Min</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={control} name={`modifierGroups.${groupIndex}.maxSelection`} render={({ field }) => (
            <FormItem><FormLabel className="text-[10px] font-black uppercase">Max</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
          )} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase text-muted-foreground">Options</p>
        {fields.map((field, optionIndex) => (
          <div key={field.id} className="flex gap-2 items-end">
            <FormField control={control} name={`modifierGroups.${groupIndex}.options.${optionIndex}.name`} render={({ field }) => (
              <FormItem className="flex-1"><FormControl><Input {...field} placeholder="Option Name" /></FormControl></FormItem>
            )} />
            <FormField control={control} name={`modifierGroups.${groupIndex}.options.${optionIndex}.price`} render={({ field }) => (
              <FormItem className="w-24"><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
            )} />
            <Button variant="ghost" size="icon" onClick={() => remove(optionIndex)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => append({ id: Math.random().toString(), name: '', price: 0 })} className="w-full text-[10px] uppercase font-bold">
          <PlusCircle className="h-3 w-3 mr-1" /> Add Option
        </Button>
      </div>
    </div>
  );
}

function MasterItemForm({
  onSave,
  onClose,
  menuItem,
  disabled,
}: {
  onSave: (itemData: MenuItemFormData) => void;
  onClose: () => void;
  menuItem?: MenuItem | null;
  disabled?: boolean;
}) {
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: menuItem || {
      name: '',
      description: '',
      price: 0,
      category: 'Beer' as Category,
      imageUrl: '',
      availableOn: [],
      modifierGroups: []
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'modifierGroups'
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col max-h-[80vh]">
        <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Craft IPA" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="A short description." /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Base Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
              )} />
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase flex items-center gap-2"><Layers className="h-4 w-4" /> Modifiers</h3>
                <Button variant="outline" size="sm" onClick={() => append({ id: Math.random().toString(), name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(), name: '', price: 0 }] })}>
                  Add Group
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="relative">
                    <ModifierGroupManager control={form.control} groupIndex={index} />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{menuItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
}

function StatTile({ title, revenue, orders, longWait }: { title: string, revenue: number, orders: number, longWait: number }) {
  return (
    <Card className="flex-1 min-w-[300px] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline">{title}</CardTitle>
        <CardDescription>Sales Performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Revenue</span>
          </div>
          <span className="font-mono font-bold">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Orders</span>
          </div>
          <span className="font-mono font-bold">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Orders &gt; Threshold</span>
          </div>
          <span className="font-mono font-bold text-destructive">{longWait}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function OpsMetricCard({ label, value, icon: Icon, colorClass, subValue }: { label: string, value: string | number, icon: any, colorClass?: string, subValue?: string }) {
  return (
    <div className="bg-background border rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-primary/10", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-sm font-black font-headline truncate">{value}</p>
          {subValue && <span className="text-[8px] font-bold text-muted-foreground uppercase">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

export default function SellerAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isPickingOpen, setIsPickingOpen] = useState(false);
  const [pickingMenuType, setPickingMenuType] = useState<string>('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('All');
  
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [configMenuType, setConfigMenuType] = useState<string>('');

  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');
  const [selectedOpsMenu, setSelectedOpsMenu] = useState<string>('');
  const [showTopButton, setShowTopButton] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [revenueMode, setRevenueMode] = useState<'Gross' | 'Net'>('Gross');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [isOnboardingStripe, setIsOnboardingStripe] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isHardcodedSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const roleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole } = useDoc(roleRef);

  const platformRoleRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);
  const { data: platformRole } = useDoc(platformRoleRef);

  const isPlatformAdmin = isHardcodedSuperAdmin || !!platformRole;
  const isVenueAdmin = sellerRole?.sellerId === sellerId;
  const hasAccess = isPlatformAdmin || isVenueAdmin;

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'platform') : null), [firestore]);
  const { data: platformConfig } = useDoc<PlatformConfig>(configRef);

  const isTestMode = platformConfig?.stripePublishableKey?.startsWith('pk_test_');

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => setShowTopButton(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    const interval = setInterval(() => setNow(Date.now()), 10000);

    const stripeStatus = searchParams.get('stripe');
    if (stripeStatus === 'success') {
      toast({ 
        title: "Connection Successful", 
        description: "Your Stripe account is now linked. Digital payments are active.",
        className: "bg-green-600 text-white" 
      });
      router.replace(`/sellers/${sellerId}`);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, [searchParams, router, sellerId, toast]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: "Signed Out" });
    } catch (e) {
      toast({ variant: "destructive", title: "Logout Failed" });
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  useEffect(() => {
    if (seller?.menuTypes?.length && !selectedOpsMenu) {
      setSelectedOpsMenu(seller.menuTypes[0]);
    }
  }, [seller, selectedOpsMenu]);

  const menuItemsQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, hasAccess]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore && hasAccess ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, hasAccess]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId, hasAccess]);
  const { data: staff, isLoading: isStaffLoading } = useCollection<StaffMember>(staffQuery);

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      role: 'Driver',
      pin: '',
      isActive: true,
    },
  });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !hasAccess) return;
    const staffId = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', staffId);
    
    await setDoc(staffRef, {
      ...data,
      id: staffId,
      createdAt: editingStaff?.createdAt || serverTimestamp(),
    }, { merge: true });

    toast({ title: editingStaff ? 'Staff Updated' : 'Staff Created' });
    setIsStaffFormOpen(false);
    setEditingStaff(null);
    staffForm.reset();
  };

  const handleRemoveStaff = async (id: string) => {
    if (!firestore || !hasAccess) return;
    await deleteDoc(doc(firestore, 'sellers', sellerId, 'staff', id));
    toast({ title: 'Staff Member Removed' });
  };

  const handleInitializeDevice = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('koop_venue_id', sellerId);
      localStorage.setItem('koop_venue_name', seller?.courseName || 'This Venue');
      router.push(`/sellers/${sellerId}/staff-login`);
      toast({ title: "Device Initialized", description: "This browser is now locked to staff login mode." });
    }
  };

  const handleStripeOnboarding = async () => {
    if (!seller || !hasAccess) return;
    setIsOnboardingStripe(true);
    const functions = getFunctions(firebaseApp);
    const origin = window.location.origin;
    
    try {
      let accountId = seller.stripeAccountId;
      
      if (!accountId) {
        const createAcc = httpsCallable(functions, 'createStripeConnectAccount');
        const accResult = await createAcc({ sellerId, email: seller.contactEmail });
        accountId = (accResult.data as any).accountId;
      }

      if (seller.stripeOnboardingComplete) {
        const getDashboard = httpsCallable(functions, 'getStripeDashboardLink');
        const dashboardResult = await getDashboard({ accountId });
        window.location.href = (dashboardResult.data as any).url;
      } else {
        const getLink = httpsCallable(functions, 'getStripeOnboardingLink');
        const linkResult = await getLink({ accountId, sellerId, origin });
        window.location.href = (linkResult.data as any).url;
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Onboarding Failed', description: err.message });
    } finally {
      setIsOnboardingStripe(false);
    }
  };

  const activeOrders = useMemo(() => {
    return orders?.filter(o => ['Placed', 'Preparing', 'Out for Delivery'].includes(o.status)) || [];
  }, [orders]);

  const filteredOpsOrders = useMemo(() => {
    return activeOrders.filter(o => o.menuType === selectedOpsMenu);
  }, [activeOrders, selectedOpsMenu]);

  const reportOrders = useMemo(() => {
    if (!orders || !dateRange?.from) return [];
    
    return orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate();
      const from = startOfDay(dateRange.from!);
      const to = endOfDay(dateRange.to || dateRange.from!);
      
      return isWithinInterval(orderDate, { start: from, end: to });
    }).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [orders, dateRange]);

  const dashboardStats = useMemo(() => {
    if (!orders || !seller) return null;
    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => {
        const val = revenueMode === 'Gross' ? o.total : (o.subtotal + (o.tip || 0));
        return acc + val;
      }, 0);
      const longWait = filtered.filter(o => {
        if (!o.deliveredAt || !o.createdAt) return false;
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        const thresholds = seller.orderThresholds?.[o.menuType] || { warning: 7, max: 10 };
        return duration > thresholds.max;
      }).length;
      return { revenue, orders: filtered.length, longWait };
    };
    return {
      monthly: calculate(orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()))),
      yearly: calculate(orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()))),
    };
  }, [orders, seller, revenueMode]);

  const opsMetrics = useMemo(() => {
    if (!orders || !seller) return null;

    const calculateMetrics = (filtered: Order[]) => {
      const todayOrders = filtered.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
      const deliveredToday = todayOrders.filter(o => o.status === 'Delivered');
      
      const revenue = todayOrders.reduce((acc, o) => {
        const val = revenueMode === 'Gross' ? o.total : (o.subtotal + (o.tip || 0));
        return acc + val;
      }, 0);
      
      let totalMinutes = 0;
      deliveredToday.forEach(o => {
        if (o.deliveredAt && o.createdAt) {
          totalMinutes += (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        }
      });
      const avgTime = deliveredToday.length > 0 ? totalMinutes / deliveredToday.length : 0;

      const exceededCount = todayOrders.filter(o => {
        const thresholds = seller.orderThresholds?.[o.menuType] || { warning: 7, max: 10 };
        const thresholdMax = thresholds.max;
        if (o.status === 'Delivered' && o.deliveredAt && o.createdAt) {
          return (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000 > thresholdMax;
        }
        if (o.createdAt) {
          return (now - o.createdAt.toDate().getTime()) / 60000 > thresholdMax;
        }
        return false;
      }).length;

      return { revenue, avgTime, exceededCount, count: todayOrders.length };
    };

    return {
      total: calculateMetrics(orders),
      selected: selectedOpsMenu ? calculateMetrics(orders.filter(o => o.menuType === selectedOpsMenu)) : null
    };
  }, [orders, seller, selectedOpsMenu, now, revenueMode]);

  const handleExportToExcel = () => {
    if (!reportOrders.length) {
      toast({ variant: "destructive", title: "No Data", description: "No orders found in this date range." });
      return;
    }

    const exportData = reportOrders.map(o => {
      const revenue = revenueMode === 'Gross' ? o.total : (o.subtotal + (o.tip || 0));
      return {
        'Order ID': getNumericOrderId(o.id),
        'Date': o.createdAt ? format(o.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
        'Customer': o.customerName,
        'Service': o.menuType,
        'Location': o.menuTypeLocation || 'N/A',
        'Items': o.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
        'Subtotal': o.subtotal.toFixed(2),
        'Convenience Fee': o.serviceFee.toFixed(2),
        'Tax': o.tax.toFixed(2),
        'Tip': o.tip.toFixed(2),
        'Revenue Displayed': revenue.toFixed(2),
        'Reporting Mode': revenueMode,
        'Total Order Value': o.total.toFixed(2)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    
    const fileName = `Sales_Report_${seller?.courseName.replace(/\s+/g, '_')}_${revenueMode}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ title: "Report Generated", description: `Exported ${reportOrders.length} transactions.` });
  };

  const handleSaveMasterItem = (data: MenuItemFormData) => {
    if (!firestore || !hasAccess) return;
    const itemRef = editingItem ? doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id) : doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
    setDoc(itemRef, { ...data, id: itemRef.id, rank: editingItem?.rank || (menuItems?.length || 0) + 1 }, { merge: true });
    setEditingItem(null); setIsMasterFormOpen(false);
  };

  const handleDeleteLibraryItem = (itemId: string) => {
    if (!firestore || !hasAccess) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    
    deleteDoc(itemRef)
      .then(() => {
        toast({ title: 'Item Removed', description: 'The item has been deleted from your library.' });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'delete'
        }));
      });
  };

  const handleToggleCategoryModifier = (menuType: string, category: Category) => {
    if (!firestore || !seller || !hasAccess) return;
    const currentEnabled = seller.categoryModifierEnabled?.[menuType] || [];
    const isEnabled = currentEnabled.includes(category);
    const nextEnabled = isEnabled ? currentEnabled.filter(c => c !== category) : [...currentEnabled, category];
    
    updateDoc(doc(firestore, 'sellers', sellerId), {
      [`categoryModifierEnabled.${menuType}`]: nextEnabled
    });
  };

  const handleToggleMenuItemAvailability = (item: MenuItem, menuType: string) => {
    if (!firestore || !hasAccess) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
    const availableOn = item.availableOn || [];
    const nextAvailableOn = availableOn.includes(menuType)
      ? availableOn.filter(t => t !== menuType)
      : [...availableOn, menuType];
    
    updateDoc(itemRef, { availableOn: nextAvailableOn });
  };

  const handleDragEnd = (event: DragEndEvent, menuType: string, items: MenuItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !firestore || !hasAccess) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex);
    
    const batch = writeBatch(firestore);
    reordered.forEach((item, index) => {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
      batch.update(itemRef, {
        [`menuRanks.${menuType}`]: index
      });
    });

    batch.commit().then(() => {
      toast({ title: "Order Updated", description: `Display priority saved for ${menuType}.` });
    });
  };

  const handleUpdateThreshold = async (menuType: string, field: 'warning' | 'max', value: string) => {
    if (!firestore || !seller || !hasAccess) return;
    const val = parseInt(value) || 0;
    const currentThresholds = seller.orderThresholds || {};
    const menuThresholds = currentThresholds[menuType] || { warning: 7, max: 10 };
    
    const updatedThresholds = {
      ...currentThresholds,
      [menuType]: {
        ...menuThresholds,
        [field]: val
      }
    };

    setIsSavingThresholds(true);
    updateDoc(doc(firestore, 'sellers', sellerId), {
      orderThresholds: updatedThresholds
    }).finally(() => setIsSavingThresholds(false));
  };

  const getImpersonationLink = () => {
    if (!selectedOpsMenu) return null;
    switch (selectedOpsMenu) {
      case 'Beverage Cart': return `/sellers/${sellerId}/bevcart`;
      case 'Lane Delivery': return `/sellers/${sellerId}/laneside`;
      default: return `/sellers/${sellerId}/clubhouse`;
    }
  };

  const isGolfCourse = useMemo(() => {
    return seller?.type?.toLowerCase().includes('golf');
  }, [seller?.type]);

  const filteredLibraryForPicker = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchesCategory = pickerCategory === 'All' || item.category === pickerCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, pickerSearch, pickerCategory]);

  if (isUserLoading || !isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verifying Authorization...</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] shadow-xl max-w-md w-full space-y-6">
          <div className="p-4 bg-red-100 rounded-full inline-block">
            <Lock className="h-12 w-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-[#213147]">ACCESS RESTRICTED</h2>
            <p className="text-sm text-muted-foreground font-medium">You must be authorized as a Seller Admin or Platform Admin to manage this venue.</p>
          </div>
          <Button asChild className="w-full h-12 bg-[#213147] hover:bg-black font-bold uppercase tracking-widest">
            <Link href="/login">Authenticate</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-center md:text-left">
          <div className="flex-1">
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight">ESTABLISHMENT ADMIN</h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <p className="text-muted-foreground">{isSellerLoading ? 'Loading...' : seller?.courseName}</p>
              {isTestMode && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] font-black uppercase h-5"><FlaskConical className="h-2.5 w-2.5 mr-1" /> Test mode active</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3 self-center md:self-auto">
             <Button variant="ghost" onClick={handleLogout} className="h-9 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5 mr-2">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
             </Button>
             <Button variant="outline" size="sm" className="bg-background"><Sparkles className="mr-2 h-4 w-4" /> Reset Demo</Button>
          </div>
        </header>

        <nav className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-y mb-8 -mx-4 px-4 py-3 flex items-center justify-center sm:justify-start gap-2 overflow-x-auto shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('ops-monitor')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <Activity className="mr-1.5 h-3.5 w-3.5" /> Live Queue
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('stripe-onboarding')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Payments
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('staff-management')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Staff Registry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('sales-stats')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Sales Stats
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('service-management')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Service Menus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('menu-library')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <Database className="mr-1.5 h-3.5 w-3.5" /> Menu Library
          </Button>
        </nav>

        <section id="ops-monitor" className="mb-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider"><Activity className="h-6 w-6" /> Live Monitor</h2>
            </div>
            <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border">
              {seller?.menuTypes?.map(type => (
                <Button key={`ops-menu-${type}`} variant={selectedOpsMenu === type ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedOpsMenu(type)} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3">
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-8 p-4 bg-muted/10 border-2 border-dashed rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Service Availability</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Toggle visibility of digital menus for patrons</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {seller?.menuTypes?.map(type => {
                  const fieldMap: Record<string, keyof Seller> = {
                    'Beverage Cart': 'bevcartActive',
                    'Clubhouse': 'clubhouseActive',
                    'Lane Delivery': 'lanedeliveryActive',
                    'Take Out': 'takeoutActive'
                  };
                  const field = fieldMap[type];
                  if (!field) return null;
                  const isActive = (seller as any)[field] === true;
                  
                  return (
                    <div key={`avail-${type}`} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border shadow-sm group hover:border-primary/30 transition-colors">
                      <Switch 
                        checked={isActive} 
                        onCheckedChange={(checked) => {
                          if (!firestore) return;
                          updateDoc(doc(firestore, 'sellers', sellerId), { 
                            [field]: checked,
                            lastActive: checked ? serverTimestamp() : (seller.lastActive || null)
                          });
                        }}
                        className="scale-75 data-[state=checked]:bg-green-600"
                      />
                      <span className="text-[9px] font-black uppercase tracking-tight pr-1">{type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <OpsMetricCard label={`Today's Revenue`} value={`$${(opsMetrics?.total?.revenue || 0).toFixed(2)}`} icon={DollarSign} colorClass="text-primary bg-primary/10" />
            <OpsMetricCard label={`${selectedOpsMenu} Revenue`} value={`$${(opsMetrics?.selected?.revenue || 0).toFixed(2)}`} icon={DollarSign} colorClass="text-green-600 bg-green-500/10" />
            <OpsMetricCard label={`${selectedOpsMenu} Volume`} value={opsMetrics?.selected?.count || 0} icon={ListOrdered} colorClass="text-indigo-600 bg-indigo-500/10" />
            <OpsMetricCard label={`${selectedOpsMenu} Avg Time`} value={`${opsMetrics?.selected?.avgTime.toFixed(1) || '0'}m`} icon={Timer} colorClass="text-blue-600 bg-blue-500/10" />
            
            <div className="bg-background border rounded-xl p-3 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">Alerts</p>
                  <p className="text-sm font-black font-headline text-destructive">{opsMetrics?.selected?.exceededCount || 0}</p>
                </div>
              </div>
              <Button asChild variant="link" className="h-6 p-0 text-[9px] font-black uppercase tracking-widest text-indigo-600 self-end">
                <Link href={getImpersonationLink() || '#'}>
                  Impersonate Staff <ExternalLink className="ml-1 h-2.5 w-2.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className={cn("grid grid-cols-1 gap-6", isGolfCourse ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
            {isGolfCourse && (
              <Card className="lg:col-span-2 h-[450px] overflow-hidden shadow-md border-2">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                  {seller ? <MapView sellerLocation={{ latitude: seller.latitude, longitude: seller.longitude }} buyers={filteredOpsOrders.map(o => ({ id: o.id, name: o.customerName, location: o.deliveryLocation }))} zoomMode="all" interactive={true} /> : <Skeleton className="w-full h-full" />}
                </APIProvider>
              </Card>
            )}
            <Card className={cn("shadow-md flex flex-col border-2 overflow-hidden", isGolfCourse ? "max-h-[450px]" : "max-h-[600px] w-full")}>
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-black uppercase">Live {selectedOpsMenu} Queue</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {areOrdersLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={`ops-skel-${i}`} className="h-24 w-full" />)
                    ) : filteredOpsOrders.length === 0 ? (
                      <p className="text-center py-20 text-sm italic text-muted-foreground">No active orders.</p>
                    ) : (
                      filteredOpsOrders.map((order) => (
                        <div key={`queue-item-${order.id}`} className="p-4 rounded-xl border-2 bg-background flex flex-col gap-2 shadow-sm">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-black uppercase truncate">{order.customerName}</span>
                            <Badge variant="outline" className="text-[8px] uppercase font-black">{order.status}</Badge>
                          </div>
                          <div className="text-[9px] text-muted-foreground font-medium truncate">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="stripe-onboarding" className="mb-12 scroll-mt-32">
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-[#635BFF] uppercase tracking-wider"><CreditCard className="h-6 w-6" /> Stripe Connect</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manage your digital payment integration.</p>
          </div>
          
          <Card className="shadow-lg border-2 border-[#635BFF]/20 bg-[#635BFF]/5">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-[#635BFF]/10 shrink-0">
                  <Zap className="h-12 w-12 text-[#635BFF] fill-[#635BFF]" />
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <h3 className="font-headline text-2xl font-black uppercase text-[#213147] tracking-tight">
                        {seller?.stripeAccountId ? 'Stripe Account Connected' : 'Activate Digital Payments'}
                      </h3>
                      {isTestMode && <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black">Test Mode</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 max-w-lg leading-relaxed mt-2">
                      Connect your venue to Stripe to enable real-time mobile ordering and secure digital payments. Funds are transferred directly to your bank account.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                    <Button 
                      onClick={handleStripeOnboarding} 
                      disabled={isOnboardingStripe}
                      className="bg-[#635BFF] hover:bg-[#4b45e0] text-white h-12 px-8 font-black uppercase tracking-widest rounded-xl shadow-lg gap-3"
                    >
                      {isOnboardingStripe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                      {seller?.stripeOnboardingComplete ? 'Enter Stripe Dashboard' : (seller?.stripeAccountId ? 'Complete Onboarding' : 'Connect with Stripe')}
                    </Button>
                    
                    {seller?.stripeOnboardingComplete && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-100 rounded-xl">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Active Integration</span>
                      </div>
                    )}
                  </div>
                  {isTestMode && <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Note: Platform is currently using Stripe Sandbox credentials.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="staff-management" className="mb-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider"><Users className="h-6 w-6" /> Staff Registry</h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleInitializeDevice} className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Smartphone className="h-4 w-4" /> Initialize This Device
              </Button>
              <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }} className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 shadow-lg">
                <UserPlus className="h-4 w-4" /> Add Staff Member
              </Button>
            </div>
          </div>

          <Card className="shadow-lg border-2 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Staff Member</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Primary Role</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center">4-Digit PIN</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isStaffLoading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : staff?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">No staff members registered. Add your first driver or server above.</TableCell></TableRow>
                ) : staff?.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/5 group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", member.role === 'Driver' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600')}>
                          {member.role === 'Driver' ? <Truck className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                        </div>
                        <span className="font-bold text-sm">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[8px] font-black uppercase">{member.role}</Badge></TableCell>
                    <TableCell className="text-center">
                      <code className="text-xs font-mono font-black bg-muted px-2 py-1 rounded border tracking-widest">{member.pin}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingStaff(member); staffForm.reset(member); setIsStaffFormOpen(true); }} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStaff(member.id)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>

        <section id="sales-stats" className="mb-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider"><BarChart3 className="h-6 w-6" /> Sales Stats</h2>
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
              <Button variant={revenueMode === 'Gross' ? 'default' : 'ghost'} size="sm" onClick={() => setRevenueMode('Gross')} className="h-7 text-[10px] uppercase font-bold">Gross</Button>
              <Button variant={revenueMode === 'Net' ? 'default' : 'ghost'} size="sm" onClick={() => setRevenueMode('Net')} className="h-7 text-[10px] uppercase font-bold">Net</Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mb-8">
            {dashboardStats ? (
              <>
                <StatTile title="Monthly Performance" revenue={dashboardStats.monthly.revenue} orders={dashboardStats.monthly.orders} longWait={dashboardStats.monthly.longWait} />
                <StatTile title="Year-to-Date" revenue={dashboardStats.yearly.revenue} orders={dashboardStats.yearly.orders} longWait={dashboardStats.yearly.longWait} />
              </>
            ) : (
              [...Array(2)].map((_, i) => <Skeleton key={`stat-tile-skel-${i}`} className="h-48 flex-1 min-w-[300px]" />)
            )}
          </div>

          <Card className="shadow-lg border-2">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b bg-muted/10">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Sales Report Builder
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Select a range to view detailed transaction logs.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[260px] justify-start text-left font-normal h-10 border-2",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={handleExportToExcel} className="h-10 bg-green-600 hover:bg-green-700 font-black uppercase text-[10px] tracking-widest gap-2">
                  <Download className="h-4 w-4" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-b px-6 py-2 bg-muted/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Reporting in <span className="text-primary">{revenueMode}</span> mode
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {reportOrders.length} Transactions Found
                </span>
              </div>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Order ID</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Customer</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right">Revenue ({revenueMode})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areOrdersLoading ? (
                      [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                    ) : reportOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic text-sm">No data for the selected range.</TableCell></TableRow>
                    ) : (
                      reportOrders.map((order) => {
                        const revenue = revenueMode === 'Gross' ? order.total : (order.subtotal + (order.tip || 0));
                        return (
                          <TableRow key={order.id} className="hover:bg-muted/5">
                            <TableCell><code className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded">#{getNumericOrderId(order.id)}</code></TableCell>
                            <TableCell className="text-[10px] font-medium">{order.createdAt ? format(order.createdAt.toDate(), 'MMM d, h:mm a') : 'N/A'}</TableCell>
                            <TableCell className="text-xs font-bold">{order.customerName}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">{order.menuType}</Badge></TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs text-primary">${revenue.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <section id="service-management" className="mb-12 mt-16 scroll-mt-32">
          <div className="flex flex-col gap-1 mb-6">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider"><ListChecks className="h-6 w-6" /> Service Menus</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Drag and drop items to set display priority for patrons.</p>
          </div>
          <div className="grid grid-cols-1 gap-12">
            {seller?.menuTypes?.map(menuType => {
                const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
                return (
                    <Card key={`menu-sec-${menuType}`} className="shadow-lg">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b bg-muted/20 gap-4">
                            <div>
                                <CardTitle className="text-xl uppercase tracking-tight">{menuType} Menu</CardTitle>
                                <CardDescription>Manage priority and category visibility.</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setConfigMenuType(menuType); setIsCategoryConfigOpen(true); }} className="bg-background">
                                  <Settings2 className="mr-2 h-4 w-4" /> Config Structure
                              </Button>
                              <Button variant="default" size="sm" onClick={() => { setPickingMenuType(menuType); setIsPickingOpen(true); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Manage Items
                              </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {itemsInThisMenu.length === 0 ? (
                                <p className="text-center py-12 text-muted-foreground italic">No items added to this menu.</p>
                            ) : (
                                <div className="space-y-10">
                                    {getCategoriesForMenu(menuType).map(category => {
                                        const itemsInCategory = itemsInThisMenu
                                          .filter(i => i.category === category)
                                          .sort((a, b) => {
                                            const rA = a.menuRanks?.[menuType] ?? a.rank ?? 0;
                                            const rB = b.menuRanks?.[menuType] ?? b.rank ?? 0;
                                            return rA - rB;
                                          });
                                        
                                        const modsEnabled = seller.categoryModifierEnabled?.[menuType]?.includes(category);
                                        if (itemsInCategory.length === 0) return null;
                                        return (
                                            <div key={`${menuType}-${category}`} className="space-y-4">
                                                <div className="flex items-center gap-2 border-b pb-2">
                                                  <h4 className="font-bold text-sm uppercase tracking-widest">{category}</h4>
                                                  {modsEnabled && <Badge variant="secondary" className="uppercase text-[9px] bg-primary/10 text-primary border-primary/20">Base + Modifiers Enabled</Badge>}
                                                </div>
                                                
                                                <DndContext 
                                                  sensors={sensors}
                                                  collisionDetection={closestCenter}
                                                  onDragEnd={(e) => handleDragEnd(e, menuType, itemsInCategory)}
                                                >
                                                  <SortableContext 
                                                    items={itemsInCategory.map(i => i.id)}
                                                    strategy={verticalListSortingStrategy}
                                                  >
                                                    <div className="grid grid-cols-1 gap-2 max-w-2xl">
                                                        {itemsInCategory.map(item => (
                                                            <SortableMenuItem 
                                                              key={item.id} 
                                                              item={item} 
                                                              onRemove={(it) => handleToggleMenuItemAvailability(it, menuType)} 
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
                        </CardContent>
                    </Card>
                );
            })}
          </div>
        </section>

        <Card id="menu-library" className="mb-12 mt-16 shadow-md border-primary/20 bg-primary/5 scroll-mt-32">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 uppercase tracking-tight text-primary"><Database className="h-5 w-5" /> Menu Library</CardTitle>
              <CardDescription>Global item catalog.</CardDescription>
            </div>
            <Button onClick={() => { setEditingItem(null); setIsMasterFormOpen(true); }} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Item</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems?.filter(i => masterCategoryFilter === 'All' || i.category === masterCategoryFilter).map(item => (
                <div key={`lib-item-${item.id}`} className="p-4 rounded-xl bg-background border shadow-sm group hover:border-primary/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">{item.category}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setIsMasterFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLibraryItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    {item.imageUrl && (
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden border bg-muted shrink-0">
                        <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="object-cover" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="font-mono font-bold text-sm text-primary">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <section id="account-settings" className="mb-12 mt-16 scroll-mt-32">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider"><Settings className="h-6 w-6" /> Account Settings</h2>
          <div className="grid grid-cols-1 gap-8">
            <Card className="shadow-lg border-2 border-primary/10">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg font-headline uppercase flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Service Alert Thresholds
                </CardTitle>
                <CardDescription>Configure how long an order can remain active before alerting staff.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {seller?.menuTypes?.map(menuType => {
                  const thresholds = seller.orderThresholds || {};
                  const t = thresholds[menuType] || { warning: 7, max: 10 };
                  return (
                    <div key={`thresh-${menuType}`} className="p-4 rounded-xl bg-muted/30 border border-dashed grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      <div className="space-y-1">
                        <p className="font-bold text-sm uppercase tracking-tight">{menuType}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active thresholds (min)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 col-span-2">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-yellow-600 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Warning (Yellow)
                          </Label>
                          <Input 
                            type="number" 
                            defaultValue={t.warning} 
                            onBlur={(e) => handleUpdateThreshold(menuType, 'warning', e.target.value)}
                            className="h-10 border-yellow-500/30 focus-visible:ring-yellow-500 font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" /> Max (Red)
                          </Label>
                          <Input 
                            type="number" 
                            defaultValue={t.max} 
                            onBlur={(e) => handleUpdateThreshold(menuType, 'max', e.target.value)}
                            className="h-10 border-red-500/30 focus-visible:ring-red-500 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-primary/10">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg font-headline uppercase flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" /> Operational Signage
                </CardTitle>
                <CardDescription>Your unique QR code links directly to your digital ordering menu.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2rem] shadow-2xl border-4 border-muted/20 relative aspect-square max-w-sm mx-auto overflow-hidden">
                    {seller?.qrCodeUrl ? (
                      <div className="text-center space-y-6">
                        <Image src={seller.qrCodeUrl} alt="Seller QR Code" width={250} height={250} className="mx-auto" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scan to Order</p>
                          <p className="text-sm font-bold truncate max-w-[200px]">{seller.courseName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="p-6 bg-muted rounded-full inline-block"><QrCode className="h-16 w-16 opacity-10" /></div>
                        <p className="text-xs text-muted-foreground italic px-8">No QR code generated.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="font-headline text-xl font-bold text-[#213147]">High-Resolution Assets</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">Download your QR code for use on-course, in carts, or at lanes.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Button className="h-14 font-black uppercase tracking-widest shadow-lg rounded-xl gap-3" disabled={!seller?.qrCodeUrl} asChild>
                        <a href={seller?.qrCodeUrl || '#'} download={`${seller?.courseName}_QR.png`} target="_blank"><Download className="h-5 w-5" /> Download High-Res</a>
                      </Button>
                      <Button variant="outline" className="h-14 font-black uppercase tracking-widest border-2 rounded-xl gap-3" disabled={!seller?.qrCodeUrl} onClick={() => window.print()}>
                        <Printer className="h-5 w-5" /> Print Table Tent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline uppercase text-primary">{editingStaff ? 'Update Staff Member' : 'Add Staff Member'}</DialogTitle>
              <DialogDescription>Assign a 4-digit PIN for device login.</DialogDescription>
            </DialogHeader>
            <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-4 pt-4">
                <FormField control={staffForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Staff Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={staffForm.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Primary Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Driver">Driver</SelectItem>
                        <SelectItem value="Server">Server</SelectItem>
                        <SelectItem value="Manager">Venue Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={staffForm.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">4-Digit Access PIN</FormLabel>
                    <FormControl><Input {...field} maxLength={4} className="font-mono font-black tracking-widest text-center text-lg" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full font-black uppercase tracking-widest">{editingStaff ? 'Save Changes' : 'Create Staff Member'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw] p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b"><DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
            <div className="p-6">
              <MasterItemForm onSave={handleSaveMasterItem} menuItem={editingItem} onClose={() => setIsMasterFormOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isPickingOpen} onOpenChange={setIsPickingOpen}>
          <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
              <DialogTitle className="uppercase font-headline flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" /> Manage {pickingMenuType} Items
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 border-b bg-background space-y-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search your library..." className="pl-10 h-10" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-1.5 pb-1">
                  <Button variant={pickerCategory === 'All' ? 'default' : 'outline'} size="sm" onClick={() => setPickerCategory('All')} className="h-7 text-[9px] font-black uppercase">All Categories</Button>
                  {categories.map(cat => <Button key={cat} variant={pickerCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setPickerCategory(cat)} className="h-7 text-[9px] font-black uppercase">{cat}</Button>)}
                </div>
              </ScrollArea>
            </div>
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="grid grid-cols-1 gap-3 pb-8">
                {filteredLibraryForPicker.map((item) => {
                  const isSelected = item.availableOn?.includes(pickingMenuType);
                  return (
                    <button key={item.id} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all group", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/30")} onClick={() => handleToggleMenuItemAvailability(item, pickingMenuType)}>
                      <div className="flex items-center gap-4">
                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", isSelected ? "bg-primary border-primary" : "bg-background border-muted-foreground/20")}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm leading-tight">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] uppercase font-black px-1.5 h-4">{item.category}</Badge>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">${item.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
              <Button onClick={() => setIsPickingOpen(false)} className="w-full sm:w-auto font-black uppercase text-xs">Finished Configuration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryConfigOpen} onOpenChange={setIsCategoryConfigOpen}>
          <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
              <DialogTitle className="uppercase tracking-tight">Structure: {configMenuType}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="grid grid-cols-1 gap-4 pb-8">
                {getCategoriesForMenu(configMenuType).map(category => {
                  const isVisible = seller?.categoryVisibility?.[configMenuType]?.includes(category);
                  const showImages = seller?.categoryImageVisibility?.[configMenuType]?.includes(category);
                  const modsEnabled = seller?.categoryModifierEnabled?.[configMenuType]?.includes(category);
                  return (
                    <div key={category} className={cn("grid grid-cols-12 items-center gap-2 p-4 border-2 rounded-xl transition-all", isVisible ? "border-primary bg-primary/5" : "border-muted opacity-60")}>
                      <div className="col-span-6 flex flex-col"><span className="text-sm font-black uppercase">{category}</span></div>
                      <div className="col-span-3 flex justify-center">
                        <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", modsEnabled ? "text-primary" : "text-muted-foreground")} onClick={() => handleToggleCategoryModifier(configMenuType, category)}>
                          <Layers className={cn("h-5 w-5", !modsEnabled && "opacity-30")} />
                        </Button>
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <Button variant="ghost" size="icon" disabled={!isVisible} className={cn("h-10 w-10 rounded-full", showImages ? "text-primary" : "text-muted-foreground")} onClick={() => {
                          const current = seller?.categoryImageVisibility?.[configMenuType] || [];
                          const next = current.includes(category) ? current.filter(c => c !== category) : [...current, category];
                          updateDoc(doc(firestore, 'sellers', sellerId), { [`categoryImageVisibility.${configMenuType}`]: next });
                        }}>
                          <ImageIcon className={cn("h-5 w-5", !showImages && "opacity-30")} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button onClick={() => setIsCategoryConfigOpen(false)} className="w-full sm:w-auto font-bold uppercase text-xs">Save Structure</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showTopButton && (
        <Button variant="default" size="icon" className="fixed bottom-10 right-10 rounded-full shadow-2xl z-50 h-12 w-12" onClick={scrollToTop}>
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
