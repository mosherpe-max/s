
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
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
  GripVertical,
  DollarSign,
  ShoppingBag,
  Clock,
  Activity,
  ImageIcon,
  Timer,
  Truck,
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
  CheckCircle2,
  Save
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
import { useRouter } from 'next/navigation';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

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

import type { MenuItem, Seller, Category, Order, ModifierGroup, ModifierOption, StaffMember } from '@/lib/types';
import { categories } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from '@/lib/data';

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

function SortableMenuItem({ item, onRemove }: { item: MenuItem; onRemove: (item: MenuItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center justify-between p-3 rounded-lg border bg-card transition-shadow", isDragging ? "shadow-xl border-primary ring-2 ring-primary/20 opacity-90" : "shadow-sm")}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{item.name}</span>
          {item.modifierGroups?.length ? <Layers className="h-3 w-3 text-primary" /> : null}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => onRemove(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function ModifierGroupManager({ control, groupIndex }: { control: any, groupIndex: number }) {
  const { fields, append, remove } = useFieldArray({ control, name: `modifierGroups.${groupIndex}.options` });

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
        <Button variant="outline" size="sm" onClick={() => append({ id: Math.random().toString(), name: '', price: 0 })} className="w-full text-[10px] uppercase font-bold"><PlusCircle className="h-3 w-3 mr-1" /> Add Option</Button>
      </div>
    </div>
  );
}

function MasterItemForm({ onSave, onClose, menuItem, disabled }: { onSave: (itemData: MenuItemFormData) => void; onClose: () => void; menuItem?: MenuItem | null; disabled?: boolean; }) {
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: menuItem || {
      name: '', description: '', price: 0, category: 'Beer' as Category, imageUrl: '', availableOn: [], modifierGroups: []
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'modifierGroups' });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col max-h-[80vh]">
        <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Item Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select>
                  </FormItem>
              )} />
            </div>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase flex items-center gap-2"><Layers className="h-4 w-4" /> Modifiers</h3>
                <Button variant="outline" size="sm" onClick={() => append({ id: Math.random().toString(), name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(), name: '', price: 0 }] })}>Add Group</Button>
              </div>
              <div className="space-y-4">{fields.map((field, index) => (<div key={field.id} className="relative"><ModifierGroupManager control={form.control} groupIndex={index} /><Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => remove(index)}><Trash2 className="h-3.5 w-3.5" /></Button></div>))}</div>
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
      <CardHeader className="pb-2"><CardTitle className="text-lg font-headline">{title}</CardTitle><CardDescription>Sales Performance</CardDescription></CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Revenue</span></div><span className="font-mono font-bold">${revenue.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Orders</span></div><span className="font-mono font-bold">{orders}</span></div>
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-destructive" /><span className="text-sm font-medium">Overdue</span></div><span className="font-mono font-bold text-destructive">{longWait}</span></div>
      </CardContent>
    </Card>
  );
}

function OpsMetricCard({ label, value, icon: Icon, colorClass }: { label: string, value: string | number, icon: any, colorClass?: string }) {
  return (
    <div className="bg-background border rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-primary/10", colorClass)}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</p><p className="text-sm font-black font-headline truncate">{value}</p></div>
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
  const [now, setNow] = useState(Date.now());
  const [revenueMode, setRevenueMode] = useState<'Gross' | 'Net'>('Gross');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const isHardcodedSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const roleRef = useMemoFirebase(() => (!firestore || !user?.email ? null : doc(firestore, 'roles_seller_admin', user.email.toLowerCase())), [firestore, user]);
  const { data: sellerRole } = useDoc(roleRef);
  const platformRoleRef = useMemoFirebase(() => (!firestore || !user ? null : doc(firestore, 'roles_admin', user.uid)), [firestore, user]);
  const { data: platformRole } = useDoc(platformRoleRef);

  const hasAccess = isHardcodedSuperAdmin || !!platformRole || (sellerRole?.sellerId === sellerId);

  useEffect(() => { setIsMounted(true); const interval = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(interval); }, []);
  useEffect(() => { if (!isUserLoading && !user) router.push('/login'); }, [user, isUserLoading, router]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  useEffect(() => { if (seller?.menuTypes?.length && !selectedOpsMenu) setSelectedOpsMenu(seller.menuTypes[0]); }, [seller, selectedOpsMenu]);

  const menuItemsQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, hasAccess]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);
  const ordersQuery = useMemoFirebase(() => (firestore && hasAccess ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, hasAccess]);
  const { data: orders } = useCollection<Order>(ordersQuery);
  const staffQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId, hasAccess]);
  const { data: staff, isLoading: isStaffLoading } = useCollection<StaffMember>(staffQuery);

  const staffForm = useForm<StaffFormData>({ resolver: zodResolver(staffSchema), defaultValues: { name: '', role: 'Driver', pin: '', isActive: true } });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !hasAccess) return;
    const staffId = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', staffId), { ...data, id: staffId, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true });
    setIsStaffFormOpen(false); setEditingStaff(null); staffForm.reset();
  };

  const dashboardStats = useMemo(() => {
    if (!orders || !seller) return null;
    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + o.total, 0);
      const longWait = filtered.filter(o => {
        if (!o.deliveredAt || !o.createdAt) return false;
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        return duration > (seller.orderThresholds?.[o.menuType]?.max || 10);
      }).length;
      return { revenue, orders: filtered.length, longWait };
    };
    return {
      monthly: calculate(orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()))),
      yearly: calculate(orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()))),
    };
  }, [orders, seller]);

  const handleExportToExcel = () => {
    if (!orders || !orders.length) return;
    const worksheet = XLSX.utils.json_to_sheet(orders.map(o => ({ ID: o.id, Total: o.total, Status: o.status })));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, "Report.xlsx");
  };

  const handleResetDemo = async () => {
    if (!firestore || !sellerId || !hasAccess) return;
    setIsResettingDemo(true);
    try {
      const batch = writeBatch(firestore);
      const seedItems = sellerId.includes('bowling') ? bowlingAlleyItems : (sellerId.includes('private') ? privateGolfItems : publicGolfItems);
      const snapshot = await getDocs(collection(firestore, 'sellers', sellerId, 'menuItems'));
      snapshot.docs.forEach(d => batch.delete(d.ref));
      seedItems.forEach((item, idx) => {
        const itemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        batch.set(itemRef, { ...item, id: itemRef.id, rank: idx, createdAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: "Demo Reset" });
    } finally { setIsResettingDemo(false); }
  };

  const handleDragEnd = (event: DragEndEvent, menuType: string, items: MenuItem[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !firestore || !hasAccess) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    const batch = writeBatch(firestore);
    reordered.forEach((item, index) => batch.update(doc(firestore, 'sellers', sellerId, 'menuItems', item.id), { [`menuRanks.${menuType}`]: index }));
    batch.commit();
  };

  if (isUserLoading || !isMounted) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold uppercase">ESTABLISHMENT ADMIN</h1>
          <p className="text-muted-foreground">{seller?.courseName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleResetDemo} disabled={isResettingDemo}>{isResettingDemo ? <Loader2 className="animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Reset Demo</Button>
          <Button variant="ghost" onClick={() => signOut(auth!)} className="text-destructive"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
        </div>
      </header>

      <nav className="sticky top-16 z-30 bg-background border-y mb-8 py-3 flex gap-2 overflow-x-auto">
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('ops-monitor')} className="text-[10px] font-bold uppercase"><Activity className="mr-1 h-3.5 w-3.5" /> Queue</Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('staff-management')} className="text-[10px] font-bold uppercase"><Users className="mr-1 h-3.5 w-3.5" /> Staff</Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('sales-stats')} className="text-[10px] font-bold uppercase"><BarChart3 className="mr-1 h-3.5 w-3.5" /> Sales</Button>
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('service-management')} className="text-[10px] font-bold uppercase"><ListChecks className="mr-1 h-3.5 w-3.5" /> Menus</Button>
      </nav>

      <section id="ops-monitor" className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <OpsMetricCard label="Today's Revenue" value={`$${dashboardStats?.monthly.revenue.toFixed(2) || '0.00'}`} icon={DollarSign} />
          <OpsMetricCard label="Active Orders" value={orders?.filter(o => o.status !== 'Delivered').length || 0} icon={ShoppingBag} />
          <OpsMetricCard label="Overdue" value={dashboardStats?.monthly.longWait || 0} icon={AlertTriangle} />
          <Button asChild className="h-full bg-indigo-600"><Link href={`/sellers/${sellerId}/bevcart`}>Launch BevCart</Link></Button>
        </div>
      </section>

      <section id="staff-management" className="mb-12">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff Registry</CardTitle>
            <Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }}>Add Staff</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>PIN</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {staff?.map(s => (
                  <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.role}</TableCell><TableCell><code>{s.pin}</code></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section id="sales-stats" className="mb-12">
        <div className="flex gap-4 mb-4">
          {dashboardStats && <><StatTile title="Monthly" revenue={dashboardStats.monthly.revenue} orders={dashboardStats.monthly.orders} longWait={dashboardStats.monthly.longWait} /><StatTile title="Yearly" revenue={dashboardStats.yearly.revenue} orders={dashboardStats.yearly.orders} longWait={dashboardStats.yearly.longWait} /></>}
        </div>
        <Button onClick={handleExportToExcel}><Download className="mr-2 h-4 w-4" /> Export Report</Button>
      </section>

      <section id="service-management" className="mb-12">
        {seller?.menuTypes?.map(type => {
          const items = menuItems?.filter(i => i.availableOn?.includes(type)) || [];
          return (
            <Card key={type} className="mb-8">
              <CardHeader><CardTitle>{type} Menu</CardTitle></CardHeader>
              <CardContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, type, items)}>
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">{items.map(i => <SortableMenuItem key={i.id} item={i} onRemove={(it) => updateDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', it.id), { availableOn: it.availableOn?.filter(t => t !== type) })} />)}</div>
                  </SortableContext>
                </DndContext>
                <Button variant="outline" className="mt-4" onClick={() => { setPickingMenuType(type); setIsPickingOpen(true); }}>Manage Items</Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff'}</DialogTitle></DialogHeader>
          <Form {...staffForm}><form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-4">
            <FormField control={staffForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={staffForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Driver">Driver</SelectItem><SelectItem value="Server">Server</SelectItem><SelectItem value="Manager">Manager</SelectItem></SelectContent></Select></FormItem>)} />
            <FormField control={staffForm.control} name="pin" render={({ field }) => (<FormItem><FormLabel>PIN</FormLabel><FormControl><Input {...field} maxLength={4} /></FormControl></FormItem>)} />
            <Button type="submit" className="w-full">Save</Button>
          </form></Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
