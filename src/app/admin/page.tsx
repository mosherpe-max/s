'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Store, 
  Plus,
  Loader2,
  Settings2,
  MapPin,
  Stethoscope,
  Zap,
  LogOut,
  UserPlus,
  ShieldCheck,
  Search,
  Users,
  Mail,
  Save,
  LayoutDashboard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Activity,
  AlertTriangle,
  Briefcase,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { Seller, PlatformConfig, Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, isThisMonth, subDays, startOfMonth } from 'date-fns';

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary/10 text-white border-l-4 border-primary" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && (
        <span className={cn("text-xs font-bold uppercase tracking-widest", active ? "text-white" : "")}>
          {label}
        </span>
      )}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass, trend }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string, trend?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-2 pt-5">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2"><Icon className="h-3 w-3" /> {label}</span>
          {trend && <span className="text-green-500 font-bold flex items-center gap-0.5">{trend} <ArrowUpRight className="h-2 w-2" /></span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5">
        <div className="text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

// --- MAIN PAGE ---

export default function PlatformAdminPage() {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Navigation & Layout State
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Functional State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const [managerEmail, setManagerEmail] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [newVenue, setNewVenue] = useState<Partial<Seller>>({
    courseName: '',
    type: 'Public Golf Course',
    contactEmail: '',
    serviceFee: 1.50,
    taxRate: 6.0,
    status: 'Active',
    menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out']
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data Fetching
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  useEffect(() => {
    if (config?.supportEmail) {
      setConfigEmail(config.supportEmail);
    }
  }, [config]);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), limit(100));
  }, [firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // For platform view, we fetch recent global orders to compute stats
    return query(collection(firestore, 'orders'), limit(500), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  // Platform Metrics Calculation
  const metrics = useMemo(() => {
    if (!sellers || !orders) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = subDays(now, 30);

    const activeSellers = sellers.filter(s => s.status === 'Active');
    const golfVenues = activeSellers.filter(s => s.type.includes('Golf'));
    const bowlingVenues = activeSellers.filter(s => s.type.includes('Bowling'));
    const otherVenues = activeSellers.length - golfVenues.length - bowlingVenues.length;

    const mtdOrders = orders.filter(o => o.createdAt?.toDate() >= monthStart);
    const todayOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const trailing30Orders = orders.filter(o => o.createdAt?.toDate() >= thirtyDaysAgo);

    const mtdGMV = mtdOrders.reduce((acc, o) => acc + o.total, 0);
    const trailing30GMV = trailing30Orders.reduce((acc, o) => acc + o.total, 0);
    const mtdFees = mtdOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);

    const daysInMonth = 30; // Approximation
    const currentDayOfMonth = now.getDate();
    const projectedFees = (mtdFees / currentDayOfMonth) * daysInMonth;

    return {
      venueCounts: { total: activeSellers.length, golf: golfVenues.length, bowling: bowlingVenues.length, other: otherVenues },
      gmv: { mtd: mtdGMV, trailing30: trailing30GMV },
      orders: { today: todayOrders.length, mtd: mtdOrders.length, allTime: orders.length },
      fees: { mtd: mtdFees, projected: projectedFees }
    };
  }, [sellers, orders]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Authorized Session Terminated" });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const handleRunHealthCheck = async () => {
    if (!firebaseApp) return;
    setIsHealthChecking(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const checkFn = httpsCallable(functions, 'testFunction');
      const result = await checkFn();
      setHealthStatus(result.data);
      toast({ title: "Infrastructure Verified" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Health Check Failed", description: error.message });
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!firestore || !configEmail) return;
    setIsSavingConfig(true);
    try {
      await setDoc(doc(firestore, 'platform', 'config'), {
        supportEmail: configEmail,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Configuration Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleProvisionVenue = async () => {
    if (!firestore || !newVenue.courseName || !newVenue.contactEmail) return;
    setIsProcessing(true);
    
    try {
      const venueId = newVenue.courseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const venueRef = doc(firestore, 'sellers', venueId);
      
      const payload = {
        ...newVenue,
        id: venueId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        latitude: 42.7748,
        longitude: -83.2139,
        streetAddress: '123 Venue Way',
        city: 'Metropolis',
        state: 'MI',
        zip: '48301',
        contactName: 'Venue Manager',
        contactPhone: '555-0100',
        orderThresholds: {
          'Beverage Cart': { warning: 7, max: 10 },
          'Clubhouse': { warning: 7, max: 10 },
          'Lane Delivery': { warning: 7, max: 10 }
        }
      };

      await setDoc(venueRef, payload);
      toast({ title: "Establishment Profile Provisioned" });
      setIsProvisionOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!firestore || !selectedVenue || !managerEmail) return;
    setIsProcessing(true);
    try {
      const cleanEmail = managerEmail.toLowerCase().trim();
      await setDoc(doc(firestore, 'roles_seller_admin', cleanEmail), {
        sellerId: selectedVenue.id,
        courseName: selectedVenue.courseName,
        assignedAt: serverTimestamp()
      }, { merge: true });

      toast({ 
        title: "Authorized Manager Assigned", 
        description: `${cleanEmail} can now manage ${selectedVenue.courseName}.` 
      });
      setIsAccessManagerOpen(false);
      setManagerEmail('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Assignment Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "venues", label: "Venue Registry", icon: Store },
    { id: "sales", label: "Sales Pipeline", icon: Briefcase, href: "/sales" },
    { id: "config", label: "Platform Config", icon: Settings2 },
    { id: "health", label: "System Health", icon: Stethoscope },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={cn(
        "bg-[#213147] flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-white/5">
          <StylizedKoopLogo size={sidebarOpen ? "md" : "sm"} />
          {sidebarOpen && <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 ml-1">Platform Control</p>}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            item.href ? (
              <Link key={item.id} href={item.href} className="block">
                <NavButton 
                  id={item.id} 
                  label={item.label} 
                  icon={item.icon} 
                  active={false} 
                  onClick={() => {}}
                  sidebarOpen={sidebarOpen}
                />
              </Link>
            ) : (
              <NavButton 
                key={item.id} 
                id={item.id} 
                label={item.label} 
                icon={item.icon} 
                active={activeNav === item.id} 
                onClick={setActiveNav}
                sidebarOpen={sidebarOpen}
              />
            )
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 p-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black font-headline uppercase tracking-tight text-[#213147]">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary h-6">
              Global Admin
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleRunHealthCheck}
              disabled={isHealthChecking}
              className="h-9 font-black uppercase tracking-widest text-[9px] gap-2 border-2"
            >
              {isHealthChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3 text-amber-500" />}
              Quick Check
            </Button>
            <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-10 pb-20">

            {/* DASHBOARD SECTION */}
            {activeNav === 'dashboard' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                {/* Primary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard 
                    label="Active Venues" 
                    value={metrics?.venueCounts.total || 0} 
                    sub={`${metrics?.venueCounts.golf} Golf • ${metrics?.venueCounts.bowling} Bowling`} 
                    icon={Store} 
                    colorClass="bg-indigo-600"
                    trend="+2 new this week"
                  />
                  <KPICard 
                    label="Gross Platform GMV" 
                    value={`$${metrics?.gmv.mtd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    sub={`Trailing 30: $${metrics?.gmv.trailing30.toLocaleString()}`} 
                    icon={DollarSign} 
                    colorClass="bg-green-600"
                    trend="+12%"
                  />
                  <KPICard 
                    label="Orders Processed" 
                    value={metrics?.orders.mtd || 0} 
                    sub={`${metrics?.orders.today} today • ${metrics?.orders.allTime} all-time`} 
                    icon={ShoppingBag} 
                    colorClass="bg-primary"
                    trend="+8%"
                  />
                  <KPICard 
                    label="Convenience Fees" 
                    value={`$${metrics?.fees.mtd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    sub={`Projected: $${metrics?.fees.projected.toLocaleString()}`} 
                    icon={BarChart3} 
                    colorClass="bg-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* System Alerts */}
                  <Card className="lg:col-span-2 border-2 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Platform Integrity Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        <div className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase">Pending Stripe Onboarding</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">3 venues require manual setup link</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest">Resolve</Button>
                        </div>
                        <div className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                              <Activity className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase">Inactive Venues</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">2 venues with 0 orders in 48 hours</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest">Audit</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Growth Activity */}
                  <Card className="border-2 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Onboarding Queue
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="bg-primary/5 rounded-[2rem] p-8 border-2 border-dashed border-primary/20">
                        <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">New Venue Lead</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">5 pending applications from sales rep pipeline</p>
                      <Button onClick={() => setIsProvisionOpen(true)} className="w-full h-11 bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest">Provision New Venue</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* VENUE REGISTRY SECTION */}
            {activeNav === 'venues' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search registry..." className="pl-10 h-10 border-2 font-bold" />
                  </div>
                  <Button onClick={() => setIsProvisionOpen(true)} className="bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2">
                    <Plus className="h-4 w-4" /> Provision Venue
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {isSellersLoading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
                  ) : (
                    sellers?.map((venue) => (
                      <Card key={venue.id} className="shadow-sm hover:border-[#213147]/30 transition-all border-2 rounded-2xl overflow-hidden group bg-white">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                            <div className="flex items-center gap-5">
                              <div className="bg-muted p-4 rounded-2xl text-[#213147] group-hover:bg-[#213147] group-hover:text-white transition-colors">
                                <Store className="h-7 w-7" />
                              </div>
                              <div>
                                <h3 className="font-black text-lg uppercase tracking-tight text-[#213147]">{venue.courseName}</h3>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {venue.city}, {venue.state}
                                  </p>
                                  <span className="text-muted-foreground/30">•</span>
                                  <Badge variant="secondary" className="text-[8px] font-black uppercase">{venue.type}</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsAccessManagerOpen(true); }} className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                                <UserPlus className="h-3.5 w-3.5 mr-2 text-indigo-600" /> Authorize Manager
                              </Button>
                              <Button variant="outline" size="sm" asChild className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                                <Link href={`/sellers/${venue.id}`}>
                                  <Settings2 className="h-3.5 w-3.5 mr-2" /> Manage Venue
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PLATFORM CONFIG SECTION */}
            {activeNav === 'config' && (
              <div className="max-w-2xl animate-in fade-in duration-500">
                <Card className="border-2 shadow-sm">
                  <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Global Configuration</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold">Settings applied to all support and onboarding workflows.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support & Onboarding Email</Label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="support@kooporders.com" 
                            className="pl-10 h-11 border-2 font-bold"
                            value={configEmail}
                            onChange={(e) => setConfigEmail(e.target.value)}
                          />
                        </div>
                        <Button 
                          onClick={handleSaveConfig} 
                          disabled={isSavingConfig}
                          className="h-11 px-6 font-black uppercase tracking-widest text-[10px] gap-2"
                        >
                          {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save Config
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SYSTEM HEALTH SECTION */}
            {activeNav === 'health' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <Card className="border-2 shadow-sm">
                  <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest">Infrastructure Status</CardTitle>
                      <CardDescription className="text-[10px] uppercase font-bold">Live connectivity and server response logs.</CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleRunHealthCheck}
                      disabled={isHealthChecking}
                      className="h-9 font-black uppercase tracking-widest text-[9px] border-2"
                    >
                      {isHealthChecking ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Stethoscope className="mr-2 h-3 w-3" />}
                      Refresh Link
                    </Button>
                  </CardHeader>
                  <CardContent className="p-8">
                    {healthStatus ? (
                      <div className="space-y-6">
                        <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem] flex items-center gap-6">
                          <div className="bg-indigo-600 p-4 rounded-2xl text-white">
                            <Zap className="h-8 w-8" />
                          </div>
                          <div>
                            <p className="text-lg font-black uppercase tracking-tight text-indigo-700">Platform Operational</p>
                            <p className="text-xs font-mono font-bold text-indigo-400">Project: {healthStatus.project}</p>
                          </div>
                          <Badge className="ml-auto bg-indigo-600">Stable</Badge>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-[300px]">
                          <pre className="text-green-400 font-mono text-[10px] leading-relaxed">
                            {JSON.stringify(healthStatus, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center space-y-4">
                        <Globe className="h-12 w-12 text-slate-200 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ready for link initialization</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </ScrollArea>
      </main>

      {/* DIALOGS - REUSED FROM PREVIOUS VERSION */}
      
      {/* ACCESS MANAGER DIALOG */}
      <Dialog open={isAccessManagerOpen} onOpenChange={setIsAccessManagerOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem]">
          <DialogHeader>
            <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Authorize Venue Manager</DialogTitle>
            <DialogDescription className="text-xs font-medium">Assign a manager identity to {selectedVenue?.courseName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized Email Address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="manager@venue.com" 
                  className="pl-10 h-11 border-2 font-bold"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleGrantAccess} 
              disabled={isProcessing || !managerEmail} 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest"
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />} Link Authorized Identity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROVISIONING DIALOG */}
      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Provision Establishment</DialogTitle>
            <DialogDescription>Initialize a new operational profile in the registry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Venue Name</Label>
              <Input placeholder="Oak Ridge Country Club" value={newVenue.courseName} onChange={(e) => setNewVenue(prev => ({ ...prev, courseName: e.target.value }))} className="font-bold border-2" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Contact Email</Label>
              <Input type="email" placeholder="contact@oakridge.com" value={newVenue.contactEmail} onChange={(e) => setNewVenue(prev => ({ ...prev, contactEmail: e.target.value }))} className="font-bold border-2" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleProvisionVenue} disabled={isProcessing || !newVenue.courseName || !newVenue.contactEmail} className="w-full h-12 bg-[#213147] font-black uppercase tracking-widest">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Store className="h-5 w-5 mr-2" />} Finalize Establishment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
