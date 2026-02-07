'use client';

import React, { useState, useMemo, useEffect, use, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Filter, DollarSign, ShoppingBag, Clock, Database, Users, UserPlus, Sparkles, Download, FileSpreadsheet, Save, Loader2, ListChecks, ChevronUp, ChevronDown, Check, MousePointer2, BarChart3, ArrowUp, LayoutGrid, Settings2 } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear, format } from 'date-fns';
import Link from 'next/link';
import * as XLSX from 'xlsx';

import type { MenuItem, Seller, Category, Order, Member } from '@/lib/types';
import { categories } from '@/lib/types';
import { menuItems as mockMenuItems } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

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

export default function SellerAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  const [isPickingOpen, setIsPickingOpen] = useState(false);
  const [pickingMenuType, setPickingMenuType] = useState<string>('');
  
  const [isCategoryConfigOpen, setIsCategoryConfigOpen] = useState(false);
  const [configMenuType, setConfigMenuType] = useState<string>('');

  const [isSeeding, setIsSeeding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('All');
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

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

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

  const filteredMasterItems = useMemo(() => {
    if (!menuItems) return [];
    if (masterCategoryFilter === 'All') return [...menuItems].sort((a,b) => a.name.localeCompare(b.name));
    return menuItems
      .filter(item => item.category === masterCategoryFilter)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [menuItems, masterCategoryFilter]);

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);
      const isDemo = sellerId === 'demo-course';
      batch.set(doc(firestore, 'sellers', sellerId), {
        id: sellerId, 
        courseName: isDemo ? 'Demo Golf Course' : 'Sample Course',
        type: isDemo ? 'Public Golf Course' : 'Private Golf Course', 
        streetAddress: '123 Fairway Drive', city: 'Pebble Beach', state: 'CA', zip: '93953',
        latitude: 42.7748, longitude: -83.2139, contactName: 'Pro Shop Manager', contactEmail: 'manager@democourse.com',
        contactPhone: '555-0100', serviceFee: 2.50, status: 'Inactive', 
        bevcartActive: false,
        clubhouseActive: false,
        menuTypes: ['Beverage Cart', 'Clubhouse'],
        brandColor: '#22c55e',
        categoryVisibility: {
          'Beverage Cart': ['Beer', 'Spirits', 'Soft Drinks', 'Snacks', 'Other'],
          'Clubhouse': ['Handhelds', 'Appetizers', 'Entrees', 'Pizza', 'Salad', 'Dessert', 'Beer', 'Spirits', 'Soft Drinks', 'Snacks', 'Other']
        }
      }, { merge: true });
      mockMenuItems.forEach((item, index) => {
        const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        batch.set(newItemRef, { ...item, id: newItemRef.id, rank: index + 1 });
      });
      await batch.commit();
      toast({ title: "Demo Ready", description: "Sample data loaded." });
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

  if (!isMounted) return null;

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
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Import Excel Menu
             </Button>
             <input type="file" ref={fileInputRef} onChange={handleExcelImport} accept=".xlsx, .xls" className="hidden" />
             <Button variant="outline" size="sm" onClick={handleSeedData} disabled={isSeeding}>
                <Sparkles className="mr-2 h-4 w-4" /> Reset Demo
             </Button>
          </div>
        </header>

        <section id="performance-overview" className="mb-12 scroll-mt-24">
          <h2 className="font-headline text-xl font-bold mb-6 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Performance Overview</h2>
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

        <Card id="menu-library" className="mb-12 shadow-md border-primary/20 bg-primary/5 scroll-mt-24">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Menu Library</CardTitle>
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
                      <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingItem(item); setIsMasterFormOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="font-mono font-bold text-sm text-primary">${item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 id="service-management" className="font-headline text-2xl font-bold mb-6 mt-16 flex items-center gap-2 scroll-mt-24"><ListChecks className="h-6 w-6 text-primary" /> Service Menus</h2>
        <div className="grid grid-cols-1 gap-12">
          {seller?.menuTypes?.map(menuType => {
              const itemsInThisMenu = menuItems?.filter(i => i.availableOn?.includes(menuType)) || [];
              const enabledCats = seller.categoryVisibility?.[menuType] || [];

              return (
                  <Card key={menuType} className="shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                          <div>
                              <CardTitle className="text-xl">{menuType} Menu</CardTitle>
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
                                  {categories.map(category => {
                                      const itemsInCategory = itemsInThisMenu.filter(i => i.category === category);
                                      const isCatHidden = !enabledCats.includes(category);
                                      if (itemsInCategory.length === 0) return null;

                                      return (
                                          <div key={category} className={cn("space-y-3", isCatHidden && "opacity-50 grayscale")}>
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-sm uppercase tracking-widest">{category}</h4>
                                                {isCatHidden && <Badge variant="secondary">Hidden from Golfer</Badge>}
                                              </div>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {itemsInCategory.map(item => (
                                                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-card border">
                                                          <span className="text-xs font-medium">{item.name}</span>
                                                          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => handleToggleItemAvailability(item, menuType)}><Trash2 className="h-3 w-3" /></Button>
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

        <Dialog open={isMasterFormOpen} onOpenChange={setIsMasterFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
            <MasterItemForm onSave={handleSaveMasterItem} menuItem={editingItem} onClose={() => setIsMasterFormOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={isPickingOpen} onOpenChange={setIsPickingOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader><DialogTitle>Add to {pickingMenuType}</DialogTitle></DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2 py-4">
                  {categories.map(category => {
                      // Restriction: Pizza/Salad only for Clubhouse
                      if (pickingMenuType === 'Beverage Cart' && (category === 'Pizza' || category === 'Salad')) return null;

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
                                              isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                                          )}>
                                              <span className="text-sm font-bold">{item.name}</span>
                                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
              <DialogFooter><Button onClick={() => setIsPickingOpen(false)}>Done</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryConfigOpen} onOpenChange={setIsCategoryConfigOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Enabled Categories: {configMenuType}</DialogTitle>
              <CardDescription>Choose which categories should appear to golfers using this service.</CardDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              {categories.map(category => {
                // Restriction: Pizza/Salad only for Clubhouse
                if (configMenuType === 'Beverage Cart' && (category === 'Pizza' || category === 'Salad')) return null;

                const isVisible = seller?.categoryVisibility?.[configMenuType]?.includes(category);
                return (
                  <div key={category} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer" onClick={() => handleToggleCategoryVisibility(configMenuType, category)}>
                    <Checkbox checked={isVisible} />
                    <span className="text-sm font-medium">{category}</span>
                  </div>
                );
              })}
            </div>
            <DialogFooter><Button onClick={() => setIsCategoryConfigOpen(false)}>Save Settings</Button></DialogFooter>
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
