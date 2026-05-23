
'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { collection, doc, setDoc, writeBatch, query, where, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Users, 
  Sparkles, 
  Loader2, 
  ListChecks, 
  BarChart3, 
  GripVertical,
  DollarSign,
  ShoppingBag,
  Clock,
  Activity,
  AlertTriangle,
  Download,
  LogOut,
  Layers,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { isThisMonth, isThisYear } from 'date-fns';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable, getFunctions } from 'firebase/functions';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensors,
  useSensor,
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

import type { MenuItem, Seller, Order, StaffMember, Venue } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from '@/lib/data';

const staffSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(['Driver', 'Server', 'Manager']),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'Numbers only'),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

function SortableMenuItem({ item, onRemove }: { item: MenuItem; onRemove: (item: MenuItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center justify-between p-3 rounded-lg border bg-card transition-shadow", isDragging ? "shadow-xl border-primary ring-2 ring-primary/20 opacity-90" : "shadow-sm")}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
        <div className="flex items-center gap-2"><span className="text-xs font-medium">{item.name}</span>{item.modifierGroups?.length ? <Layers className="h-3 w-3 text-primary" /> : null}</div>
      </div>
      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => onRemove(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
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
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedOpsMenu, setSelectedOpsMenu] = useState<string>('');
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const isHardcodedSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const roleRef = useMemoFirebase(() => (!firestore || !user?.email ? null : doc(firestore, 'roles_seller_admin', user.email.toLowerCase())), [firestore, user]);
  const { data: sellerRole } = useDoc(roleRef);
  const platformRoleRef = useMemoFirebase(() => (!firestore || !user ? null : doc(firestore, 'roles_admin', user.uid)), [firestore, user]);
  const { data: platformRole } = useDoc(platformRoleRef);

  // Reference to the secure 'venues' registry used for payments
  const venueRef = useMemoFirebase(() => (!firestore || !sellerId ? null : doc(firestore, 'venues', sellerId)), [firestore, sellerId]);
  const { data: venueData } = useDoc<Venue>(venueRef);

  const hasAccess = isHardcodedSuperAdmin || !!platformRole || (sellerRole?.sellerId === sellerId);

  useEffect(() => { setIsMounted(true); }, []);
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
  const { data: seller } = useDoc<Seller>(sellerRef);

  useEffect(() => { if (seller?.menuTypes?.length && !selectedOpsMenu) setSelectedOpsMenu(seller.menuTypes[0]); }, [seller, selectedOpsMenu]);

  const menuItemsQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId, hasAccess]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);
  const ordersQuery = useMemoFirebase(() => (firestore && hasAccess ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId, hasAccess]);
  const { data: orders } = useCollection<Order>(ordersQuery);
  const staffQuery = useMemoFirebase(() => (firestore && hasAccess ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId, hasAccess]);
  const { data: staff } = useCollection<StaffMember>(staffQuery);

  const staffForm = useForm<StaffFormData>({ resolver: zodResolver(staffSchema), defaultValues: { name: '', role: 'Driver', pin: '', isActive: true } });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !hasAccess) return;
    const staffId = editingStaff ? editingStaff.id : Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', staffId), { ...data, id: staffId, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true });
    setIsStaffFormOpen(false); setEditingStaff(null); staffForm.reset();
  };

  /**
   * handleStartStripeOnboarding
   * Calls the Cloud Function to generate a secure Stripe onboarding URL.
   */
  const handleStartStripeOnboarding = async () => {
    if (!firebaseApp || !user) return;
    setIsStripeLoading(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const createStripeAccount = httpsCallable(functions, 'createStripeConnectAccount');
      
      const result = await createStripeAccount({ venueId: sellerId });
      const { url } = result.data as { url: string };
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("The system failed to generate a secure redirection URL.");
      }
    } catch (error: any) {
      console.error("Stripe setup error:", error);
      toast({ 
        variant: "destructive", 
        title: "Configuration Error", 
        description: error.message || "Failed to initialize setup. Ensure your venue registry is correctly provisioned." 
      });
    } finally {
      setIsStripeLoading(false);
    }
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
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
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
        <Button variant="ghost" size="sm" onClick={() => scrollToSection('payments')} className="text-[10px] font-bold uppercase"><CreditCard className="mr-1 h-3.5 w-3.5" /> Payments</Button>
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

      {/* STRIPE INTEGRATION SECTION */}
      <section id="payments" className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          <h2 className="font-headline text-xl font-black uppercase tracking-tight">Payment Integration</h2>
        </div>
        
        <Card className="border-2 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-2 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2.5 rounded-xl">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Stripe Connect Express</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Automated Revenue Management</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Koop uses Stripe to securely handle all payments. By connecting your account, revenue is deposited directly into your merchant bank account every 24 hours.
              </p>

              <div className="flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Zero Transaction Fees for Venue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PCI-DSS Level 1 Secure</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-l p-8 flex flex-col items-center justify-center text-center gap-4">
              {!venueData ? (
                <div className="p-4 border-2 border-dashed rounded-2xl bg-white space-y-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-700">Registry Missing</h4>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    This seller does not have a provisioned venue registry. Please contact Platform Administration to enable payments.
                  </p>
                </div>
              ) : venueData.stripeOnboardingComplete ? (
                <>
                  <div className="bg-green-100 p-4 rounded-full text-green-600 mb-2">
                    <ShieldCheck className="h-10 w-10" />
                  </div>
                  <Badge className="bg-green-600 uppercase font-black tracking-widest">Account Verified</Badge>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase px-4">Your venue is actively processing digital payments.</p>
                  <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest rounded-xl" asChild>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      Stripe Dashboard <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-2">
                    <CreditCard className="h-10 w-10" />
                  </div>
                  <h4 className="font-headline font-black text-sm uppercase">Setup Payments</h4>
                  <p className="text-[10px] font-medium text-slate-500 uppercase leading-relaxed px-4">
                    Complete your business profile on Stripe to begin accepting orders and receiving payouts.
                  </p>
                  <Button 
                    onClick={handleStartStripeOnboarding}
                    disabled={isStripeLoading}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg font-black uppercase tracking-widest text-[11px] gap-2 rounded-xl"
                  >
                    {isStripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    {venueData.stripeAccountId ? 'Resume Setup' : 'Connect Account'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section id="staff-management" className="mb-12">
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Staff Registry</CardTitle><Button onClick={() => { setEditingStaff(null); staffForm.reset(); setIsStaffFormOpen(true); }}>Add Staff</Button></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>PIN</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{staff?.map(s => (<TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.role}</TableCell><TableCell><code>{s.pin}</code></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => { setEditingStaff(s); staffForm.reset(s); setIsStaffFormOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      </section>

      <section id="sales-stats" className="mb-12">
        <div className="flex gap-4 mb-4">{dashboardStats && <><StatTile title="Monthly" revenue={dashboardStats.monthly.revenue} orders={dashboardStats.monthly.orders} longWait={dashboardStats.monthly.longWait} /><StatTile title="Yearly" revenue={dashboardStats.yearly.revenue} orders={dashboardStats.yearly.orders} longWait={dashboardStats.yearly.longWait} /></>}</div>
        <Button onClick={handleExportToExcel}><Download className="mr-2 h-4 w-4" /> Export Report</Button>
      </section>

      <section id="service-management" className="mb-12">
        {seller?.menuTypes?.map(type => {
          const items = menuItems?.filter(i => i.availableOn?.includes(type)) || [];
          return (
            <Card key={type} className="mb-8">
              <CardHeader><CardTitle>{type} Menu</CardTitle></CardHeader>
              <CardContent>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e as any, type, items)}>
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}><div className="space-y-2">{items.map(i => <SortableMenuItem key={i.id} item={i} onRemove={(it) => updateDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', it.id), { availableOn: it.availableOn?.filter(t => t !== type) })} />)}</div></SortableContext>
                </DndContext>
                <Button variant="outline" className="mt-4" onClick={() => { toast({ title: "Menu Picker Disabled", description: "Functionality currently restricted." }) }}>Manage Items</Button>
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
