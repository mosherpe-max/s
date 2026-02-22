'use client';

import React, { useState, useMemo, useEffect, use, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
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
  ArrowUp, 
  Settings2, 
  UserPlus, 
  GripVertical,
  DollarSign,
  ShoppingBag,
  Clock,
  Activity,
  Map as MapIcon,
  Navigation,
  ChevronRight,
  ImageIcon,
  LayoutGrid,
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
  Upload,
  Focus,
  ListOrdered
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear, formatDistanceToNow } from 'date-fns';
import * as XLSX from 'xlsx';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { MapView } from '@/components/map-view';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import Image from 'next/image';

import type { MenuItem, Seller, Category, Order, Member, SellerType } from '@/lib/types';
import { categories } from '@/lib/types';
import { menuItems as mockMenuItems } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
  imageUrl: z.string().url('Please enter a valid image URL').or(z.literal('')).optional(),
  availableOn: z.array(z.string()).optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  memberNumber: z.string().min(1, 'Member ID number is required'),
  status: z.enum(['Active', 'Inactive']),
});

type MemberFormData = z.infer<typeof memberSchema>;

const thresholdSchema = z.object({
  warning: z.coerce.number().min(1, 'Warning duration must be at least 1 minute'),
  max: z.coerce.number().min(1, 'Max duration must be at least 1 minute'),
});

type ThresholdFormData = z.infer<typeof thresholdSchema>;

const getCategoriesForMenu = (menuType: string): Category[] => {
  if (menuType === 'Beverage Cart') {
    return ['Beer', 'Spirits', 'Soft Drinks', 'Snacks', 'Kids', 'Other'];
  }
  return [...categories] as Category[];
};

const serviceTypeIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Pool': Waves,
  'Take Out': ShoppingBasket,
  'Halfway House': Building,
  'Dine-In': Utensils,
  'Lane Delivery': MapPin,
};

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
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 py-4 pr-2">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Craft IPA" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="A short description of the item." /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="imageUrl" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2"><ImageIcon className="h-3 w-3" /> Image URL</FormLabel>
              <FormControl><Input {...field} placeholder="https://images.unsplash.com/..." /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{menuItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
}

function MemberForm({
  onSave,
  onClose,
  member,
  disabled,
}: {
  onSave: (memberData: MemberFormData) => void;
  onClose: () => void;
  member?: Member | null;
  disabled?: boolean;
}) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member || {
      name: '',
      memberNumber: '',
      status: 'Active',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 py-4 pr-2">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Member Name</FormLabel><FormControl><Input {...field} placeholder="Full Name" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="memberNumber" render={({ field }) => (
            <FormItem><FormLabel>Member ID / Number</FormLabel><FormControl><Input {...field} placeholder="e.g. 12345" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Account Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{member ? 'Update Member' : 'Add Member'}</Button>
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

function SortableItem({ item, onDelete, menuType }: { item: MenuItem; onDelete: () => void; menuType: string }) {
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
    zIndex: isDragging ? 10 : 0
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 rounded-lg bg-card border group",
        isDragging && "opacity-50 shadow-lg border-primary"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary">
          <GripVertical className="h-4 w-4" />
        </div>
        {item.imageUrl && (
          <div className="relative h-6 w-6 rounded-md overflow-hidden border bg-muted flex-shrink-0">
            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
          </div>
        )}
        <span className="text-xs font-medium truncate">{item.name}</span>
      </div>
      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function MapViewSetter({ onSet }: { onSet: (center: { lat: number, lng: number }, zoom: number) => void }) {
  const map = useMap();
  
  const handleSetView = () => {
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    if (center && zoom !== undefined) {
      onSet({ lat: center.lat(), lng: center.lng() }, zoom);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <Button size="sm" onClick={handleSetView} className="shadow-lg bg-primary text-white font-black uppercase text-[10px] tracking-widest px-4">
        <MapIcon className="mr-2 h-3.5 w-3.5" />
        Set Map View
      </Button>
    </div>
  );
}

export default function SellerAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  const [isPickingOpen, setIsPickingOpen] = useState(false);
  const [pickingMenuType, setPickingMenuType] = useState<string>('');
  
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [configMenuType, setConfigMenuType] = useState<string>('');

  const [isThresholdConfigOpen, setIsThresholdConfigOpen] = useState(false);
  const [thresholdMenuType, setThresholdMenuType] = useState<string>('');

  const [isPoolMapConfigOpen, setIsPoolMapConfigOpen] = useState(false);
  const [tempPoolMapUrl, setTempPoolMapUrl] = useState<string | null>(null);

  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');
  const [selectedOpsMenu, setSelectedOpsMenu] = useState<string>('');
  const [showTopButton, setShowTopButton] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    
    const interval = setInterval(() => setNow(Date.now()), 10000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  useEffect(() => {
    if (seller?.menuTypes?.length && !selectedOpsMenu) {
      setSelectedOpsMenu(seller.menuTypes[0]);
    }
  }, [seller, selectedOpsMenu]);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const membersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'members') : null), [firestore, sellerId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const isClubSeller = seller?.type === 'Private Golf Course' || seller?.type === 'Semi Private Golf Course';
  const isGolfCourse = seller?.type.includes('Golf Course');
  const isBowlingAlley = seller?.type === 'Bowling Alley';

  const activeOrders = useMemo(() => {
    return orders?.filter(o => ['Placed', 'Preparing', 'Out for Delivery'].includes(o.status)) || [];
  }, [orders]);

  const filteredOpsOrders = useMemo(() => {
    return activeOrders.filter(o => o.menuType === selectedOpsMenu);
  }, [activeOrders, selectedOpsMenu]);

  const dashboardStats = useMemo(() => {
    if (!orders || !seller) return null;
    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + o.total, 0);
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
  }, [orders, seller]);

  const opsMetrics = useMemo(() => {
    if (!orders || !seller) return null;

    const calculateMetrics = (filtered: Order[]) => {
      const todayOrders = filtered.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
      const deliveredToday = todayOrders.filter(o => o.status === 'Delivered');
      
      const revenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      
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
  }, [orders, seller, selectedOpsMenu, now]);

  const mappedBuyers = useMemo(() => {
    return filteredOpsOrders.map(o => {
      let colorClass = "bg-green-600";
      const thresholds = seller?.orderThresholds?.[o.menuType] || { warning: 7, max: 10 };

      if (o.createdAt) {
        const orderTime = o.createdAt.toDate().getTime();
        const minutesElapsed = (now - orderTime) / 60000;
        if (minutesElapsed >= thresholds.max) {
          colorClass = "bg-red-600";
        } else if (minutesElapsed >= thresholds.warning) {
          colorClass = "bg-yellow-500";
        }
      }
      return {
        id: o.id,
        name: o.customerName,
        location: o.deliveryLocation,
        colorClass,
        assignedDriverId: o.assignedDriverId
      };
    });
  }, [filteredOpsOrders, now, seller]);

  const liveDrivers = useMemo(() => {
    const drivers = [];
    if (selectedOpsMenu === 'Beverage Cart' && seller?.bevcartActive) {
      drivers.push({
        id: seller.id,
        name: `${seller.courseName} BevCart`,
        location: { latitude: seller.latitude, longitude: seller.longitude }
      });
    } else if (selectedOpsMenu === 'Clubhouse' && seller?.clubhouseActive) {
      drivers.push({
        id: seller.id,
        name: `${seller.courseName} Clubhouse`,
        location: { latitude: seller.latitude, longitude: seller.longitude }
      });
    }
    return drivers;
  }, [seller, selectedOpsMenu]);

  const filteredMasterItems = useMemo(() => {
    if (!menuItems) return [];
    if (masterCategoryFilter === 'All') return [...menuItems].sort((a,b) => a.name.localeCompare(b.name));
    return menuItems
      .filter(item => item.category === masterCategoryFilter)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [menuItems, masterCategoryFilter]);

  const sortedMenuTypesForAdmin = useMemo(() => {
    if (!seller?.menuTypes) return [];
    const types = [...seller.menuTypes];
    types.sort((a, b) => {
      const order = ['Lane Delivery', 'Take Out', 'Beverage Cart', 'Clubhouse', 'Pool', 'Halfway House', 'Dine-In'];
      let indexA = order.indexOf(a);
      let indexB = order.indexOf(b);
      if (indexA === -1) indexA = 99;
      if (indexB === -1) indexB = 99;
      return indexA - indexB;
    });
    return types;
  }, [seller?.menuTypes]);

  const thresholdForm = useForm<ThresholdFormData>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { warning: 7, max: 10 }
  });

  const handleOpenThresholdConfig = (menuType: string) => {
    setThresholdMenuType(menuType);
    const existing = seller?.orderThresholds?.[menuType] || { warning: 7, max: 10 };
    thresholdForm.reset(existing);
    setIsThresholdConfigOpen(true);
  };

  const handleOpenPoolMapConfig = () => {
    setTempPoolMapUrl(seller?.poolMapUrl || null);
    setIsPoolMapConfigOpen(true);
  };

  const handleSaveThresholds = async (data: ThresholdFormData) => {
    if (!firestore || !sellerId) return;
    const updates = {
      [`orderThresholds.${thresholdMenuType}`]: data
    };
    await updateDoc(doc(firestore, 'sellers', sellerId), updates);
    setIsThresholdConfigOpen(false);
    toast({ title: 'Alerts Updated', description: `Durations updated for ${thresholdMenuType}.` });
  };

  const handleSetPoolMapView = (center: { lat: number, lng: number }, zoom: number) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=600x800&maptype=satellite&key=${key}`;
    setTempPoolMapUrl(staticUrl);
    toast({ title: 'View Captured', description: 'This satellite image will be used for patrons.' });
  };

  const handleSavePoolMap = async () => {
    if (!firestore || !sellerId || !tempPoolMapUrl) return;
    await updateDoc(doc(firestore, 'sellers', sellerId), { poolMapUrl: tempPoolMapUrl });
    setIsPoolMapConfigOpen(false);
    toast({ title: 'Pool Map Saved', description: 'Satellite layout updated for checkout.' });
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);
      
      let config = {
        name: 'Sample Establishment',
        type: 'Public Golf Course' as SellerType,
        menuTypes: ['Clubhouse']
      };

      let itemsToSeed = [...mockMenuItems];

      if (sellerId === 'demo-course') {
        config = { name: 'Demo Public Golf Links', type: 'Public Golf Course', menuTypes: ['Beverage Cart', 'Clubhouse'] };
      } else if (sellerId === 'demo-bowling-alley') {
        config = { name: 'Demo Bowling Lanes', type: 'Bowling Alley', menuTypes: ['Take Out', 'Lane Delivery'] };
        itemsToSeed = [
          { name: 'Pitcher of Domestic Light', description: 'Perfect for sharing while bowling.', price: 15.00, category: 'Beer', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'craft beer')?.imageUrl },
          { name: 'Bucket of Domestic (6)', description: 'Mix and match your favorites.', price: 25.00, category: 'Beer', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'lager can')?.imageUrl },
          { name: 'Fountain Soda', description: 'Refillable cup. Choice of Cola, Diet, Lemon-Lime.', price: 3.50, category: 'Soft Drinks', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'cola can')?.imageUrl },
          { name: 'Pitcher of Soda', description: 'Great for the whole lane!', price: 9.00, category: 'Soft Drinks', imageUrl: PlaceHolderImages.find(i => i.id === 'soft-drink-1')?.imageUrl },
          { name: 'Bowl of Popcorn', description: 'Buttery, salted, and fresh.', price: 4.50, category: 'Snacks', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'potato chips')?.imageUrl },
          { name: 'Loaded Nachos', description: 'Corn chips topped with cheese, jalapeños, and sour cream.', price: 10.50, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Buffalo Wings (10pc)', description: 'Crispy wings tossed in buffalo sauce.', price: 14.50, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Mozzarella Sticks', description: 'Served with zesty marinara sauce.', price: 8.00, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1531451394031-448f2a1c83e2?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Strike Burger', description: 'Cheeseburger with secret sauce and fries.', price: 13.50, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Classic Hot Dog', description: 'Grilled all-beef frank on a toasted bun.', price: 7.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Chicken Tenders & Fries', description: 'Breaded chicken breast strips with honey mustard.', price: 12.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Large Pepperoni Pizza', description: '16-inch classic with extra pepperoni.', price: 21.00, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Large Cheese Pizza', description: 'Thin crust with a four-cheese blend.', price: 18.00, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Ice Cream Sundae', description: 'Vanilla ice cream with chocolate syrup and a cherry.', price: 6.50, category: 'Dessert', imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Mini Corn Dogs', description: 'Bite-sized corn dogs served with ketchup.', price: 7.50, category: 'Kids', imageUrl: 'https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Junior Strike Sliders', description: 'Two mini cheeseburgers with a handful of fries.', price: 9.00, category: 'Kids', imageUrl: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Glow Bowl Wristband', description: 'Access to special lighting events.', price: 5.00, category: 'Other', imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1080' },
        ];
      } else if (sellerId === 'demo-golf-course-private') {
        config = { name: 'Demo Private Country Club', type: 'Private Golf Course', menuTypes: ['Beverage Cart', 'Clubhouse', 'Pool', 'Halfway House'] };
        itemsToSeed = [
          { name: 'Signature Old Fashioned', description: 'Small-batch bourbon, demerara, house bitters.', price: 16.00, category: 'Spirits', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'whiskey glass')?.imageUrl },
          { name: 'Reserve Cabernet', description: 'A bold, oak-aged red from Napa Valley.', price: 18.00, category: 'Beer', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'craft beer')?.imageUrl },
          { name: 'Lobster Roll', description: 'Fresh Maine lobster, warm butter, brioche bun.', price: 28.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Filet Mignon', description: '8oz grass-fed beef, truffle butter, grilled asparagus.', price: 42.00, category: 'Entrees', imageUrl: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Ahi Tuna Tartare', description: 'Avocado, soy-ginger glaze, crispy wontons.', price: 19.00, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Burrata & Heirloom Tomato', description: 'Fresh burrata, balsamic glaze, basil oil.', price: 17.00, category: 'Salad', imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f3c0cac56?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Truffle Fries', description: 'Parmesan, parsley, truffle oil.', price: 12.00, category: 'Snacks', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'potato chips')?.imageUrl },
          { name: 'Frozen Watermelon Margarita', description: 'Perfect for poolside sipping.', price: 14.00, category: 'Spirits', imageUrl: PlaceHolderImages.find(i => i.imageHint === 'vodka bottle')?.imageUrl },
          { name: 'Premium Fruit Platter', description: 'Seasonal berries, melons, and honey yogurt.', price: 15.00, category: 'Snacks', imageUrl: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Wagyu Beef Sliders', description: 'Three sliders with caramelized onions and gruyere.', price: 22.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Artisanal Charcuterie', description: 'Imported cheeses, cured meats, honeycomb.', price: 26.00, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=1080' },
          { name: 'Pro Shop Gift Card ($50)', description: 'Can be used for gear or lessons.', price: 50.00, category: 'Other', imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=1080' },
        ];
      }

      batch.set(doc(firestore, 'sellers', sellerId), {
        id: sellerId, 
        courseName: config.name,
        type: config.type, 
        streetAddress: '123 Prototyping Way', city: 'Pebble Beach', state: 'CA', zip: '93953',
        latitude: 42.7748, longitude: -83.2139, contactName: 'Service Manager', contactEmail: 'manager@demo.com',
        contactPhone: '555-0100', serviceFee: 2.50, taxRate: 6.0, status: 'Active', 
        bevcartActive: false,
        clubhouseActive: false,
        menuTypes: config.menuTypes,
        brandColor: '#22c55e',
        laneCount: sellerId === 'demo-bowling-alley' ? 24 : 0,
        halfwayHouseCount: sellerId === 'demo-golf-course-private' ? 2 : 0,
        halfwayHouseNames: sellerId === 'demo-golf-course-private' ? ['Turn Shack', 'Back Nine House'] : [],
        categoryVisibility: config.menuTypes.reduce((acc, mt) => ({
          ...acc,
          [mt]: getCategoriesForMenu(mt)
        }), {}),
        categoryImageVisibility: config.menuTypes.reduce((acc, mt) => ({
          ...acc,
          [mt]: getCategoriesForMenu(mt)
        }), {}),
        orderThresholds: config.menuTypes.reduce((acc, mt) => ({
          ...acc,
          [mt]: { warning: 7, max: 10 }
        }), {})
      }, { merge: true });

      itemsToSeed.forEach((item, index) => {
        const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        batch.set(newItemRef, { 
          ...item, 
          id: newItemRef.id, 
          rank: index + 1,
          availableOn: config.menuTypes
        });
      });
      
      await batch.commit();
      toast({ title: "Environment Seeded", description: `Data loaded for ${config.name}.` });
    } finally { setIsSeeding(false); }
  };

  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const batch = writeBatch(firestore);
        const menuItemsCol = collection(firestore, 'sellers', sellerId, 'menuItems');
        jsonData.forEach((row: any, index: number) => {
          const name = row['Name'] || row['name'];
          const price = parseFloat(row['Price'] || row['price']);
          const category = row['Category'] || row['category'];
          if (!name || isNaN(price)) return;
          const newItemRef = doc(menuItemsCol);
          batch.set(newItemRef, {
            id: newItemRef.id,
            name,
            description: row['Description'] || '',
            price,
            category: category as Category,
            rank: index + 1,
            availableOn: ['Clubhouse']
          });
        });
        await batch.commit();
        toast({ title: 'Import Successful', description: 'Menu items added.' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Import Failed' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveMasterItem = (data: MenuItemFormData) => {
    if (!firestore) return;
    const itemRef = editingItem ? doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id) : doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
    setDoc(itemRef, { ...data, id: itemRef.id, rank: editingItem?.rank || (menuItems?.length || 0) + 1 }, { merge: true });
    setEditingItem(null); setIsMasterFormOpen(false);
  };

  const handleSaveMember = (data: MemberFormData) => {
    if (!firestore) return;
    const memberRef = editingMember ? doc(firestore, 'sellers', sellerId, 'members', editingMember.id) : doc(collection(firestore, 'sellers', sellerId, 'members'));
    setDoc(memberRef, { ...data, id: memberRef.id }, { merge: true });
    setEditingMember(null); setIsMemberFormOpen(false);
  };

  const handleToggleItemAvailability = (item: MenuItem, menuType: string) => {
    if (!firestore) return;
    const currentAvailable = item.availableOn || [];
    const isAvailable = currentAvailable.includes(menuType);
    const nextAvailable = isAvailable ? currentAvailable.filter(t => t !== menuType) : [...currentAvailable, menuType];
    updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), { availableOn: nextAvailable });
  };

  const handleToggleCategoryVisibility = (menuType: string, category: Category) => {
    if (!firestore || !seller) return;
    const visibility = seller.categoryVisibility || {};
    const currentCategories = visibility[menuType] || [];
    const isVisible = currentCategories.includes(category);
    const nextCategories = isVisible ? currentCategories.filter(c => c !== category) : [...currentCategories, category];
    
    updateDoc(doc(firestore, 'sellers', sellerId), {
      [`categoryVisibility.${menuType}`]: nextCategories
    });
  };

  const handleToggleCategoryImageVisibility = (menuType: string, category: Category) => {
    if (!firestore || !seller) return;
    const visibility = seller.categoryImageVisibility || {};
    const currentCategories = visibility[menuType] || [];
    const isVisible = currentCategories.includes(category);
    const nextCategories = isVisible ? currentCategories.filter(c => c !== category) : [...currentCategories, category];
    
    updateDoc(doc(firestore, 'sellers', sellerId), {
      [`categoryImageVisibility.${menuType}`]: nextCategories
    });
  };

  const handleDragEnd = async (event: DragEndEvent, menuType: string, category: Category) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !firestore || !menuItems) return;

    const itemsInCategory = menuItems
      .filter(i => i.category === category && i.availableOn?.includes(menuType))
      .sort((a, b) => (a.menuRanks?.[menuType] ?? a.rank) - (b.menuRanks?.[menuType] ?? b.rank));

    const oldIndex = itemsInCategory.findIndex(i => i.id === active.id);
    const newIndex = itemsInCategory.findIndex(i => i.id === over.id);

    const newOrder = arrayMove(itemsInCategory, oldIndex, newIndex);
    
    const batch = writeBatch(firestore);
    newOrder.forEach((item, index) => {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
      batch.update(itemRef, {
        [`menuRanks.${menuType}`]: index + 1
      });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Reorder failed:", error);
      toast({ variant: 'destructive', title: 'Reorder Failed' });
    }
  };

  const isMapRequired = selectedOpsMenu === 'Beverage Cart' || selectedOpsMenu === 'Clubhouse';

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-center md:text-left">
          <div className="flex-1">
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight">SELLER ADMIN</h1>
            <p className="text-muted-foreground">{isSellerLoading ? 'Loading...' : seller?.courseName}</p>
          </div>
          <div className="flex items-center gap-3 self-center md:self-auto">
             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-background">
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Import Excel Menu
             </Button>
             <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
             <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding} className="bg-background">
                <Sparkles className="mr-2 h-4 w-4" /> Reset Demo
             </Button>
          </div>
        </header>

        <nav className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-y mb-8 -mx-4 px-4 py-3 flex items-center justify-center sm:justify-start gap-2 overflow-x-auto whitespace-nowrap shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-2 hidden sm:inline-block">Jump to:</span>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('ops-monitor')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 hover:text-primary">
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Live Queue
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('sales-stats')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 hover:text-primary">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Sales Stats
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('service-management')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 hover:text-primary">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Service Menus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollToSection('menu-library')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 hover:text-primary">
            <Database className="mr-1.5 h-3.5 w-3.5" />
            Menu Library
          </Button>
          {isClubSeller && (
            <Button variant="ghost" size="sm" onClick={() => scrollToSection('member-management')} className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 rounded-full hover:bg-primary/10 hover:text-primary">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Members
            </Button>
          )}
        </nav>

        <section id="ops-monitor" className="mb-12 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-wider">
                <Activity className="h-6 w-6" /> 
                Live Operations Monitor
              </h2>
              <p className="text-muted-foreground text-xs font-medium">Real-time status of current active orders.</p>
            </div>
            
            <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-lg border">
              {seller?.menuTypes?.map(type => {
                const Icon = serviceTypeIcons[type] || ShoppingBag;
                const count = activeOrders.filter(o => o.menuType === type).length;
                return (
                  <Button 
                    key={type} 
                    variant={selectedOpsMenu === type ? 'default' : 'ghost'} 
                    size="sm" 
                    onChange={() => setSelectedOpsMenu(type)}
                    onClick={() => setSelectedOpsMenu(type)}
                    className="h-8 text-[10px] font-bold uppercase tracking-widest px-3 relative"
                  >
                    <Icon className="mr-1.5 h-3 w-3" />
                    {type}
                    {count > 0 && (
                      <span className="ml-1.5 bg-background text-foreground px-1.5 rounded-full text-[8px] font-black border">
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-primary/5 rounded-xl border-2 border-primary/10 p-4 flex flex-col justify-center gap-1 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 leading-none mb-1">Establishment Totals</p>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-tight">Today's Revenue</span>
                  <span className="text-lg font-headline font-black text-primary">${opsMetrics?.total?.revenue.toFixed(2) || '0.00'}</span>
                </div>
                <div className="h-10 w-[1px] bg-primary/10 mx-2" />
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-tight">Today's Orders</span>
                  <span className="text-lg font-headline font-black text-foreground">{opsMetrics?.total?.count || 0}</span>
                </div>
                <div className="h-10 w-[1px] bg-primary/10 mx-2" />
                <div className="flex flex-col text-right">
                  <span className="text-xs font-black uppercase tracking-tight">Total Alerts</span>
                  <span className="text-lg font-headline font-black text-destructive">{opsMetrics?.total?.exceededCount || 0}</span>
                </div>
              </div>
            </div>

            <OpsMetricCard 
              label={`${selectedOpsMenu} Revenue`} 
              value={`$${opsMetrics?.selected?.revenue.toFixed(2) || '0.00'}`} 
              icon={DollarSign} 
              colorClass="text-green-600 bg-green-500/10"
            />
            <OpsMetricCard 
              label={`${selectedOpsMenu} Volume`} 
              value={opsMetrics?.selected?.count || 0} 
              icon={ListOrdered} 
              colorClass="text-indigo-600 bg-indigo-500/10"
              subValue="Today"
            />
            <OpsMetricCard 
              label={`${selectedOpsMenu} Avg Time`} 
              value={`${opsMetrics?.selected?.avgTime.toFixed(1) || '0'}m`} 
              icon={Timer} 
              colorClass="text-blue-600 bg-blue-500/10"
              subValue="Delivered"
            />
            <OpsMetricCard 
              label={`${selectedOpsMenu} Alerts`} 
              value={opsMetrics?.selected?.exceededCount || 0} 
              icon={AlertTriangle} 
              colorClass="text-destructive bg-destructive/10"
              subValue="Today"
            />
          </div>

          <div className={cn("grid grid-cols-1 gap-6", isMapRequired ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
            {isMapRequired && (
              <Card className="lg:col-span-2 h-[450px] overflow-hidden shadow-md border-2">
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                  {seller ? (
                    <MapView 
                      sellerLocation={{ latitude: seller.latitude, longitude: seller.longitude }}
                      sellers={liveDrivers}
                      buyers={mappedBuyers}
                      zoomMode="all"
                      interactive={true}
                    />
                  ) : <Skeleton className="w-full h-full" />}
                </APIProvider>
              </Card>
            )}

            <Card className={cn("shadow-md flex flex-col border-2 overflow-hidden", isMapRequired ? "max-h-[450px]" : "w-full")}>
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-black uppercase flex items-center justify-between">
                  <span>{selectedOpsMenu} Queue</span>
                  <Badge variant="secondary" className="font-black">{filteredOpsOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden flex-1">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {areOrdersLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : filteredOpsOrders.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2">
                        <ShoppingBag className="h-10 w-10 opacity-10" />
                        <p className="text-sm font-medium italic">No active {selectedOpsMenu} orders.</p>
                      </div>
                    ) : (
                      <div className={cn("grid gap-3", !isMapRequired && "sm:grid-cols-2 xl:grid-cols-3")}>
                        {filteredOpsOrders.map((order, idx) => {
                          const orderTime = order.createdAt?.toDate().getTime() || now;
                          const minutesElapsed = (now - orderTime) / 60000;
                          const thresholds = seller?.orderThresholds?.[order.menuType] || { warning: 7, max: 10 };
                          const isOld = minutesElapsed >= thresholds.max;
                          const isWarning = minutesElapsed >= thresholds.warning;

                          return (
                            <div key={order.id} className={cn(
                              "p-4 rounded-xl border-2 bg-background flex flex-col gap-2 transition-all shadow-sm",
                              isOld ? "border-destructive/30 bg-destructive/5" : (isWarning ? "border-yellow-500/30 bg-yellow-500/5" : "border-muted hover:border-primary/50")
                            )}>
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shadow-md shrink-0 border-2 border-white",
                                    isOld ? "bg-red-600" : (isWarning ? "bg-yellow-500" : "bg-green-600")
                                  )}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black uppercase tracking-tight truncate max-w-[120px]">{order.customerName}</span>
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                      {Math.floor(minutesElapsed)}m ago
                                    </span>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[8px] h-5 px-1.5 uppercase font-black tracking-widest border-primary/20 bg-background shadow-sm">
                                  {order.status}
                                </Badge>
                              </div>
                              
                              <div className="text-[10px] font-medium text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed truncate">
                                {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                              </div>

                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs font-mono font-black text-primary">${order.total.toFixed(2)}</p>
                                {order.menuTypeLocation && (
                                  <span className="text-[9px] font-black text-primary/60 uppercase">{order.menuTypeLocation}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="sales-stats" className="mb-12 scroll-mt-32">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider"><BarChart3 className="h-6 w-6" /> Sales Stats</h2>
          <div className="flex flex-wrap gap-4">
              {dashboardStats ? (
                  <>
                      <StatTile title="Monthly" {...dashboardStats.monthly} />
                      <StatTile title="Yearly" {...dashboardStats.yearly} />
                  </>
              ) : <Skeleton className="h-40 w-full" />}
          </div>
        </section>

        <h2 id="service-management" className="font-headline text-xl font-bold mb-6 mt-16 flex items-center gap-2 text-primary uppercase tracking-wider scroll-mt-32"><ListChecks className="h-6 w-6" /> Service Menus</h2>
        <div className="grid grid-cols-1 gap-12">
          {sortedMenuTypesForAdmin.map(menuType => {
              const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
              const enabledCats = seller?.categoryVisibility?.[menuType] || [];
              const allowedCategories = getCategoriesForMenu(menuType);
              const thresholds = seller?.orderThresholds?.[menuType] || { warning: 7, max: 10 };

              return (
                  <Card key={menuType} className="shadow-lg">
                      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b bg-muted/20 gap-4">
                          <div>
                              <CardTitle className="text-xl uppercase tracking-tight">{menuType} Menu</CardTitle>
                              <CardDescription>Manage visibility, selection, and alert thresholds.</CardDescription>
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-widest bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                                  <Timer className="mr-1 h-3 w-3" /> Warning: {thresholds.warning}m
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-widest bg-red-500/10 text-red-700 border-red-500/20">
                                  <Timer className="mr-1 h-3 w-3" /> Max: {thresholds.max}m
                                </Badge>
                              </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {menuType === 'Pool' && (
                              <Button variant="outline" size="sm" onClick={handleOpenPoolMapConfig} className="bg-background border-primary/20 text-primary hover:bg-primary/5">
                                  <MapIcon className="mr-2 h-4 w-4" /> Setup Pool Map
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleOpenThresholdConfig(menuType)} className="bg-background">
                                <Timer className="mr-2 h-4 w-4" /> Configure Alerts
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setConfigMenuType(menuType); setIsCategoryConfigOpen(true); }} className="bg-background">
                                <Settings2 className="mr-2 h-4 w-4" /> Categories
                            </Button>
                            <Button variant="default" size="sm" onClick={() => { setPickingMenuType(menuType); setIsPickingOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Items
                            </Button>
                          </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                          {itemsInThisMenu.length === 0 ? (
                              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                  <p className="text-muted-foreground italic">No items added to this menu.</p>
                              </div>
                          ) : (
                              <div className="space-y-8">
                                  {allowedCategories.map(category => {
                                      const itemsInCategory = itemsInThisMenu
                                        .filter(i => i.category === category)
                                        .sort((a, b) => {
                                          const rankA = a.menuRanks?.[menuType] ?? a.rank ?? 0;
                                          const rankB = b.menuRanks?.[menuType] ?? b.rank ?? 0;
                                          return rankA - rankB;
                                        });

                                      const isCatHidden = !enabledCats.includes(category);
                                      if (itemsInCategory.length === 0) return null;

                                      return (
                                          <div key={category} className={cn("space-y-3", isCatHidden && "opacity-50 grayscale")}>
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm uppercase tracking-widest">{category}</h4>
                                                {isCatHidden && <Badge variant="secondary" className="uppercase text-[9px]">Hidden from Patron</Badge>}
                                              </div>
                                              
                                              <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={(event) => handleDragEnd(event, menuType, category)}
                                              >
                                                <SortableContext
                                                  items={itemsInCategory.map(i => i.id)}
                                                  strategy={verticalListSortingStrategy}
                                                >
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                      {itemsInCategory.map(item => (
                                                          <SortableItem 
                                                            key={item.id} 
                                                            item={item} 
                                                            menuType={menuType}
                                                            onDelete={() => handleToggleItemAvailability(item, menuType)} 
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

        <Card id="menu-library" className="mb-12 mt-16 shadow-md border-primary/20 bg-primary/5 scroll-mt-32">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 uppercase tracking-tight text-primary"><Database className="h-5 w-5" /> Menu Library</CardTitle>
              <CardDescription>Your global catalog of all items available to the establishment.</CardDescription>
            </div>
            <Button onClick={() => { setEditingItem(null); setIsMasterFormOpen(true); }} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Item</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-8 bg-background/50 p-2 rounded-lg border">
              <Button variant={masterCategoryFilter === 'All' ? 'default' : 'ghost'} size="sm" onClick={() => setMasterCategoryFilter('All')}>All</Button>
              {categories.map(cat => (
                <Button key={cat} variant={masterCategoryFilter === cat ? 'default' : 'ghost'} size="sm" onClick={() => setMasterCategoryFilter(cat)}>{cat}</Button>
              ))}
            </div>

            {areItemsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMasterItems.map(item => (
                  <div key={item.id} className="p-4 rounded-xl bg-background border shadow-sm group hover:border-primary/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">{item.category}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setIsMasterFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
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
            )}
          </CardContent>
        </Card>

        {isClubSeller && (
          <section id="member-management" className="mt-16 scroll-mt-32">
            <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider">
              <Users className="h-6 w-6" /> Member Directory
            </h2>
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b">
                <div>
                  <CardTitle className="text-lg uppercase tracking-tight">Active Members</CardTitle>
                  <CardDescription>Directory of members authorized for account charges.</CardDescription>
                </div>
                <Button onClick={() => { setEditingMember(null); setIsMemberFormOpen(true); }} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> New Member
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {areMembersLoading ? (
                  <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
                ) : members && members.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Member #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map(member => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="font-mono text-xs">{member.memberNumber}</TableCell>
                          <TableCell>
                            <Badge variant={member.status === 'Active' ? 'default' : 'secondary'} className="uppercase text-[9px] px-2">
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMember(member); setIsMemberFormOpen(true); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(firestore, 'sellers', sellerId, 'members', member.id))}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed m-6 rounded-xl">
                    <Users className="h-12 w-12 opacity-10 mx-auto mb-2" />
                    <p>No members registered.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
            <MasterItemForm onSave={handleSaveMasterItem} menuItem={editingItem} onClose={() => setIsMasterFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingMember ? 'Edit Member' : 'New Member'}</DialogTitle></DialogHeader>
            <MemberForm onSave={handleSaveMember} member={editingMember} onClose={() => setIsMasterFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isPickingOpen} onOpenChange={setIsPickingOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="uppercase tracking-tight">Add to {pickingMenuType}</DialogTitle>
                <CardDescription>Select items from your library to include in this menu.</CardDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                    {getCategoriesForMenu(pickingMenuType).map(category => {
                        const itemsInCategory = menuItems?.filter(i => i.category === category) || [];
                        if (itemsInCategory.length === 0) return null;
                        return (
                            <div key={category} className="mb-6">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{category}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {itemsInCategory.map(item => {
                                        const isSelected = item.availableOn?.includes(pickingMenuType);
                                        return (
                                            <div key={item.id} onClick={() => handleToggleItemAvailability(item, pickingMenuType)} className={cn(
                                                "p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center",
                                                isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                  {item.imageUrl && (
                                                    <div className="relative h-8 w-8 rounded overflow-hidden border bg-muted">
                                                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                                                    </div>
                                                  )}
                                                  <span className="text-sm font-bold">{item.name}</span>
                                                </div>
                                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                <Button onClick={() => setIsPickingOpen(false)} className="w-full sm:w-auto font-bold uppercase text-xs tracking-widest">Done</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryConfigOpen} onOpenChange={setIsCategoryConfigOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="uppercase tracking-tight">Menu Configuration: {configMenuType}</DialogTitle>
              <CardDescription>Manage category visibility and item images for patrons using this service.</CardDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <div className="col-span-6">Category Name</div>
                  <div className="col-span-3 text-center">Visible</div>
                  <div className="col-span-3 text-center">Pictures</div>
                </div>
                {getCategoriesForMenu(configMenuType).map(category => {
                  const isVisible = seller?.categoryVisibility?.[configMenuType]?.includes(category);
                  const showImages = seller?.categoryImageVisibility?.[configMenuType]?.includes(category);
                  
                  return (
                    <div 
                      key={category} 
                      className={cn(
                        "grid grid-cols-12 items-center gap-2 p-4 border-2 rounded-xl transition-all",
                        isVisible ? "border-primary bg-primary/5" : "border-muted opacity-60"
                      )} 
                    >
                      <div className="col-span-6 flex flex-col">
                        <span className="text-sm font-black uppercase tracking-tight">{category}</span>
                        {!isVisible && <span className="text-[10px] text-muted-foreground uppercase font-bold">Hidden from Patron</span>}
                      </div>
                      
                      <div className="col-span-3 flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("h-10 w-10 rounded-full", isVisible ? "text-primary" : "text-muted-foreground")}
                          onClick={() => handleToggleCategoryVisibility(configMenuType, category)}
                        >
                          {isVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                        </Button>
                      </div>

                      <div className="col-span-3 flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={!isVisible}
                          className={cn("h-10 w-10 rounded-full", showImages ? "text-primary" : "text-muted-foreground")}
                          onClick={() => handleToggleCategoryImageVisibility(configMenuType, category)}
                        >
                          <ImageIcon className={cn("h-5 w-5", !showImages && "opacity-30")} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-muted/20">
              <Button onClick={() => setIsCategoryConfigOpen(false)} className="w-full sm:w-auto font-bold uppercase text-xs tracking-widest">Save Settings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isThresholdConfigOpen} onOpenChange={setIsThresholdConfigOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-tight flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" /> Alert Thresholds: {thresholdMenuType}
              </DialogTitle>
              <DialogDescription>
                Set the order duration targets for this service. Visual alerts will change based on these values.
              </DialogDescription>
            </DialogHeader>
            <Form {...thresholdForm}>
              <form onSubmit={thresholdForm.handleSubmit(handleSaveThresholds)} className="space-y-6 pt-4">
                <div className="space-y-4">
                  <FormField
                    control={thresholdForm.control}
                    name="warning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" /> Warning Order Duration (Min)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={thresholdForm.control}
                    name="max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-600" /> Max Order Duration (Min)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="border-t pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsThresholdConfigOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Thresholds</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPoolMapConfigOpen} onOpenChange={setIsPoolMapConfigOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="uppercase tracking-tight flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" /> Pool Map Configuration
              </DialogTitle>
              <DialogDescription>
                Locate your pool area on the satellite map. Pan and zoom until it is perfectly centered, then click "Set Map View".
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[400px] w-full relative bg-muted">
              {seller && (
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
                  <div className="w-full h-full relative">
                    <Map
                      defaultCenter={{ lat: seller.latitude, lng: seller.longitude }}
                      defaultZoom={19}
                      mapTypeId="satellite"
                      disableDefaultUI={false}
                      gestureHandling="greedy"
                    >
                      <MapViewSetter onSet={handleSetPoolMapView} />
                    </Map>
                    
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border-2 border-white/20">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/40 uppercase tracking-widest">Zone {i+1}</div>
                      ))}
                    </div>
                  </div>
                </APIProvider>
              )}
              {!seller && (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t bg-muted/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patron View Preview</h4>
                {tempPoolMapUrl && <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[8px] uppercase">New View Ready</Badge>}
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border-2 bg-black shadow-inner flex items-center justify-center group">
                {tempPoolMapUrl ? (
                  <>
                    <Image src={tempPoolMapUrl} alt="Captured Preview" fill className="object-cover opacity-80" unoptimized />
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/30">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="border border-white/20 flex items-center justify-center text-[10px] font-black text-white/60 drop-shadow-md">{i+1}</div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <MapIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">No map view set yet.</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t bg-muted/20">
              <Button type="button" variant="ghost" onClick={() => setIsPoolMapConfigOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePoolMap} disabled={!tempPoolMapUrl} className="min-w-[140px] font-black uppercase tracking-widest text-xs h-10">
                Save Pool Map
              </Button>
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
