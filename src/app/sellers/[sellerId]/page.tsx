'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Filter, DollarSign, ShoppingBag, Clock, Database, Users, UserPlus, Sparkles, Download, Calendar as CalendarIcon, FileSpreadsheet, Palette, Save, Loader2, Upload, Smartphone, Beer, ListChecks, ChevronUp, ChevronDown, Check, MousePointer2, BarChart3, ArrowUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear, format } from 'date-fns';
import Link from 'next/link';

import type { MenuItem, Seller, Category, Order, Member } from '@/lib/types';
import { categories } from '@/lib/types';
import { menuItems as mockMenuItems } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';
import { BrandingFooter } from '@/components/branding-footer';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
  availableOn: z.array(z.string()).optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  memberNumber: z.string().min(1, 'Member ID number is required'),
  status: z.enum(['Active', 'Inactive']),
});

type MemberFormData = z.infer<typeof memberSchema>;

const customizationSchema = z.object({
  brandColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid HEX color').optional().or(z.literal('')),
  headerColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid HEX color').optional().or(z.literal('')),
  bottomBarColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid HEX color').optional().or(z.literal('')),
  bodyBackgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid HEX color').optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
});

type CustomizationFormData = z.infer<typeof customizationSchema>;

const sampleMembers = [
  { name: 'Jane Doe', memberNumber: '1001', status: 'Active' },
  { name: 'John Smith', memberNumber: '1002', status: 'Active' },
  { name: 'Alice Johnson', memberNumber: '1003', status: 'Active' },
  { name: 'Robert Brown', memberNumber: '1004', status: 'Active' }
];

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
      category: 'Beer',
      availableOn: [],
    },
  });

  useEffect(() => {
    form.reset(menuItem || { 
      name: '', 
      description: '', 
      price: 0, 
      category: 'Beer', 
      availableOn: [] 
    });
  }, [menuItem, form]);

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
  onSave: (data: MemberFormData) => void;
  onClose: () => void;
  member?: Member | null;
  disabled?: boolean;
}) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member || { name: '', memberNumber: '', status: 'Active' },
  });

  useEffect(() => {
    form.reset(member || { name: '', memberNumber: '', status: 'Active' });
  }, [member, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 py-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Member Name</FormLabel><FormControl><Input {...field} placeholder="Jane Doe" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="memberNumber" render={({ field }) => (
            <FormItem><FormLabel>Member ID Number</FormLabel><FormControl><Input {...field} placeholder="12345" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{member ? 'Update' : 'Add Member'}</Button>
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
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Total Revenue</span></div>
          <span className="font-mono font-bold">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Total Orders</span></div>
          <span className="font-mono font-bold">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-destructive" /><span className="text-sm font-medium">Orders &gt; 10m</span></div>
          <span className="font-mono font-bold text-destructive">{longWait}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MobilePreview({ logoUrl, headerColor, bottomBarColor, bodyBackgroundColor, brandColor, sellerName, menuType }: { logoUrl?: string, headerColor?: string, bottomBarColor?: string, bodyBackgroundColor?: string, brandColor?: string, sellerName: string, menuType: string }) {
  const hColor = headerColor || '#213147';
  const bColor = bottomBarColor || brandColor || '#22c55e';
  const bgBody = bodyBackgroundColor || '#fdfcf0';
  
  return (
    <div className="relative mx-auto border-[12px] border-slate-900 rounded-[3rem] h-[600px] w-[300px] shadow-2xl overflow-hidden flex flex-col font-body transition-all duration-300" style={{ backgroundColor: bgBody }}>
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-40"></div>
      
      {/* App Header */}
      <div className="px-4 pt-10 pb-3 flex items-center gap-2 shrink-0 z-30 transition-colors duration-300" style={{ backgroundColor: hColor }}>
        {logoUrl ? (
          <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-white">
            <Image src={logoUrl} alt="logo" fill className="object-contain p-1" unoptimized />
          </div>
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white/60" />
          </div>
        )}
        <span className="text-[11px] font-bold truncate font-headline text-white uppercase tracking-tight">{sellerName}</span>
      </div>

      {/* App Content */}
      <div className="flex-1 overflow-hidden p-4 space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['Beer', 'Spirits', 'Soft Drinks'].map((cat, i) => (
            <div 
              key={cat} 
              className={cn(
                "px-3 py-1 rounded-full text-[10px] whitespace-nowrap border shadow-sm transition-all duration-300", 
                i === 0 ? "text-white font-bold" : "bg-white text-muted-foreground"
              )} 
              style={i === 0 ? { backgroundColor: brandColor || '#22c55e', borderColor: brandColor || '#22c55e' } : {}}
            >
              {cat}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
             SELECTED CATEGORY
          </div>
          {[1, 2].map(i => (
            <div key={i} className="p-4 rounded-2xl border bg-white shadow-sm flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1">
                <p className="text-[11px] font-bold">Premium Item {i}</p>
                <p className="text-[10px] font-mono font-black" style={{ color: brandColor || '#22c55e' }}>$8.50</p>
              </div>
              <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors" style={{ borderColor: brandColor || '#22c55e', color: brandColor || '#22c55e' }}>+</div>
            </div>
          ))}
        </div>
      </div>

      {/* App Bottom Bar */}
      <div className="p-4 border-t shrink-0 z-30 transition-colors duration-300 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]" style={{ backgroundColor: 'white' }}>
        <div 
          className="w-full h-12 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg uppercase tracking-widest transition-all duration-300 transform active:scale-95" 
          style={{ backgroundColor: bColor }}
        >
          View Order ({menuType})
        </div>
      </div>

      {/* Home Indicator */}
      <div className="h-1.5 w-28 bg-slate-300/50 rounded-full mx-auto mb-2 mt-auto z-40"></div>
    </div>
  );
}

export default function SellerAdminPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isPickingOpen, setIsPickingOpen] = useState(false);
  const [pickingMenuType, setPickingMenuType] = useState<string>('');

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSavingCustomization, setIsSavingCustomization] = useState(false);
  const [previewMenuType, setPreviewMenuType] = useState<string>('');
  
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const membersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'members') : null), [firestore, sellerId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const customizationForm = useForm<CustomizationFormData>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      brandColor: '#22c55e',
      headerColor: '#213147',
      bottomBarColor: '#22c55e',
      bodyBackgroundColor: '#fdfcf0',
      logoUrl: '',
    },
  });

  const watchedValues = customizationForm.watch();

  useEffect(() => {
    if (seller) {
      customizationForm.reset({
        brandColor: seller.brandColor || '#22c55e',
        headerColor: seller.headerColor || '#213147',
        bottomBarColor: seller.bottomBarColor || seller.brandColor || '#22c55e',
        bodyBackgroundColor: seller.bodyBackgroundColor || '#fdfcf0',
        logoUrl: seller.logoUrl || '',
      });
      if (seller.menuTypes && seller.menuTypes.length > 0) {
        setPreviewMenuType(seller.menuTypes[0]);
      }
    }
  }, [seller, customizationForm]);

  const isClubSeller = seller?.type === 'Private Golf Course' || seller?.type === 'Semi Private Golf Course';

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

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, 5);
  }, [orders]);
  
  const filteredMasterItems = useMemo(() => {
    if (!menuItems) return [];
    if (masterCategoryFilter === 'All') return [...menuItems].sort((a,b) => a.name.localeCompare(b.name));
    return menuItems
      .filter(item => item.category === masterCategoryFilter)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [menuItems, masterCategoryFilter]);

  const handleExportCSV = () => {
    if (!orders) return;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const filtered = orders.filter(o => {
      const date = o.createdAt.toDate();
      return date >= start && date <= end;
    });
    if (filtered.length === 0) {
      toast({ title: "No data", description: "No sales found for the selected range.", variant: "destructive" });
      return;
    }
    const headers = ["Order ID", "Date", "Customer", "Items", "Total", "Status"];
    const rows = filtered.map(o => [o.id, o.createdAt.toDate().toLocaleString(), o.customerName, o.items.map(i => `${i.name} (${i.quantity})`).join("; "), o.total.toFixed(2), o.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_${sellerId}.csv`);
    link.click();
  };

  const handleSaveCustomization = async (data: CustomizationFormData) => {
    if (!firestore || !sellerId) return;
    setIsSavingCustomization(true);
    const ref = doc(firestore, 'sellers', sellerId);
    updateDoc(ref, data)
      .then(() => {
        toast({ title: 'Branding Saved', description: 'Your app appearance has been updated.' });
      })
      .finally(() => setIsSavingCustomization(false));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);
      const isDemo = sellerId === 'demo-course';
      batch.set(doc(firestore, 'sellers', sellerId), {
        id: sellerId, 
        courseName: isDemo ? 'Demo Golf Course - Public' : 'Sample Course',
        type: isDemo ? 'Public Golf Course' : 'Private Golf Course', 
        streetAddress: '123 Fairway Drive', city: 'Pebble Beach', state: 'CA', zip: '93953',
        latitude: 42.7748, longitude: -83.2139, contactName: 'Pro Shop Manager', contactEmail: 'manager@democourse.com',
        contactPhone: '555-0100', serviceFee: 2.50, status: 'Inactive', 
        bevcartActive: false,
        clubhouseActive: false,
        lastActive: null,
        menuTypes: ['Beverage Cart', 'Clubhouse'],
        brandColor: '#22c55e',
        headerColor: '#213147',
        bottomBarColor: '#22c55e',
        bodyBackgroundColor: '#fdfcf0'
      }, { merge: true });
      mockMenuItems.forEach((item, index) => {
        const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        const isBevCartFriendly = ['Beer', 'Spirits', 'Soft Drinks', 'Snacks'].includes(item.category);
        const availableOn = isBevCartFriendly ? ['Beverage Cart', 'Clubhouse'] : ['Clubhouse'];
        const menuRanks: Record<string, number> = { 'Clubhouse': index + 1 };
        if (isBevCartFriendly) { menuRanks['Beverage Cart'] = index + 1; }
        batch.set(newItemRef, { ...item, id: newItemRef.id, rank: index + 1, availableOn, menuRanks });
      });
      sampleMembers.forEach((member) => {
        const memberRef = doc(collection(firestore, 'sellers', sellerId, 'members'));
        batch.set(memberRef, { ...member, id: memberRef.id });
      });
      await batch.commit();
      toast({ title: "Demo Ready", description: "Sample data loaded and status set to Inactive." });
    } finally { setIsSeeding(false); }
  };

  const handleSaveMasterItem = (data: MenuItemFormData) => {
    if (!firestore) return;
    const itemRef = editingItem ? doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id) : doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
    const payload = { ...data, id: itemRef.id, rank: editingItem?.rank || (menuItems?.length || 0) + 1 };
    setDoc(itemRef, payload, { merge: true });
    setEditingItem(null); setIsMasterFormOpen(false);
  };

  const handleToggleItemAvailability = (item: MenuItem, menuType: string) => {
    if (!firestore) return;
    const currentAvailable = item.availableOn || [];
    const isAvailable = currentAvailable.includes(menuType);
    const nextAvailable = isAvailable ? currentAvailable.filter(t => t !== menuType) : [...currentAvailable, menuType];
    const updates: Partial<MenuItem> = { availableOn: nextAvailable };
    if (!isAvailable) {
        const menuRanks = item.menuRanks || {};
        if (!menuRanks[menuType]) {
            const currentMax = menuItems?.filter(i => i.availableOn?.includes(menuType)).length || 0;
            menuRanks[menuType] = currentMax + 1;
            updates.menuRanks = menuRanks;
        }
    }
    updateDoc(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), updates);
  };

  const handleRerank = (item: MenuItem, menuType: string, direction: 'up' | 'down') => {
    if (!firestore || !menuItems) return;
    const itemsInMenu = menuItems
        .filter(i => i.availableOn?.includes(menuType) && i.category === item.category)
        .sort((a, b) => (a.menuRanks?.[menuType] || 0) - (b.menuRanks?.[menuType] || 0));
    const currentIndex = itemsInMenu.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < itemsInMenu.length) {
        const targetItem = itemsInMenu[targetIndex];
        const currentRank = item.menuRanks?.[menuType] || currentIndex + 1;
        const targetRank = targetItem.menuRanks?.[menuType] || targetIndex + 1;
        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), { [`menuRanks.${menuType}`]: targetRank });
        batch.update(doc(firestore, 'sellers', sellerId, 'menuItems', targetItem.id), { [`menuRanks.${menuType}`]: currentRank });
        batch.commit();
    }
  };

  const handleSaveMember = (data: MemberFormData) => {
    if (!firestore) return;
    const memberRef = editingMember ? doc(firestore, 'sellers', sellerId, 'members', editingMember.id) : doc(collection(firestore, 'sellers', sellerId, 'members'));
    setDoc(memberRef, { ...data, id: memberRef.id }, { merge: true });
    setEditingMember(null); setIsMemberFormOpen(false);
  };

  if (!isMounted) return null;

  if (!isSellerLoading && !seller && sellerId === 'demo-course') {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h1 className="font-headline text-3xl font-bold mb-2">Initialize KOOP Demo Course</h1>
        <Button size="lg" onClick={handleSeedData} disabled={isSeeding}>{isSeeding ? 'Initializing...' : 'Set Up Demo Course'}</Button>
      </div>
    );
  }

  const quickLinks = [
    { label: 'Performance Overview', id: 'performance-overview', icon: <BarChart3 className="w-3 h-3" /> },
    { label: 'Sales Data', id: 'sales-data', icon: <FileSpreadsheet className="w-3 h-3" /> },
    { label: 'App Branding', id: 'app-branding', icon: <Palette className="w-3 h-3" /> },
    { label: 'Menu Library', id: 'menu-library', icon: <Database className="w-3 h-3" /> },
    { label: 'Service Menu Management', id: 'service-management', icon: <ListChecks className="w-3 h-3" /> },
    ...(isClubSeller ? [{ label: 'Member List', id: 'member-list', icon: <Users className="w-3 h-3" /> }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl flex-1">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
                <h1 className="font-headline text-3xl font-bold text-foreground">
                  SELLER ADMIN: {seller?.courseName || 'Loading...'}
                </h1>
                {seller && <Badge variant="outline">{seller.type}</Badge>}
            </div>
            <p className="text-muted-foreground text-sm mt-1">Configure your menus, monitor performance, and customize your brand.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                <Sparkles className="mr-2 h-4 w-4" />
                Reset Demo Data
             </Button>
          </div>
        </header>

        <nav className="mb-12 bg-muted/30 p-4 rounded-xl border border-dashed flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-2 flex items-center gap-1.5">
                <MousePointer2 className="w-3 h-3" /> Quick Navigation:
            </span>
            {quickLinks.map((link) => (
                <Button key={link.id} variant="secondary" size="sm" asChild className="h-8 text-xs rounded-full">
                    <Link href={`#${link.id}`}>
                        {link.icon}
                        <span className="ml-2">{link.label}</span>
                    </Link>
                </Button>
            ))}
        </nav>

        <section id="performance-overview" className="mb-8 scroll-mt-24">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Performance Overview</h2>
          <div className="flex flex-wrap gap-4">
              {dashboardStats ? (
                  <>
                      <StatTile title="Daily" {...dashboardStats.daily} />
                      <StatTile title="Monthly" {...dashboardStats.monthly} />
                      <StatTile title="Yearly" {...dashboardStats.yearly} />
                  </>
              ) : <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <Card id="sales-data" className="shadow-sm border-muted h-full flex flex-col scroll-mt-24">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg"><FileSpreadsheet className="h-5 w-5" /> Sales Data</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-6">
                <div className="flex flex-wrap gap-2 mb-6">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-36 text-xs" />
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-36 text-xs" />
                    <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
                </div>
                {areOrdersLoading ? <Skeleton className="h-32 w-full" /> : recentOrders && recentOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {recentOrders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs">{order.createdAt && format(order.createdAt.toDate(), 'MMM d, h:mm a')}</TableCell>
                            <TableCell className="text-sm font-medium">{order.customerName}</TableCell>
                            <TableCell className="font-mono text-sm">${order.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : <div className="text-center py-10 text-muted-foreground italic">No recent sales.</div>}
              </CardContent>
            </Card>

            <Card id="app-branding" className="shadow-lg border-primary/20 h-full flex flex-col scroll-mt-24 bg-gradient-to-br from-white to-primary/5">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="flex items-center gap-2 text-xl font-headline uppercase tracking-tight">
                  <Palette className="h-6 w-6 text-primary" /> App Branding Dashboard
                </CardTitle>
                <CardDescription>Customize your customer's mobile experience and branding.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-8">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                    <Form {...customizationForm}>
                      <form onSubmit={customizationForm.handleSubmit(handleSaveCustomization)} className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                             IDENTITY & ACCENTS
                          </h3>
                          
                          <FormField
                            control={customizationForm.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-xs font-bold text-foreground">
                                  <Upload className="h-3.5 w-3.5" /> Course Logo
                                </FormLabel>
                                <FormControl>
                                  <div className="flex items-center gap-4">
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, field.onChange)} className="h-10 text-xs" />
                                    {field.value && (
                                      <div className="relative w-10 h-10 rounded border overflow-hidden bg-white shrink-0">
                                        <Image src={field.value} alt="logo preview" fill className="object-contain p-1" unoptimized />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormDescription className="text-[10px]">Recommended: Transparent PNG or JPEG.</FormDescription>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={customizationForm.control}
                              name="brandColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-foreground">Accent Color</FormLabel>
                                  <div className="flex gap-2">
                                    <FormControl><Input {...field} type="color" className="h-10 p-1 w-full" /></FormControl>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customizationForm.control}
                              name="headerColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-foreground">Header Bar</FormLabel>
                                  <div className="flex gap-2">
                                    <FormControl><Input {...field} type="color" className="h-10 p-1 w-full" /></FormControl>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customizationForm.control}
                              name="bottomBarColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-foreground">Bottom Bar</FormLabel>
                                  <div className="flex gap-2">
                                    <FormControl><Input {...field} type="color" className="h-10 p-1 w-full" /></FormControl>
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={customizationForm.control}
                              name="bodyBackgroundColor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-foreground">Body BG</FormLabel>
                                  <div className="flex gap-2">
                                    <FormControl><Input {...field} type="color" className="h-10 p-1 w-full" /></FormControl>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                             PREVIEW MODE
                          </h3>
                          <div className="space-y-2">
                            <FormLabel className="text-xs font-bold text-foreground">Preview Menu Type</FormLabel>
                            <Select value={previewMenuType} onValueChange={setPreviewMenuType}>
                              <SelectTrigger className="h-10 shadow-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                {seller?.menuTypes?.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button type="submit" disabled={isSavingCustomization} className="w-full h-12 shadow-xl hover:scale-[1.02] transition-transform font-headline font-bold uppercase tracking-wider">
                          {isSavingCustomization ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                          Publish Branding
                        </Button>
                      </form>
                    </Form>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-right-4">
                     <div className="mb-4 text-center">
                        <Badge variant="secondary" className="mb-2 uppercase tracking-widest text-[10px] font-black">LIVE APP PREVIEW</Badge>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Changes appear here instantly</p>
                     </div>
                     <MobilePreview 
                        logoUrl={watchedValues.logoUrl} 
                        headerColor={watchedValues.headerColor}
                        bottomBarColor={watchedValues.bottomBarColor}
                        bodyBackgroundColor={watchedValues.bodyBackgroundColor}
                        brandColor={watchedValues.brandColor} 
                        sellerName={seller?.courseName || 'Demo Establishment'} 
                        menuType={previewMenuType || 'Order'} 
                     />
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        <Separator className="my-10" />

        <Card id="menu-library" className="mb-12 shadow-md border-primary/20 bg-primary/5 scroll-mt-24">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Menu Library</CardTitle>
              <CardDescription>Maintain your global catalog. Use the filters below to browse categories.</CardDescription>
            </div>
            <Button onClick={() => { setEditingItem(null); setIsMasterFormOpen(true); }} size="sm" className="shadow-lg"><PlusCircle className="mr-2 h-4 w-4" /> New Menu Item</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-8 bg-background/50 p-2 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest px-2 mr-2">
                <Filter className="h-3 w-3" /> Filter
              </div>
              <Button 
                variant={masterCategoryFilter === 'All' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMasterCategoryFilter('All')}
                className="h-8 text-xs"
              >
                All
              </Button>
              {categories.map(cat => (
                <Button 
                  key={cat}
                  variant={masterCategoryFilter === cat ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setMasterCategoryFilter(cat)}
                  className="h-8 text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {areItemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
            ) : filteredMasterItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMasterItems.map(item => (
                  <div key={item.id} className="p-4 rounded-xl bg-background border shadow-sm group hover:border-primary/50 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setIsMasterFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', item.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 mb-2">{item.description}</p>
                    <p className="font-mono font-bold text-sm text-primary">${item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground italic border-2 border-dashed rounded-xl">
                <p>No items found in {masterCategoryFilter === 'All' ? 'the library' : `the ${masterCategoryFilter} category`}.</p>
                {masterCategoryFilter !== 'All' && (
                  <Button variant="link" onClick={() => setMasterCategoryFilter('All')}>Clear filter</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 id="service-management" className="font-headline text-2xl font-bold mb-6 mt-16 flex items-center gap-2 scroll-mt-24"><ListChecks className="h-6 w-6 text-primary" /> Service Menu Management</h2>
        <div className="grid grid-cols-1 gap-12">
          {seller?.menuTypes?.map(menuType => {
              const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
              return (
                  <Card key={menuType} className="shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                          <div>
                              <CardTitle className="text-xl">{menuType} Menu</CardTitle>
                              <CardDescription>Customize the selection and order of items specifically for {menuType}.</CardDescription>
                          </div>
                          <Button variant="outline" onClick={() => { setPickingMenuType(menuType); setIsPickingOpen(true); }} className="bg-background">
                              <PlusCircle className="mr-2 h-4 w-4" /> Pick Menu Items
                          </Button>
                      </CardHeader>
                      <CardContent className="pt-6">
                          {itemsInThisMenu.length === 0 ? (
                              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                  <p className="text-muted-foreground italic">No items picked for this menu yet.</p>
                                  <Button variant="link" onClick={() => { setPickingMenuType(menuType); setIsPickingOpen(true); }}>Choose items from library</Button>
                              </div>
                          ) : (
                              <div className="space-y-10">
                                  {categories.map(category => {
                                      const itemsInCategory = itemsInThisMenu
                                          .filter(i => i.category === category)
                                          .sort((a, b) => (a.menuRanks?.[menuType] || 0) - (b.menuRanks?.[menuType] || 0));
                                      
                                      if (itemsInCategory.length === 0) return null;

                                      return (
                                          <div key={category} className="space-y-4">
                                              <h4 className="font-bold text-sm uppercase tracking-[0.2em] text-muted-foreground border-l-4 border-primary pl-3">{category}</h4>
                                              <div className="space-y-2">
                                                  {itemsInCategory.map((item, idx) => (
                                                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card border group">
                                                          <div className="flex items-center gap-4">
                                                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRerank(item, menuType, 'up')} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></Button>
                                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRerank(item, menuType, 'down')} disabled={idx === itemsInCategory.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                                                              </div>
                                                              <div>
                                                                  <p className="font-medium text-sm">{item.name}</p>
                                                                  <p className="text-xs text-muted-foreground font-mono">${item.price.toFixed(2)}</p>
                                                              </div>
                                                          </div>
                                                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleToggleItemAvailability(item, menuType)}><Trash2 className="h-4 w-4" /></Button>
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

        {isClubSeller && (
          <section id="member-list" className="mt-20 mb-12 scroll-mt-24">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Member List</CardTitle>
                  <CardDescription>Club accounts available for member charging.</CardDescription>
                </div>
                <Button onClick={() => { setEditingMember(null); setIsMemberFormOpen(true); }} size="sm" variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Add Member</Button>
              </CardHeader>
              <CardContent>
                {areMembersLoading ? <Skeleton className="h-32 w-full" /> : members && members.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Member ID</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {members.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="font-mono text-xs">{m.memberNumber}</TableCell>
                          <TableCell><Badge variant={m.status === 'Active' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingMember(m); setIsMemberFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setMemberToDelete(m)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <div className="text-center py-10 text-muted-foreground italic">No members registered.</div>}
              </CardContent>
            </Card>
          </section>
        )}

        <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle></DialogHeader>
            <MasterItemForm onSave={handleSaveMasterItem} menuItem={editingItem} onClose={() => setIsMasterFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isPickingOpen} onOpenChange={setIsPickingOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Select Items for {pickingMenuType}</DialogTitle>
                  <CardDescription>Pick which items from your Menu Library should be available on the {pickingMenuType} menu.</CardDescription>
              </DialogHeader>
              <Separator className="my-2" />
              <div className="flex-1 overflow-y-auto pr-2">
                  {categories.map(category => {
                      const itemsInCategory = menuItems?.filter(i => i.category === category) || [];
                      if (itemsInCategory.length === 0) return null;
                      return (
                          <div key={category} className="mb-6">
                              <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{category}</h5>
                              <div className="space-y-2">
                                  {itemsInCategory.map(item => {
                                      const isSelected = item.availableOn?.includes(pickingMenuType);
                                      return (
                                          <div key={item.id} onClick={() => handleToggleItemAvailability(item, pickingMenuType)} className={cn(
                                              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                                              isSelected ? "border-primary bg-primary/5 shadow-inner" : "hover:bg-muted/50"
                                          )}>
                                              <div>
                                                  <p className="text-sm font-bold">{item.name}</p>
                                                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                                              </div>
                                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
              <DialogFooter className="mt-4 border-t pt-4">
                  <Button onClick={() => setIsPickingOpen(false)}>Done</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{editingMember ? 'Edit Member' : 'Add Member'}</DialogTitle></DialogHeader><MemberForm onSave={handleSaveMember} member={editingMember} onClose={() => setIsMemberFormOpen(false)} /></DialogContent></Dialog>

        <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Member?</AlertDialogTitle><AlertDialogDescription>This will remove <strong>{memberToDelete?.name}</strong> from the club list.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (!firestore || !memberToDelete) return; deleteDoc(doc(firestore, 'sellers', sellerId, 'members', memberToDelete.id)); setMemberToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Member</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {showTopButton && (
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-10 right-10 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 transition-all hover:scale-110 h-12 w-12"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      )}

      <BrandingFooter />
    </div>
  );
}