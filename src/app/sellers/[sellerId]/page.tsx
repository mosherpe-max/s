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
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Zap,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  ChevronRight,
  Plus,
  Edit,
  Loader2,
  LogOut,
  ShieldCheck,
  Clock,
  DollarSign,
  ShoppingBag,
  Save,
  Library,
  Power,
  ExternalLink,
  Truck,
  Building,
  Tags,
  Sparkles,
  Wand2,
  ShieldAlert,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm, useFieldArray } from 'react-hook-form';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { isToday } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, Venue, SellerAdminRole, ModifierGroup } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

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
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative text-left",
        active ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">{label}</span>}
      {active && <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-1 pt-3 px-4">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-2.5 w-2.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 px-4 text-left">
        <div className="text-2xl font-black font-headline tracking-tighter text-[#213147] mb-0.5">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{sub}</p>
      </CardContent>
    </Card>
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
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isApplyingStarter, setIsApplyingStarter] = useState(false);
  const [isApplyingStarterItems, setIsApplyingStarterItems] = useState(false);
  const [isStarterMenuConfirmOpen, setIsStarterMenuConfirmOpen] = useState(false);
  const [isStarterItemsConfirmOpen, setIsStarterItemsConfirmOpen] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modifierGroupsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: modifierGroups } = useCollection<ModifierGroup>(modifierGroupsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffQuery);

  const stats = useMemo(() => { 
    if (!orders) return null; 
    const today = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate())); 
    const revenue = today.reduce((acc, o) => acc + (o.total || 0), 0); 
    const activeCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    return { revenue: revenue.toFixed(2), active: activeCount, volume: today.length }; 
  }, [orders]);

  const handleApplyStarterMenu = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsApplyingStarter(true);
    try {
      const type = seller?.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyStarter = httpsCallable(functions, 'applyStarterMenu');
      await applyStarter({ venueId: sellerId, venueType: type });
      toast({ title: "Modifiers Provisioned" });
      setIsStarterMenuConfirmOpen(false);
    } catch (error) { toast({ variant: "destructive", title: "Setup Failed" }); } finally { setIsApplyingStarter(false); }
  };

  const handleApplyStarterItems = async () => {
    if (!firebaseApp || !sellerId) return;
    setIsApplyingStarterItems(true);
    try {
      const type = seller?.type?.toLowerCase().includes('bowling') ? 'bowling' : 'golf';
      const functions = getFunctions(firebaseApp, 'us-central1');
      const applyItems = httpsCallable(functions, 'applyStarterItems');
      await applyItems({ venueId: sellerId, venueType: type });
      toast({ title: "Menu Items Provisioned" });
      setIsStarterItemsConfirmOpen(false);
    } catch (error) { toast({ variant: "destructive", title: "Setup Failed" }); } finally { setIsApplyingStarterItems(false); }
  };

  const handleImpersonate = (mode: string) => {
    localStorage.setItem('koop_staff_id', `admin-${user?.uid}`);
    localStorage.setItem('koop_staff_name', `${user?.email} (Management)`);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    setTimeout(() => {
      if (mode === 'Beverage Cart') router.push(`/sellers/${sellerId}/bevcart`);
      else if (mode === 'Clubhouse') router.push(`/sellers/${sellerId}/clubhouse`);
      else if (mode === 'Lane Delivery') router.push(`/sellers/${sellerId}/laneside`);
    }, 500);
  };

  const staffForm = useForm<StaffFormData>({ resolver: zodResolver(staffSchema), defaultValues: { name: '', role: 'Staff', pin: '', isActive: true } });
  const itemForm = useForm<ItemFormData>({ resolver: zodResolver(itemSchema), defaultValues: { name: '', description: '', price: 0, category: 'Other', isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] } });
  const modifierGroupForm = useForm<ModifierGroupFormData>({ resolver: zodResolver(modifierGroupSchema), defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] } });
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: modifierGroupForm.control, name: "options" });

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "modifiers", label: "Modifiers", icon: Tags },
    { id: "staff", label: "Staff", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  if (isUserLoading || isSellerLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-4 text-left">
          <StylizedKoopLogo size="sm" colorClass="text-[#213147]" />
          <div className="flex flex-col text-left">
            <h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1">{seller?.courseName}</h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Venue Manager Terminal</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span><LogOut className="h-5 w-5" /></button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen} />
            ))}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-8">
            <div className="max-w-6xl mx-auto space-y-8 pb-24 text-left">
              {activeNav === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KPICard label="Today's Revenue" value={`$${stats?.revenue}`} sub="Gross F&B" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Active Tickets" value={stats?.active || 0} sub="Pending Delivery" icon={Clock} colorClass="bg-primary" />
                    <KPICard label="Today's Volume" value={stats?.volume || 0} sub="Processed" icon={ShoppingBag} colorClass="bg-indigo-600" />
                    <KPICard label="Staff Active" value={staffList?.filter(s => s.lastActive).length || 0} sub="On-Shift" icon={Users} colorClass="bg-slate-700" />
                  </div>

                  <Card className="border-2 shadow-md">
                    <CardHeader className="bg-[#213147] text-white py-4 border-b">
                      <div className="flex items-center gap-3"><Power className="h-5 w-5 text-primary" /><CardTitle className="text-xs font-black uppercase tracking-widest">Service Controls</CardTitle></div>
                    </CardHeader>
                    <CardContent className="p-6">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {seller?.menuTypes?.map(mode => {
                          const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                          const isActive = !!(seller as any)?.[fieldMap[mode]];
                          return (
                            <div key={mode} className={cn("p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3", isActive ? "border-primary bg-primary/5" : "bg-slate-50 opacity-60")}>
                               <div className={cn("p-2 rounded-xl", isActive ? "bg-primary text-white" : "bg-slate-200")}><Zap className="h-5 w-5" /></div>
                               <p className="text-[10px] font-black uppercase">{mode}</p>
                               <Button variant="outline" size="sm" className="h-8 w-full text-[9px] font-black uppercase tracking-widest" onClick={() => handleImpersonate(mode)}>Enter Terminal</Button>
                            </div>
                          );
                        })}
                       </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeNav === 'menu' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-4">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Menu Item Library</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Items available for all service channels</p></div>
                    <div className="flex gap-2">
                       <Button onClick={() => setIsStarterItemsConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] tracking-widest gap-2"><Library className="h-4 w-4 text-indigo-600" /> Apply Starter Items</Button>
                       <Button onClick={() => { setEditingItem(null); itemForm.reset(); setIsItemFormOpen(true); }} className="bg-primary h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"><Plus className="h-4 w-4" /> Add Custom Item</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {menuItems?.map(item => (
                      <Card key={item.id} className="border-2 shadow-sm group">
                        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-start justify-between">
                          <div className="space-y-0.5"><p className="font-black text-xs uppercase text-[#213147]">{item.name}</p><p className="text-[9px] font-bold text-primary font-mono">${item.price.toFixed(2)}</p></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingItem(item); itemForm.reset(item as any); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-4"><p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p></CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'modifiers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-4">
                    <div className="space-y-1"><h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Modifier Groups</h3><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global customization sets</p></div>
                    <div className="flex gap-2">
                       <Button onClick={() => setIsStarterMenuConfirmOpen(true)} variant="outline" className="h-12 border-2 font-black uppercase text-[10px] tracking-widest gap-2"><Tags className="h-4 w-4 text-indigo-600" /> Apply Starter Modifiers</Button>
                       <Button onClick={() => { setEditingModifierGroup(null); modifierGroupForm.reset(); setIsModifierGroupFormOpen(true); }} className="bg-indigo-600 h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl"><Plus className="h-4 w-4" /> Add Modifier Set</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {modifierGroups?.map(group => (
                      <Card key={group.id} className="border-2 shadow-sm group">
                        <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                          <div className="space-y-0.5"><p className="font-black text-xs uppercase text-[#213147]">{group.name}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Min {group.minSelection} / Max {group.maxSelection}</p></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingModifierGroup(group); modifierGroupForm.reset(group as any); setIsModifierGroupFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-wrap gap-1.5">{group.options.map((opt, idx) => (<Badge key={idx} variant="outline" className="text-[8px] font-bold uppercase">{opt.name} {opt.priceAdjustment > 0 && `(+$${opt.priceAdjustment.toFixed(2)})`}</Badge>))}</CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Item Form */}
      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}><DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left"><DialogHeader className="p-8 bg-[#213147] text-white"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Menu Item</DialogTitle></DialogHeader><ScrollArea className="max-h-[70vh]"><div className="p-8"><Form {...itemForm}><form onSubmit={itemForm.handleSubmit(async (d) => { setIsProcessingSave(true); const id = editingItem?.id || Math.random().toString(36).substr(2, 9); await setDoc(doc(firestore!, 'sellers', sellerId, 'menuItems', id), { ...d, id, rank: editingItem?.rank || 99 }, { merge: true }); setIsItemFormOpen(false); setIsProcessingSave(false); })} className="space-y-6"><FormField control={itemForm.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={itemForm.control} name="price" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Price</FormLabel><FormControl><Input {...field} type="number" step="0.01" className="h-12 border-2 font-bold" /></FormControl></FormItem>)} /><FormField control={itemForm.control} name="category" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>)} /></div><Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Item</Button></form></Form></div></ScrollArea></DialogContent></Dialog>

      {/* Modifier Confirmation Modals */}
      <Dialog open={isStarterMenuConfirmOpen} onOpenChange={setIsStarterMenuConfirmOpen}><DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl"><DialogHeader className="p-8 bg-indigo-600 text-white"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Modifiers</DialogTitle></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase">This will add standard modifier sets (Doneness, Toppings, etc.) to your library.</p><Button onClick={handleApplyStarterMenu} disabled={isApplyingStarter} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarter ? <Loader2 className="animate-spin" /> : <Wand2 className="h-5 w-5" />} {isApplyingStarter ? "Provisioning..." : "Confirm & Apply"}</Button></div></DialogContent></Dialog>
      <Dialog open={isStarterItemsConfirmOpen} onOpenChange={setIsStarterItemsConfirmOpen}><DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl"><DialogHeader className="p-8 bg-indigo-600 text-white"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Apply Starter Menu Items</DialogTitle></DialogHeader><div className="p-8 space-y-6 text-left"><p className="text-[11px] font-bold text-indigo-900 uppercase">This will populate your menu with standard items and auto-link them to modifiers.</p><Button onClick={handleApplyStarterItems} disabled={isApplyingStarterItems} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isApplyingStarterItems ? <Loader2 className="animate-spin" /> : <Sparkles className="h-5 w-5" />} {isApplyingStarterItems ? "Cloning Menu..." : "Confirm & Populate"}</Button></div></DialogContent></Dialog>
    </div>
  );
}
