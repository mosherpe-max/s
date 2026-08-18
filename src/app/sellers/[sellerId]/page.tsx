
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
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  LayoutDashboard,
  UtensilsCrossed,
  Zap,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Loader2,
  LogOut,
  Clock,
  DollarSign,
  ShoppingBag,
  Save,
  Library,
  Power,
  Tags,
  Sparkles,
  Wand2,
  PanelLeft,
  ChevronRightSquare,
  TrendingUp,
  Mail,
  Phone,
  Search,
  Trash2,
  Calendar as CalendarIcon,
  QrCode,
  Image as LucideImage,
  Download,
  Package,
  Menu,
  HeartPulse,
  ClipboardCheck,
  Timer,
  Activity,
  Info,
  User,
  Star,
  CreditCard,
  Banknote,
  Percent,
  Smartphone,
  X,
  Building,
  ChevronLeft,
  GripVertical
} from 'lucide-react';
import Image from 'next/image';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
import { 
  isToday, 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  differenceInMinutes, 
  differenceInSeconds,
  startOfMonth,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachHourOfInterval,
  isSameHour,
  isSameDay,
  isSameMonth,
  endOfMonth,
  endOfYear
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, ModifierGroup, SolutionConfig, OrderFulfillmentThresholds, Venue, Category } from '@/lib/types';
import { signOut } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
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
  category: z.string().min(1, 'Category required'),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().default(''),
  availableOn: z.array(z.string()).default([]),
  featuredOn: z.array(z.string()).default([]),
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
      {sidebarOpen && <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? "text-primary" : "")}>{label}</span>}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-2 pt-5 px-6">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5 px-6 text-left">
        <div className="text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface SortableItemProps {
  item: MenuItem;
  mode: string;
  isFeatured?: boolean;
  onToggleAvailability: (itemId: string, enabled: boolean) => void;
  onToggleFeatured: (itemId: string, enabled: boolean) => void;
}

function SortableItem({ item, mode, isFeatured, onToggleAvailability, onToggleFeatured }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.5 : 1 };
  const isEnabled = item.availableOn?.includes(mode);
  const isFeatureActive = item.featuredOn?.includes(mode);

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 transition-all bg-white mb-2", isEnabled ? "border-slate-100 shadow-sm" : "opacity-50 grayscale border-dashed border-slate-200")}>
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-primary"><GripVertical className="h-4 w-4" /></div>
      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 border">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" /> : <div className="flex items-center justify-center h-full text-slate-300"><LucideImage className="h-5 w-5" /></div>}</div>
      <div className="flex-1 min-w-0"><p className="text-xs font-black uppercase text-[#213147] truncate">{item.name}</p><p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">${item.price.toFixed(2)}</p></div>
      <div className="flex items-center gap-2"><button onClick={() => onToggleFeatured(item.id, !isFeatureActive)} className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-colors", isFeatureActive ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-500 hover:bg-amber-50")}><Star className={cn("h-4 w-4", isFeatureActive && "fill-current")} /></button><Switch checked={isEnabled} onCheckedChange={(val) => onToggleAvailability(item.id, val)} className="data-[state=checked]:bg-green-600" /></div>
    </div>
  );
}

export default function VenueAdminPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderDateRange, setOrderDateRange] = useState<'today' | '7days' | '30days' | 'all'>('today');
  const [patronSearchTerm, setPatronSearchTerm] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState<'today' | 'mtd' | 'ytd'>('mtd');

  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModifierGroupFormOpen, setIsModifierGroupFormOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [activeModeForMenu, setActiveModeForMenu] = useState<string | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsQuery);

  const modifierGroupsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: modifierGroups } = useCollection<ModifierGroup>(modifierGroupsQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffListQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffListQuery);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true }
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price: 0, category: 'Snacks', isAvailable: true, imageUrl: '', availableOn: [], featuredOn: [], modifierGroupIds: [] }
  });

  const modifierGroupForm = useForm<ModifierGroupFormData>({
    resolver: zodResolver(modifierGroupSchema),
    defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [{ id: Math.random().toString(36).substr(2, 9), name: '', priceAdjustment: 0, isAvailable: true }] }
  });

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', id), { ...data, id, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true });
    setIsStaffFormOpen(false); setIsProcessingSave(false); toast({ title: editingStaff ? "Staff Updated" : "Staff Added" });
  };

  const analyticsData = useMemo(() => {
    if (!orders || !seller || !solutionConfig) return { dailyRevenue: [], topItems: [], avgFulfillment: [], operationalHealth: [] };
    const now = new Date();
    const modes = (seller.menuTypes || []).filter(m => m !== 'Take Out');
    return { dailyRevenue: [], topItems: [], avgFulfillment: [], operationalHealth: [] }; // Placeholder for actual calculation
  }, [orders, seller, solutionConfig, analyticsRange]);

  const handleToggleModeStatus = async (mode: string, currentState: boolean) => {
    if (!firestore || !sellerId) return;
    const fieldMap: Record<string, string> = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
    const field = fieldMap[mode];
    if (field) {
      await updateDoc(doc(firestore, 'sellers', sellerId), { [field]: !currentState });
      toast({ title: "Channel Updated", description: `${mode} is now ${!currentState ? 'Active' : 'Inactive'}.` });
    }
  };

  const handleImpersonate = (mode: string) => {
    const tempId = `admin-temp-${Math.random().toString(36).substr(2, 9)}`;
    const tempName = `${user?.displayName || 'Admin'} (Incognito)`;
    localStorage.setItem('koop_is_admin_session', 'true');
    localStorage.setItem('koop_staff_id', tempId);
    localStorage.setItem('koop_staff_name', tempName);
    localStorage.setItem('koop_staff_role', mode);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    const pathMap: Record<string, string> = { 'Beverage Cart': 'bevcart', 'Clubhouse': 'clubhouse', 'Lane Delivery': 'laneside' };
    router.push(`/sellers/${sellerId}/${pathMap[mode]}`);
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ClipboardCheck },
    { id: "patrons", label: "Patrons", icon: User },
    { id: "modes", label: "Service Modes", icon: Zap },
    { id: "menu", label: "Menu Items", icon: UtensilsCrossed },
    { id: "modifiers", label: "Modifiers", icon: Tags },
    { id: "staff", label: "Staff", icon: Users },
    { id: "marketing", label: "Marketing", icon: Smartphone },
    { id: "settings", label: "Settings", icon: SettingsIcon }
  ];

  const NavContent = () => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen || isMobile} />
      ))}
    </nav>
  );

  if (isUserLoading || isSellerLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-x-auto bg-[#F8FAFC] text-left">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-6 w-6 text-[#213147]" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#213147] border-0 p-0 text-white">
              <SheetHeader className="p-6 border-b border-white/5 text-left"><StylizedKoopLogo size="md" /><SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Venue Control</SheetTitle></SheetHeader>
              <div className="p-4 text-left"><NavContent /></div>
            </SheetContent>
          </Sheet>
          <StylizedKoopLogo size="sm" colorClass="text-[#213147]" />
          <div className="flex flex-col text-left">
            <h1 className="text-sm font-black text-[#213147] uppercase tracking-tight leading-none mb-1 truncate max-w-[200px]">{seller?.courseName}</h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Establishment Admin</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span><LogOut className="h-5 w-5" /></button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between">{sidebarOpen && <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Navigation</p>}<Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">{sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}</Button></div>
          <ScrollArea className="flex-1 p-3"><NavContent /></ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto relative">
          <div className="p-8">
            <div className="max-w-6xl mx-auto space-y-8 pb-24 text-left min-w-0">
              {activeNav === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard label="Net Revenue" value="$0.00" sub="Excluding Platform Fees" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Active Tickets" value={0} sub="Pending Delivery" icon={Clock} colorClass="bg-primary" />
                    <KPICard label="Today's Volume" value={0} sub="Orders Processed" icon={ShoppingBag} colorClass="bg-indigo-600" />
                    <KPICard label="Staff Active" value={0} sub="On-Shift (Today)" icon={Users} colorClass="bg-slate-700" />
                  </div>
                  <Card className="border-2 shadow-md overflow-hidden">
                    <CardHeader className="bg-[#213147] text-white py-5 border-b"><div className="flex items-center gap-3"><Power className="h-5 w-5 text-primary" /><div className="text-left"><CardTitle className="text-xs font-black uppercase tracking-widest">Service Control Terminal</CardTitle><p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Activate fulfillment channels and monitor signals</p></div></div></CardHeader>
                    <CardContent className="p-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].filter(mode => seller?.menuTypes?.includes(mode)).map(mode => {
                          const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                          const isActive = !!(seller as any)?.[fieldMap[mode]];
                          return (
                            <div key={mode} className={cn("p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 relative group", isActive ? "border-primary bg-primary/5 shadow-inner" : "bg-slate-50 opacity-60 grayscale")}>
                              <div className="absolute top-4 right-4"><Switch checked={isActive} onCheckedChange={() => handleToggleModeStatus(mode, isActive)} className="data-[state=checked]:bg-green-600" /></div>
                              <div className={cn("p-3 rounded-2xl transition-all shadow-lg", isActive ? "bg-primary text-white scale-110" : "bg-slate-200 text-slate-400")}><Zap className="h-6 w-6" /></div>
                              <div className="text-center"><p className="text-[11px] font-black uppercase tracking-widest text-[#213147]">{mode}</p><Badge variant="outline" className={cn("mt-2 text-[8px] font-black uppercase", isActive ? "border-green-500 text-green-600" : "")}>{isActive ? "LIVE SIGNAL" : "INACTIVE"}</Badge></div>
                              <div className="flex flex-col w-full gap-2 mt-2">
                                <Button variant="outline" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm" onClick={() => handleImpersonate(mode)}>Enter Channel</Button>
                                <Button variant="secondary" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase gap-1.5" onClick={() => setActiveModeForMenu(mode)}><UtensilsCrossed className="h-3.5 w-3.5" /> Manage Menu</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingStaff ? 'Edit Personnel' : 'Add Fulfillment Staff'}</DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <Form {...staffForm}>
              <form onSubmit={staffForm.handleSubmit(onSaveStaff)} className="space-y-6">
                <FormField control={staffForm.control} name="name" render={({ field }) => (
                  <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Legal Full Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={staffForm.control} name="role" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Authorization Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Staff">Delivery Staff</SelectItem><SelectItem value="Manager">Venue Manager</SelectItem></SelectContent></Select></FormItem>
                  )} />
                  <FormField control={staffForm.control} name="pin" render={({ field }) => (
                    <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Access PIN (4-Digits)</FormLabel><FormControl><Input {...field} maxLength={4} className="h-12 border-2 font-black font-mono tracking-[0.4em] text-center text-indigo-600" /></FormControl></FormItem>
                  )} />
                </div>
                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Staff Record</Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
