'use client';

import React, { useState, useMemo, useEffect, use, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Database, 
  Users, 
  Sparkles, 
  FileSpreadsheet, 
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
  Map as MapIcon,
  ImageIcon,
  Timer,
  Eye,
  EyeOff,
  Truck,
  Building,
  MapPin,
  ShoppingBasket,
  Utensils,
  AlertTriangle,
  Waves,
  ListOrdered,
  Download,
  Calendar as CalendarIcon,
  ClipboardList,
  ExternalLink,
  ArrowUp,
  Layers,
  QrCode,
  FileImage,
  Printer,
  Info,
  Lock,
  LogOut
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear, format, startOfMonth, parseISO, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapView } from '@/components/map-view';
import { APIProvider } from '@vis.gl/react-google-maps';
import Image from 'next/image';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';

import type { MenuItem, Seller, Category, Order, Member, SellerType, ModifierGroup, ModifierOption } from '@/lib/types';
import { categories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
      <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col h-[80vh]">
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
                  <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
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
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isPickingOpen, setIsPickingOpen] = useState(false);
  const [pickingMenuType, setPickingMenuType] = useState<string>('');
  
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [configMenuType, setConfigMenuType] = useState<string>('');

  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');
  const [selectedOpsMenu, setSelectedOpsMenu] = useState<string>('');
  const [showTopButton, setShowTopButton] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [revenueMode, setRevenueMode] = useState<'Gross' | 'Net'>('Gross');

  // AUTHORIZATION GATE: GOD-MODE CHECK
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => setShowTopButton(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

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

  const menuItemsQuery = useMemoFirebase(() => (firestore && isSuperAdmin ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, isSuperAdmin]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore && isSuperAdmin ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, isSuperAdmin]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const activeOrders = useMemo(() => {
    return orders?.filter(o => ['Placed', 'Preparing', 'Out for Delivery'].includes(o.status)) || [];
  }, [orders]);

  const filteredOpsOrders = useMemo(() => {
    return activeOrders.filter(o => o.menuType === selectedOpsMenu);
  }, [activeOrders, selectedOpsMenu]);

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

  const handleSaveMasterItem = (data: MenuItemFormData) => {
    if (!firestore || !isSuperAdmin) return;
    const itemRef = editingItem ? doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id) : doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
    setDoc(itemRef, { ...data, id: itemRef.id, rank: editingItem?.rank || (menuItems?.length || 0) + 1 }, { merge: true });
    setEditingItem(null); setIsMasterFormOpen(false);
  };

  const handleDeleteLibraryItem = (itemId: string) => {
    if (!firestore || !isSuperAdmin) return;
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
    if (!firestore || !seller || !isSuperAdmin) return;
    const currentEnabled = seller.categoryModifierEnabled?.[menuType] || [];
    const isEnabled = currentEnabled.includes(category);
    const nextEnabled = isEnabled ? currentEnabled.filter(c => c !== category) : [...currentEnabled, category];
    
    updateDoc(doc(firestore, 'sellers', sellerId), {
      [`categoryModifierEnabled.${menuType}`]: nextEnabled
    });
  };

  const getImpersonationLink = () => {
    if (!selectedOpsMenu) return null;
    switch (selectedOpsMenu) {
      case 'Beverage Cart': return `/sellers/${sellerId}/bevcart`;
      case 'Lane Delivery': return `/sellers/${sellerId}/laneside`;
      default: return `/sellers/${sellerId}/clubhouse`;
    }
  };

  if (isUserLoading || !isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verifying Authorization...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] shadow-xl max-w-md w-full space-y-6">
          <div className="p-4 bg-red-100 rounded-full inline-block">
            <Lock className="h-12 w-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-[#213147]">SELLER ADMIN ACCESS RESTRICTED</h2>
            <p className="text-sm text-muted-foreground font-medium">You must be logged in as a Super Admin to manage venue settings, library, and sales data.</p>
          </div>
          <Button asChild className="w-full h-12 bg-[#213147] hover:bg-black font-bold uppercase tracking-widest">
            <Link href="/login">Authenticate as Admin</Link>
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
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight">SELLER ADMIN</h1>
            <p className="text-muted-foreground">{isSellerLoading ? 'Loading...' : seller?.courseName}</p>
          </div>
          <div className="flex items-center gap-3 self-center md:self-auto">
             <Button variant="ghost" onClick={handleLogout} className="h-9 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5 mr-2">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
             </Button>
             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="bg-background">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
             </Button>
             <input type="file" ref={fileInputRef} className="hidden" />
             <Button variant="outline" size="sm" className="bg-background"><Sparkles className="mr-2 h-4 w-4" /> Reset Demo</Button>
          </div>
        </header>

        <nav className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-y mb-8 -mx-4 px-4 py-3 flex items-center justify-center sm:justify-start gap-2 overflow-x-auto shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('ops-monitor')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <Activity className="mr-1.5 h-3.5 w-3.5" /> Live Queue
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('sales-stats')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Sales Stats
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('service-management')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" /> Service Menus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('qr-signage')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10">
            <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR & Signage
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

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-primary/5 rounded-xl border-2 border-primary/10 p-4 flex flex-col justify-center gap-1 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 leading-none mb-1">Establishment Totals</p>
              <div className="flex justify-between items-center px-1">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-tight text-muted-foreground">Today's Revenue</span>
                  <span className="text-base font-headline font-black text-primary">${(opsMetrics?.total?.revenue || 0).toFixed(2)}</span>
                </div>
                <div className="h-8 w-[1px] bg-primary/10" />
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black uppercase tracking-tight text-muted-foreground">Alerts</span>
                  <span className="text-base font-headline font-black text-destructive">{opsMetrics?.total?.exceededCount || 0}</span>
                </div>
              </div>
            </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 h-[450px] overflow-hidden shadow-md border-2">
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                {seller ? <MapView sellerLocation={{ latitude: seller.latitude, longitude: seller.longitude }} buyers={filteredOpsOrders.map(o => ({ id: o.id, name: o.customerName, location: o.deliveryLocation }))} zoomMode="all" interactive={true} /> : <Skeleton className="w-full h-full" />}
              </APIProvider>
            </Card>
            <Card className="shadow-md flex flex-col border-2 overflow-hidden max-h-[450px]">
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-black uppercase">Live {selectedOpsMenu} Queue</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
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
                          {order.items.some(i => i.selectedModifiers) && (
                            <div className="flex flex-wrap gap-1">
                              {order.items.flatMap(i => Object.values(i.selectedModifiers || {}).flat()).map((m, mIdx) => (
                                <span key={`${order.id}-${mIdx}`} className="text-[7px] font-bold bg-primary/5 text-primary px-1 rounded uppercase">+ {m.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="service-management" className="mb-12 mt-16 scroll-mt-32">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider"><ListChecks className="h-6 w-6" /> Service Menus</h2>
          <div className="grid grid-cols-1 gap-12">
            {seller?.menuTypes?.map(menuType => {
                const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
                return (
                    <Card key={`menu-sec-${menuType}`} className="shadow-lg">
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b bg-muted/20 gap-4">
                            <div>
                                <CardTitle className="text-xl uppercase tracking-tight">{menuType} Menu</CardTitle>
                                <CardDescription>Manage visibility and structure.</CardDescription>
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
                                <div className="space-y-8">
                                    {getCategoriesForMenu(menuType).map(category => {
                                        const itemsInCategory = itemsInThisMenu.filter(i => i.category === category);
                                        const modsEnabled = seller.categoryModifierEnabled?.[menuType]?.includes(category);
                                        if (itemsInCategory.length === 0) return null;
                                        return (
                                            <div key={`${menuType}-${category}`} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                  <h4 className="font-bold text-sm uppercase tracking-widest">{category}</h4>
                                                  {modsEnabled && <Badge variant="secondary" className="uppercase text-[9px] bg-primary/10 text-primary border-primary/20">Base + Modifiers Enabled</Badge>}
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {itemsInCategory.map(item => (
                                                        <div key={`${menuType}-${item.id}`} className="flex items-center justify-between p-2 rounded-lg bg-card border">
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium">{item.name}</span>
                                                            {item.modifierGroups?.length ? <Layers className="h-3 w-3 text-primary" /> : null}
                                                          </div>
                                                          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), { availableOn: item.availableOn?.filter(t => t !== menuType) })}><Trash2 className="h-3 w-3" /></Button>
                                                        </div>
                                                    ))}
                                                </div>
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

        <section id="qr-signage" className="mb-12 mt-16 scroll-mt-32">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider"><QrCode className="h-6 w-6" /> QR Code & Signage</h2>
          <Card className="shadow-lg border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg font-headline uppercase">Operational Signage</CardTitle>
              <CardDescription>Your unique QR code links directly to your digital ordering menu.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-[2rem] shadow-2xl border-4 border-muted/20 relative aspect-square max-w-sm mx-auto overflow-hidden">
                  {seller?.qrCodeUrl ? (
                    <div className="text-center space-y-6">
                      <Image 
                        src={seller.qrCodeUrl} 
                        alt="Seller QR Code" 
                        width={250} 
                        height={250} 
                        className="mx-auto"
                      />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scan to Order</p>
                        <p className="text-sm font-bold truncate max-w-[200px]">{seller.courseName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="p-6 bg-muted rounded-full inline-block">
                        <QrCode className="h-16 w-16 opacity-10" />
                      </div>
                      <p className="text-xs text-muted-foreground italic px-8">No QR code generated for this venue yet. Please contact KOOP Admin or initialize via settings.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-headline text-xl font-bold text-[#213147]">High-Resolution QR Assets</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Download your venue's unique QR code for use on on-course signage, cart placards, menu boards, or table tents. This code points to your live digital ordering platform.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      className="h-14 font-black uppercase tracking-widest shadow-lg rounded-xl gap-3"
                      disabled={!seller?.qrCodeUrl}
                      asChild
                    >
                      <a href={seller?.qrCodeUrl} download={`${seller?.courseName}_QR.png`} target="_blank">
                        <Download className="h-5 w-5" />
                        Download High-Res PNG
                      </a>
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-14 font-black uppercase tracking-widest border-2 rounded-xl gap-3"
                      disabled={!seller?.qrCodeUrl}
                      onClick={() => window.print()}
                    >
                      <Printer className="h-5 w-5" />
                      Print Table Tent (PDF)
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-xl border border-dashed flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest">Signage Tip</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        For best results on golf courses, place QR codes on every hole marker and inside the beverage carts. For bowling alleys, place on the scoring consoles at each lane.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="sales-stats" className="mb-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider"><BarChart3 className="h-6 w-6" /> Sales Stats</h2>
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
              <Button variant={revenueMode === 'Gross' ? 'default' : 'ghost'} size="sm" onClick={() => setRevenueMode('Gross')} className="h-7 text-[10px] uppercase font-bold">Gross</Button>
              <Button variant={revenueMode === 'Net' ? 'default' : 'ghost'} size="sm" onClick={() => setRevenueMode('Net')} className="h-7 text-[10px] uppercase font-bold">Net (No Tax)</Button>
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
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
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

        <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
            <MasterItemForm onSave={handleSaveMasterItem} menuItem={editingItem} onClose={() => setIsMasterFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryConfigOpen} onOpenChange={setIsCategoryConfigOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="uppercase tracking-tight">Structure: {configMenuType}</DialogTitle>
              <CardDescription>Enable modifiers and image display per category.</CardDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <div className="col-span-6">Category Name</div>
                  <div className="col-span-3 text-center">Modifiers</div>
                  <div className="col-span-3 text-center">Pictures</div>
                </div>
                {getCategoriesForMenu(configMenuType).map(category => {
                  const isVisible = seller?.categoryVisibility?.[configMenuType]?.includes(category);
                  const showImages = seller?.categoryImageVisibility?.[configMenuType]?.includes(category);
                  const modsEnabled = seller?.categoryModifierEnabled?.[configMenuType]?.includes(category);
                  
                  return (
                    <div key={`conf-cat-${category}`} className={cn("grid grid-cols-12 items-center gap-2 p-4 border-2 rounded-xl transition-all", isVisible ? "border-primary bg-primary/5" : "border-muted opacity-60")}>
                      <div className="col-span-6 flex flex-col">
                        <span className="text-sm font-black uppercase tracking-tight">{category}</span>
                      </div>
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
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-muted/20">
              <Button onClick={() => setIsCategoryConfigOpen(false)} className="w-full sm:w-auto font-bold uppercase text-xs tracking-widest">Save Structure</Button>
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
