
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
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  PanelLeft,
  ChevronRightSquare,
  Search,
  Trash2,
  Calendar as CalendarIcon,
  QrCode,
  Image as LucideImage,
  Download,
  Package,
  Menu,
  Activity,
  User,
  Star,
  Smartphone,
  X,
  Building,
  ChevronLeft,
  GripVertical,
  ClipboardCheck
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
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
import { 
  isToday, 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  differenceInMinutes, 
  differenceInSeconds
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { categories } from '@/lib/types';
import type { MenuItem, Seller, Order, StaffMember, ModifierGroup, SolutionConfig, OrderFulfillmentThresholds } from '@/lib/types';
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

const getModeColor = (mode: string) => {
  switch (mode) {
    case 'Beverage Cart': return '#E50000'; // Koop Red
    case 'Clubhouse': return '#213147'; // Koop Navy
    case 'Lane Delivery': return '#4f46e5'; // Indigo
    default: return '#94a3b8';
  }
};

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

  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const staffListQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'staff') : null), [firestore, sellerId]);
  const { data: staffList } = useCollection<StaffMember>(staffListQuery);

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: 'Staff', pin: '', isActive: true }
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price: 0, category: '', isAvailable: true, availableOn: [], featuredOn: [], modifierGroupIds: [] }
  });

  const analyticsData = useMemo(() => {
    if (!orders || !seller) return { dailyRevenue: [], topItems: [], fulfillmentEfficiency: [], revenueByMode: [] };
    
    const now = new Date();
    const modes = (seller.menuTypes || []).filter(m => m !== 'Take Out');
    
    // 1. Daily Revenue Trend (Last 7 days) - For STACKED BAR CHART
    const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(startOfDay(now), 6 - i);
      const dayLabel = format(date, 'MMM d');
      const dayData: any = { name: dayLabel };
      
      modes.forEach(mode => {
        const modeOrders = orders.filter(o => 
          o.menuType === mode && 
          o.status === 'Delivered' && 
          o.createdAt && 
          format(o.createdAt.toDate(), 'MMM d') === dayLabel
        );
        dayData[mode] = modeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      });
      return dayData;
    });

    // 2. Top Items by Volume
    const itemMap = new Map<string, number>();
    orders.forEach(o => {
      if (o.status === 'Delivered') {
        o.items.forEach(i => {
          itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity);
        });
      }
    });
    const topItems = Array.from(itemMap.entries())
      .map(([name, volume]) => ({ name, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // 3. Fulfillment Efficiency
    const fulfillmentEfficiency = modes.map(mode => {
      const modeOrders = orders.filter(o => o.menuType === mode && o.status === 'Delivered' && o.deliveredAt && o.acknowledgedAt);
      const avgAck = modeOrders.length > 0 
        ? modeOrders.reduce((sum, o) => sum + differenceInSeconds(o.acknowledgedAt!.toDate(), o.createdAt.toDate()), 0) / modeOrders.length
        : 0;
      const avgDeliver = modeOrders.length > 0
        ? modeOrders.reduce((sum, o) => sum + differenceInMinutes(o.deliveredAt!.toDate(), o.createdAt.toDate()), 0) / modeOrders.length
        : 0;
      
      return {
        mode,
        ackSeconds: Math.round(avgAck),
        deliverMinutes: Math.round(avgDeliver)
      };
    });

    // 4. Revenue By Mode
    const revenueByMode = modes.map(mode => {
        const modeOrders = orders.filter(o => o.menuType === mode && o.status === 'Delivered');
        const revenue = modeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        return { mode, revenue };
    });

    return { dailyRevenue, topItems, fulfillmentEfficiency, revenueByMode, modes };
  }, [orders, seller]);

  const onSaveStaff = async (data: StaffFormData) => {
    if (!firestore || !sellerId) return;
    setIsProcessingSave(true);
    const id = editingStaff?.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(firestore, 'sellers', sellerId, 'staff', id), { ...data, id, createdAt: editingStaff?.createdAt || serverTimestamp() }, { merge: true });
    setIsStaffFormOpen(false); setIsProcessingSave(false); toast({ title: editingStaff ? "Staff Updated" : "Staff Added" });
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "orders", label: "Fulfillment Log", icon: ClipboardCheck },
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
        <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen} />
      ))}
    </nav>
  );

  if (isUserLoading || isSellerLoading) return <div className="flex flex-col items-center justify-center h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  const deliveredToday = orders?.filter(o => o.status === 'Delivered' && o.createdAt && isToday(o.createdAt.toDate())) || [];
  const netRevenueToday = deliveredToday.reduce((sum, o) => sum + (o.total || 0), 0);

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
                    <KPICard label="Net Revenue" value={`$${netRevenueToday.toFixed(2)}`} sub="Excluding Platform Fees" icon={DollarSign} colorClass="bg-green-500" />
                    <KPICard label="Active Tickets" value={orders?.filter(o => ['Placed', 'Preparing', 'Out for Delivery'].includes(o.status)).length || 0} sub="Pending Delivery" icon={Clock} colorClass="bg-primary" />
                    <KPICard label="Today's Volume" value={orders?.filter(o => o.createdAt && isToday(o.createdAt.toDate())).length || 0} sub="Orders Processed" icon={ShoppingBag} colorClass="bg-indigo-600" />
                    <KPICard label="Staff Active" value={staffList?.filter(s => s.activeMode).length || 0} sub="On-Shift (Today)" icon={Users} colorClass="bg-slate-700" />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Summary Item Chart stays on dashboard */}
                    <Card className="lg:col-span-2 border-2 shadow-sm">
                      <CardHeader className="bg-slate-50 border-b py-4">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Top Selling Items</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.topItems} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} width={120} />
                            <ChartTooltip />
                            <Bar dataKey="volume" fill="#213147" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm bg-[#213147] text-white">
                      <CardHeader className="border-b border-white/5 py-6">
                        <div className="bg-primary/20 p-2 rounded-xl w-fit mb-3"><Activity className="h-5 w-5 text-primary" /></div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Operational Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-8 space-y-8">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Today's Avg Delivery</p>
                          <div className="flex items-end gap-2">
                             <p className="text-4xl font-black font-headline tracking-tighter">14.2</p>
                             <p className="text-xs font-bold uppercase text-white/60 mb-1.5">Minutes</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Staff Utilization</p>
                          <div className="flex items-end gap-2">
                             <p className="text-4xl font-black font-headline tracking-tighter">88%</p>
                             <div className="h-3 w-3 rounded-full bg-green-500 mb-2.5 animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeNav === 'analytics' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   {/* Stacked Revenue Chart */}
                   <Card className="border-2 shadow-sm">
                      <CardHeader className="bg-[#213147] text-white py-5 border-b">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <CardTitle className="text-xs font-black uppercase tracking-widest">Daily Stacked Revenue</CardTitle>
                            <p className="text-[8px] text-white/40 uppercase tracking-widest mt-1">Revenue performance segmented by service channel</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-8 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `$${v}`} />
                            <ChartTooltip formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                            <Legend iconType="circle" />
                            {analyticsData.modes.map((mode, i) => (
                              <Bar 
                                key={mode} 
                                dataKey={mode} 
                                stackId="a" 
                                fill={getModeColor(mode)} 
                                radius={[0, 0, 0, 0]} 
                                barSize={40}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                   </Card>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Total Revenue by Mode</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.revenueByMode}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="mode" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `$${v}`} />
                              <ChartTooltip formatter={(v: number) => [`$${v.toFixed(2)}`]} />
                              <Bar dataKey="revenue" fill="#E50000" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="border-2 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b py-4">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Fulfillment Efficiency</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData.fulfillmentEfficiency}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="mode" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                              <ChartTooltip />
                              <Legend />
                              <Bar dataKey="ackSeconds" name="Ack (Sec)" fill="#E50000" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="deliverMinutes" name="Deliver (Min)" fill="#213147" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                   </div>
                </div>
              )}

              {activeNav === 'orders' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase text-[#213147]">Fulfillment Log</h2>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search ticket or name..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} className="pl-10 h-10 border-2 rounded-xl" />
                    </div>
                  </div>
                  <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Ticket</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Customer</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Mode</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(orders || []).filter(o => o.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase())).slice(0, 50).map(o => (
                          <TableRow key={o.id} className="group hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-8 font-mono font-black text-primary text-xs">#{getNumericOrderId(o.id)}</TableCell>
                            <TableCell><div className="flex flex-col"><span className="font-bold text-sm">{o.customerName}</span><span className="text-[9px] uppercase text-muted-foreground">{o.createdAt ? format(o.createdAt.toDate(), 'MMM d, h:mm a') : ''}</span></div></TableCell>
                            <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100 border-slate-200">{o.menuType}</Badge></TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "text-[8px] font-black uppercase border-0",
                                o.status === 'Delivered' ? "bg-green-500" : o.status === 'Cancelled' ? "bg-red-500" : "bg-primary animate-pulse"
                              )}>{o.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right px-8 font-mono font-black text-sm">${o.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                    <FormItem className="text-left">
                      <FormLabel className="text-[10px] font-black uppercase">Authorization Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="Staff">Delivery Staff</SelectItem><SelectItem value="Manager">Venue Manager</SelectItem></SelectContent>
                      </Select>
                    </FormItem>
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
