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
  ImageIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { APIProvider } from '@vis.gl/react-google-maps';
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

const getCategoriesForMenu = (menuType: string): Category[] => {
  if (menuType === 'Beverage Cart') {
    return ['Beer', 'Spirits', 'Soft Drinks', 'Snacks', 'Other'];
  }
  return [...categories] as Category[];
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
            <span className="text-sm font-medium">Orders &gt; 10m</span>
          </div>
          <span className="font-mono font-bold text-destructive">{longWait}</span>
        </div>
      </CardContent>
    </Card>
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

  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');
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

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

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

  const dashboardStats = useMemo(() => {
    if (!orders) return null;
    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + o.total, 0);
      const longWait = filtered.filter(o => {
        if (!o.deliveredAt || !o.createdAt) return false;
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        return duration > 10;
      }).length;
      return { revenue, orders: filtered.length, longWait };
    };
    return {
      daily: calculate(orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()))),
      monthly: calculate(orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()))),
      yearly: calculate(orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()))),
    };
  }, [orders]);

  const mappedBuyers = useMemo(() => {
    return activeOrders.map(o => {
      let colorClass = "bg-green-600";
      if (o.createdAt) {
        const orderTime = o.createdAt.toDate().getTime();
        const minutesElapsed = (now - orderTime) / (1000 * 60);
        const waitThreshold = o.menuType === 'Beverage Cart' ? 10 : 20;
        if (minutesElapsed > waitThreshold) {
          colorClass = "bg-red-600";
        } else if (minutesElapsed >= (waitThreshold * 0.75)) {
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
  }, [activeOrders, now]);

  const liveDrivers = useMemo(() => {
    const drivers = [];
    if (seller?.bevcartActive) {
      drivers.push({
        id: seller.id,
        name: `${seller.courseName} BevCart`,
        location: { latitude: seller.latitude, longitude: seller.longitude }
      });
    }
    return drivers;
  }, [seller]);

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
          { name: 'Loaded Nachos', description: 'Corn chips topped with cheese, jalapeños, and sour cream.', price: 10.50, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxuYWNob3N8ZW58MHx8fHwxNzYzOTQxOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Buffalo Wings (10pc)', description: 'Crispy wings tossed in buffalo sauce.', price: 14.50, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxidWZmYWxvJTIwd2luZ3N8ZW58MHx8fHwxNzYzOTQxOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Mozzarella Sticks', description: 'Served with zesty marinara sauce.', price: 8.00, category: 'Appetizers', imageUrl: 'https://images.unsplash.com/photo-1531451394031-448f2a1c83e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtb3p6YXJlbGxhJTIwc3RpY2tzfGVufDB8fHx8MTc2Mzk0MTkwMHww&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Strike Burger', description: 'Cheeseburger with secret sauce and fries.', price: 13.50, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxidXJnZXJ8ZW58MHx8fHwxNzYzOTQxOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Classic Hot Dog', description: 'Grilled all-beef frank on a toasted bun.', price: 7.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1541214113241-21578d2d9b62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxob3QlMjBkb2d8ZW58MHx8fHwxNzYzOTQxOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Chicken Tenders & Fries', description: 'Breaded chicken breast strips with honey mustard.', price: 12.00, category: 'Handhelds', imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdGVuZGVyc3xlbnwwfHx8fDE3NjM5NDE5MDB8MA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Large Pepperoni Pizza', description: '16-inch classic with extra pepperoni.', price: 21.00, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwZXBwZXJvbmklMjBwaXp6YXxlbnwwfHx8fDE3NjM5NDE5MDB8MA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Large Cheese Pizza', description: 'Thin crust with a four-cheese blend.', price: 18.00, category: 'Pizza', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwaXp6YXxlbnwwfHx8fDE3NjM5NDE5MDB8MA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Ice Cream Sundae', description: 'Vanilla ice cream with chocolate syrup and a cherry.', price: 6.50, category: 'Dessert', imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxpY2UlMjBjcmVhbSUyMHN1bmRhZXxlbnwwfHx8fDE3NjM5NDE5MDB8MA&ixlib=rb-4.1.0&q=80&w=1080' },
          { name: 'Glow Bowl Wristband', description: 'Access to special lighting events.', price: 5.00, category: 'Other', imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHx3cmlzdGJhbmR8ZW58MHx8fHwxNzYzOTQxOTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
        ];
      } else if (sellerId === 'demo-golf-course-private') {
        config = { name: 'Demo Private Country Club', type: 'Private Golf Course', menuTypes: ['Beverage Cart', 'Clubhouse', 'Pool', 'Halfway House'] };
      }

      batch.set(doc(firestore, 'sellers', sellerId), {
        id: sellerId, 
        courseName: config.name,
        type: config.type, 
        streetAddress: '123 Prototyping Way', city: 'Pebble Beach', state: 'CA', zip: '93953',
        latitude: 42.7748, longitude: -83.2139, contactName: 'Service Manager', contactEmail: 'manager@demo.com',
        contactPhone: '555-0100', serviceFee: 2.50, status: 'Active', 
        bevcartActive: false,
        clubhouseActive: false,
        menuTypes: config.menuTypes,
        brandColor: '#22c55e',
        laneCount: sellerId === 'demo-bowling-alley' ? 24 : 0,
        categoryVisibility: config.menuTypes.reduce((acc, mt) => ({
          ...acc,
          [mt]: getCategoriesForMenu(mt)
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

        <section id="performance-overview" className="mb-12 scroll-mt-24">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider"><BarChart3 className="h-6 w-6" /> Performance Overview</h2>
          <div className="flex flex-wrap gap-4">
              {dashboardStats ? (
                  <>
                      <StatTile title="Daily" {...dashboardStats.daily} />
                      <StatTile title="Monthly" {...dashboardStats.monthly} />
                      <StatTile title="Yearly" {...dashboardStats.yearly} />
                  </>
              ) : <Skeleton className="h-40 w-full" />}
          </div>
        </section>

        {/* Live Operations Monitor / Order Queue */}
        {(isGolfCourse || isBowlingAlley) && (
          <section id="ops-monitor" className="mb-12 scroll-mt-24">
            <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2 text-primary uppercase tracking-wider">
              <Activity className="h-6 w-6" /> 
              {isBowlingAlley ? 'Live Order Queue' : 'Live Operations Monitor'}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {isGolfCourse ? (
                <>
                  <Card className="lg:col-span-2 h-[400px] overflow-hidden shadow-md">
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

                  <Card className="shadow-md flex flex-col max-h-[400px]">
                    <CardHeader className="py-4 border-b bg-muted/20">
                      <CardTitle className="text-sm font-bold uppercase flex items-center justify-between">
                        Active Orders
                        <Badge variant="secondary" className="font-mono">{activeOrders.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-hidden flex-1">
                      <ScrollArea className="h-full">
                        <div className="p-4 space-y-3">
                          {areOrdersLoading ? (
                            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                          ) : activeOrders.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                              <ShoppingBag className="h-8 w-8 opacity-10" />
                              <p className="text-xs font-medium italic">No active orders right now.</p>
                            </div>
                          ) : (
                            activeOrders.map(order => (
                              <div key={order.id} className="p-3 rounded-lg border bg-background hover:border-primary/50 transition-colors shadow-sm">
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="text-xs font-bold truncate pr-2">{order.customerName}</span>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase font-bold tracking-tight">
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                  <Clock className="w-3 h-3" />
                                  {order.createdAt ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                  <span className="mx-1">•</span>
                                  <Navigation className="w-3 h-3" />
                                  {order.menuType}
                                </div>
                                <div className="mt-2 flex justify-between items-end">
                                  <p className="text-[10px] font-mono font-bold text-primary">${order.total.toFixed(2)}</p>
                                  <Button variant="ghost" size="sm" asChild className="h-6 text-[9px] uppercase font-bold tracking-widest px-2">
                                    <a href={`/order/track?id=${order.id}`}>View Map <ChevronRight className="ml-0.5 h-2.5 w-2.5" /></a>
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="lg:col-span-3 shadow-md flex flex-col">
                  <CardHeader className="py-4 border-b bg-muted/20">
                    <CardTitle className="text-sm font-bold uppercase flex items-center justify-between">
                      Current Order Queue
                      <Badge variant="secondary" className="font-mono">{activeOrders.length}</Badge>
                    </CardTitle>
                    <CardDescription>Real-time view of all pending lane and take-out orders.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/5">
                            <TableHead className="w-[100px]">Age</TableHead>
                            <TableHead>Patron</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Service Mode</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {areOrdersLoading ? (
                            [...Array(3)].map((_, i) => (
                              <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                            ))
                          ) : activeOrders.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                No active orders in the queue.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeOrders.map(order => {
                              const orderTime = order.createdAt?.toDate().getTime() || now;
                              const minutesElapsed = (now - orderTime) / 60000;
                              const isOld = minutesElapsed > 15;

                              return (
                                <TableRow key={order.id} className={cn(isOld && "bg-destructive/5")}>
                                  <TableCell>
                                    <Badge variant={isOld ? "destructive" : "secondary"} className="font-mono text-[10px]">
                                      {Math.floor(minutesElapsed)}m
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-bold text-xs uppercase tracking-tight">{order.customerName}</TableCell>
                                  <TableCell>
                                    <Badge className="bg-primary font-black text-[10px]">{order.menuTypeLocation || '--'}</Badge>
                                  </TableCell>
                                  <TableCell className="text-[10px] font-bold uppercase text-muted-foreground">{order.menuType}</TableCell>
                                  <TableCell className="text-[10px] max-w-[200px] truncate">
                                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[9px] uppercase font-black">{order.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild className="h-8 text-[9px] font-bold uppercase tracking-widest px-3 border border-primary/10">
                                      <a href={`/order/track?id=${order.id}`}>View Tracking</a>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        <Card id="menu-library" className="mb-12 shadow-md border-primary/20 bg-primary/5 scroll-mt-24">
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

        <h2 id="service-management" className="font-headline text-xl font-bold mb-6 mt-16 flex items-center gap-2 text-primary uppercase tracking-wider scroll-mt-24"><ListChecks className="h-6 w-6" /> Service Menus</h2>
        <div className="grid grid-cols-1 gap-12">
          {sortedMenuTypesForAdmin.map(menuType => {
              const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
              const enabledCats = seller?.categoryVisibility?.[menuType] || [];
              const allowedCategories = getCategoriesForMenu(menuType);

              return (
                  <Card key={menuType} className="shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                          <div>
                              <CardTitle className="text-xl uppercase tracking-tight">{menuType} Menu</CardTitle>
                              <CardDescription>Manage visibility and selection for {menuType}.</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setConfigMenuType(menuType); setIsCategoryConfigOpen(true); }} className="bg-background">
                                <Settings2 className="mr-2 h-4 w-4" /> Manage Categories
                            </Button>
                            <Button variant="default" onClick={() => { setPickingMenuType(menuType); setIsPickingOpen(true); }}>
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
                                        .sort((a, b) => (a.menuRanks?.[menuType] ?? a.rank) - (b.menuRanks?.[menuType] ?? b.rank));

                                      const isCatHidden = !enabledCats.includes(category);
                                      if (itemsInCategory.length === 0) return null;

                                      return (
                                          <div key={category} className={cn("space-y-3", isCatHidden && "opacity-50 grayscale")}>
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm uppercase tracking-widest">{category}</h4>
                                                {isCatHidden && <Badge variant="secondary" className="uppercase text-[9px]">Hidden from Golfer</Badge>}
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

        {isClubSeller && (
          <section id="member-management" className="mt-16 scroll-mt-24">
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
            <MemberForm onSave={handleSaveMember} member={editingMember} onClose={() => setIsMemberFormOpen(false)} />
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
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="uppercase tracking-tight">Enabled Categories: {configMenuType}</DialogTitle>
              <CardDescription>Choose which categories should appear to golfers using this service.</CardDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3">
                {getCategoriesForMenu(configMenuType).map(category => {
                  const isVisible = seller?.categoryVisibility?.[configMenuType]?.includes(category);
                  return (
                    <div 
                      key={category} 
                      className={cn(
                        "flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all",
                        isVisible ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/20"
                      )} 
                      onClick={() => handleToggleCategoryVisibility(configMenuType, category)}
                    >
                      <Checkbox checked={isVisible} />
                      <span className="text-sm font-black uppercase tracking-tight">{category}</span>
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
      </div>

      {showTopButton && (
        <Button variant="default" size="icon" className="fixed bottom-10 right-10 rounded-full shadow-2xl z-50 h-12 w-12" onClick={scrollToTop}>
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
