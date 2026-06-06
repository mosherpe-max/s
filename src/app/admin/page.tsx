'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  Store, 
  Plus,
  Loader2,
  Settings2,
  MapPin,
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
  Globe,
  CreditCard,
  ClipboardList,
  Layers,
  Flag,
  QrCode,
  Bell,
  UserCircle,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  MoreVertical,
  ExternalLink,
  Send,
  Link as LinkIcon,
  PanelLeftClose,
  PanelLeft,
  HeartPulse
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { Seller, PlatformConfig, Order, SalesRepRole, Venue } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, startOfMonth, subDays } from 'date-fns';

// --- UI COMPONENTS ---

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary/10 text-white border-l-4 border-primary" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && (
        <span className={cn("text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300", active ? "text-white" : "")}>
          {label}
        </span>
      )}
    </button>
  );
}

function KPICard({ label, value, sub, icon: Icon, colorClass, trend }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string, trend?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
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
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [selectedVenueRegistry, setSelectedVenueRegistry] = useState<Venue | null>(null);
  const [isVenueDetailOpen, setIsVenueDetailOpen] = useState(false);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Stripe Control Panel State
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [manualOnboardingLink, setManualOnboardingLink] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data Fetching
  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), limit(100));
  }, [firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), limit(500), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const repsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'roles_sales_rep'), limit(50));
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: reps } = useCollection<SalesRepRole>(repsQuery);

  // Sync Stripe Data when venue is selected
  useEffect(() => {
    const fetchRegistry = async () => {
      if (!firestore || !selectedVenue) return;
      const venueDoc = await getDoc(doc(firestore, 'venues', selectedVenue.id));
      if (venueDoc.exists()) {
        const data = venueDoc.data() as Venue;
        setSelectedVenueRegistry(data);
        setStripeAccountId(data.stripeAccountId || '');
        setPayoutsEnabled(data.payoutsEnabled || false);
        setManualOnboardingLink((data as any).stripeOnboardingLink || '');
      } else {
        setSelectedVenueRegistry(null);
        setStripeAccountId('');
        setPayoutsEnabled(false);
        setManualOnboardingLink('');
      }
      setVerificationResult(null);
    };
    fetchRegistry();
  }, [selectedVenue, firestore]);

  // Platform Metrics Calculation
  const metrics = useMemo(() => {
    if (!sellers || !orders) return null;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = subDays(now, 30);

    const activeSellers = sellers.filter(s => s.status === 'Active');
    const golfVenues = activeSellers.filter(s => s.type.includes('Golf'));
    const bowlingVenues = activeSellers.filter(s => s.type.includes('Bowling'));

    const mtdOrders = orders.filter(o => o.createdAt?.toDate() >= monthStart);
    const todayOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const trailing30Orders = orders.filter(o => o.createdAt?.toDate() >= thirtyDaysAgo);

    const mtdGMV = mtdOrders.reduce((acc, o) => acc + o.total, 0);
    const trailing30GMV = trailing30Orders.reduce((acc, o) => acc + o.total, 0);
    const mtdFees = mtdOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);

    const daysInMonth = 30;
    const currentDayOfMonth = now.getDate() || 1;
    const projectedFees = (mtdFees / currentDayOfMonth) * daysInMonth;

    return {
      venueCounts: { total: activeSellers.length, golf: golfVenues.length, bowling: bowlingVenues.length, other: activeSellers.length - golfVenues.length - bowlingVenues.length },
      gmv: { mtd: mtdGMV, trailing30: trailing30GMV },
      orders: { today: todayOrders.length, mtd: mtdOrders.length, allTime: orders.length },
      fees: { mtd: mtdFees, projected: projectedFees }
    };
  }, [sellers, orders]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const handleToggleVenueStatus = async (venue: Seller) => {
    if (!firestore) return;
    const newStatus = venue.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateDoc(doc(firestore, 'sellers', venue.id), { status: newStatus });
      toast({ title: "Status Updated", description: `${venue.courseName} is now ${newStatus}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleSaveVenueStripeData = async () => {
    if (!firestore || !selectedVenue) return;
    setIsProcessingStripe(true);
    try {
      const venueRef = doc(firestore, 'venues', selectedVenue.id);
      await setDoc(venueRef, {
        venueId: selectedVenue.id,
        name: selectedVenue.courseName,
        stripeAccountId: stripeAccountId.trim(),
        payoutsEnabled: payoutsEnabled,
        stripeOnboardingLink: manualOnboardingLink.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ 
        title: "Stripe Express Data Saved", 
        description: `Stripe configuration for ${selectedVenue.courseName} updated.` 
      });
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Registry Update Failed", 
        description: e.message 
      });
    } finally {
      setIsProcessingStripe(false);
    }
  };

  const handleVerifyStripeConnection = async () => {
    if (!firebaseApp || !selectedVenue) return;
    setIsVerifyingStripe(true);
    setVerificationResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const verify = httpsCallable(functions, 'verifyVenueConnection');
      const result = await verify({ venueId: selectedVenue.id });
      setVerificationResult(result.data);
      toast({ 
        title: "Health Check Complete", 
        description: `Stripe identity: ${(result.data as any).businessName || 'Verified'}` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const handleSendOnboardingLink = () => {
    if (!manualOnboardingLink || !selectedVenue?.contactEmail) {
      toast({ 
        variant: "destructive", 
        title: "Missing Information", 
        description: "Please ensure a valid URL and contact email are present." 
      });
      return;
    }
    
    const subject = encodeURIComponent(`Action Required: Complete your Stripe Setup for ${selectedVenue.courseName}`);
    const body = encodeURIComponent(
      `Hello ${selectedVenue.contactName || 'Manager'},\n\n` +
      `Your venue profile for ${selectedVenue.courseName} is ready for payment setup.\n\n` +
      `Please click the link below to complete your Stripe Express onboarding and begin receiving payouts:\n\n` +
      `${manualOnboardingLink}\n\n` +
      `If you have any questions, please contact Koop Support.\n\n` +
      `Thank you,\nThe Koop Team`
    );
    
    window.location.href = `mailto:${selectedVenue.contactEmail}?subject=${subject}&body=${body}`;

    toast({ 
      title: "Email Client Opened", 
      description: `Drafting onboarding notification for ${selectedVenue.contactEmail}.` 
    });
  };

  if (!isMounted) return null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
    { id: "venues", label: "Venue Management", icon: Store },
    { id: "finance", label: "Financial & Billing", icon: CreditCard },
    { id: "orders", label: "Global Order Feed", icon: ClipboardList },
    { id: "reps", label: "Sales Rep Hub", icon: Briefcase },
    { id: "system", label: "System Control", icon: Settings2 },
    { id: "patrons", label: "Patron Accounts", icon: UserCircle, disabled: true },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={cn(
        "bg-[#213147] flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <StylizedKoopLogo size={sidebarOpen ? "md" : "sm"} />
          {sidebarOpen && (
             <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 ml-1 animate-in fade-in duration-500">Platform Admin</p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.id} className={item.disabled ? "opacity-40 cursor-not-allowed" : ""}>
              <NavButton 
                id={item.id} 
                label={item.label} 
                icon={item.icon} 
                active={activeNav === item.id} 
                onClick={item.disabled ? () => {} : setActiveNav}
                sidebarOpen={sidebarOpen}
              />
            </div>
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
              Platform Master Access
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Production Mode</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-10 pb-20">

            {/* DASHBOARD SECTION */}
            {activeNav === 'dashboard' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex overflow-x-auto gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:pb-0 md:mx-0 md:px-0">
                  <div className="min-w-[240px] flex-1">
                    <KPICard 
                      label="Active Partners" 
                      value={metrics?.venueCounts.total || 0} 
                      sub={`${metrics?.venueCounts.golf} Golf • ${metrics?.venueCounts.bowling} Bowling`} 
                      icon={Store} 
                      colorClass="bg-indigo-600"
                      trend="+2"
                    />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard 
                      label="Platform GMV" 
                      value={`$${metrics?.gmv.mtd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                      sub={`30D Vol: $${metrics?.gmv.trailing30.toLocaleString()}`} 
                      icon={DollarSign} 
                      colorClass="bg-green-600"
                      trend="+12%"
                    />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard 
                      label="Orders Processed" 
                      value={metrics?.orders.mtd || 0} 
                      sub={`${metrics?.orders.today} today • ${metrics?.orders.allTime} total`} 
                      icon={ShoppingBag} 
                      colorClass="bg-primary"
                      trend="+8%"
                    />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard 
                      label="Fee Revenue (MTD)" 
                      value={`$${metrics?.fees.mtd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                      sub={`Projected: $${metrics?.fees.projected.toLocaleString()}`} 
                      icon={BarChart3} 
                      colorClass="bg-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* System Alerts */}
                  <Card className="lg:col-span-2 border-2 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" /> Platform Integrity Monitor
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
                              <p className="text-xs font-bold uppercase">Stripe Express Onboarding Pending</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">3 venues awaiting setup links</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest" onClick={() => setActiveNav('venues')}>Manage</Button>
                        </div>
                        <div className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase">Launch Queue</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">5 venues in configuration phase</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest">Audit</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Growth Pipeline */}
                  <Card className="border-2 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Growth Velocity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="bg-primary/5 rounded-[2rem] p-8 border-2 border-dashed border-primary/20">
                        <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">New Venue Lead</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">12 prospects in sales rep pipeline</p>
                      <Button onClick={() => setActiveNav('venues')} className="w-full h-11 bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest">Provision New Venue</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* VENUE MANAGEMENT SECTION */}
            {activeNav === 'venues' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border-2 shadow-sm gap-4">
                  <div className="flex-1 w-full max-w-md relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search registry by name, rep, or ID..." 
                      className="pl-10 h-10 border-2 font-bold" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2">
                      <Filter className="h-4 w-4" /> Filters
                    </Button>
                    <Button className="flex-1 md:flex-none bg-[#213147] hover:bg-black font-black uppercase text-[10px] tracking-widest h-10 px-6 gap-2">
                      <Plus className="h-4 w-4" /> Provision Venue
                    </Button>
                  </div>
                </div>

                <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto no-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Establishment</TableHead>
                        <TableHead className="text-[10px) font-black uppercase">Type / Rep</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Fee Tier</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isSellersLoading ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                        ))
                      ) : (
                        sellers?.filter(s => s.courseName.toLowerCase().includes(searchTerm.toLowerCase())).map((venue) => (
                          <TableRow key={venue.id} className="group hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-black text-sm uppercase text-[#213147]">{venue.courseName}</span>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> {venue.city}, {venue.state}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <Badge variant="secondary" className="w-fit text-[8px] font-black uppercase">{venue.type}</Badge>
                                <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">Rep: {venue.ownerId || 'Unassigned'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-[#213147]">${venue.serviceFee?.toFixed(2)} Conv.</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Base: $0 / Mo</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("text-[9px] font-black uppercase px-2", venue.status === 'Active' ? 'bg-green-600' : 'bg-slate-300')}>
                                {venue.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsVenueDetailOpen(true); }} className="h-8 text-[9px] font-black uppercase tracking-widest rounded-lg border-2">
                                  Profile
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 border-2 shadow-xl">
                                    <DropdownMenuLabel className="text-[10px] font-black uppercase">Quick Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleToggleVenueStatus(venue)} className="text-xs font-bold uppercase">
                                      {venue.status === 'Active' ? 'Suspend Service' : 'Activate Service'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs font-bold uppercase" asChild>
                                      <Link href={`/sellers/${venue.id}`}>Impersonate Admin</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-xs font-bold uppercase text-destructive">Deactivate Permanently</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* FINANCIAL SECTION */}
            {activeNav === 'finance' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex overflow-x-auto gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-3 md:pb-0 md:mx-0 md:px-0">
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="MTD Fees Owed" value="$2,450.50" sub="Total drawn: $1,900.00" icon={CreditCard} colorClass="bg-indigo-600" />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="Billing Cycle" value="Cycle-15" sub="Next draw: Feb 15, 2026" icon={Calendar} colorClass="bg-[#213147]" />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="Past Due Venues" value="2" sub="Requires manual follow-up" icon={AlertTriangle} colorClass="bg-red-600" />
                  </div>
                </div>

                <Card className="border-2 shadow-sm overflow-hidden">
                  <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-widest">ACH Draw Schedule</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase">Automated billing status per establishment.</CardDescription>
                    </div>
                    <Button variant="outline" className="w-full md:w-auto h-9 font-black uppercase text-[10px] tracking-widest gap-2 border-2">
                      <Download className="h-3.5 w-3.5" /> Export Statements
                    </Button>
                  </CardHeader>
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Cycle Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">MTD Fees</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Ledger</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellers?.map((venue) => (
                          <TableRow key={venue.id}>
                            <TableCell className="font-black text-xs uppercase text-[#213147]">{venue.courseName}</TableCell>
                            <TableCell className="text-xs font-bold uppercase">15th / Monthly</TableCell>
                            <TableCell className="text-xs font-black text-indigo-600">$142.50</TableCell>
                            <TableCell>
                              <Badge className="bg-green-600 text-[8px] font-black uppercase">Invoiced</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600"><FileText className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* ORDERS SECTION */}
            {activeNav === 'orders' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border-2 shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-primary text-[10px] font-black uppercase tracking-widest h-8 px-4">Live Order Stream</Badge>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase hidden sm:block">Monitoring transactions across all venues</p>
                  </div>
                  <Button variant="outline" className="w-full md:w-auto h-9 px-4 text-[10px] font-black uppercase tracking-widest border-2">
                    Troubleshooting Mode
                  </Button>
                </div>

                <Card className="border-2 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Timestamp</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Patron</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Total</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders?.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-mono text-[10px] text-muted-foreground">
                              {order.createdAt ? format(order.createdAt.toDate(), 'HH:mm:ss') : '--'}
                            </TableCell>
                            <TableCell className="font-black text-[10px] uppercase text-indigo-600">
                              {sellers?.find(s => s.id === order.sellerId)?.courseName || 'Venue'}
                            </TableCell>
                            <TableCell className="font-bold text-xs uppercase">{order.customerName}</TableCell>
                            <TableCell className="text-right font-black text-xs text-[#213147]">${order.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-[8px] font-black uppercase">{order.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* SALES REPS SECTION */}
            {activeNav === 'reps' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex overflow-x-auto gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-3 md:pb-0 md:mx-0 md:px-0">
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="Sales Professionals" value={reps?.length || 0} sub="Authorized reps" icon={Users} colorClass="bg-indigo-600" />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="Pipeline Value" value="$42,000" sub="Estimated launch fees" icon={TrendingUp} colorClass="bg-primary" />
                  </div>
                  <div className="min-w-[240px] flex-1">
                    <KPICard label="Signed This Month" value="4" sub="Goal: 6 venues" icon={CheckCircle2} colorClass="bg-green-600" />
                  </div>
                </div>

                <Card className="border-2 shadow-sm overflow-hidden">
                  <CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Rep Roster & Territory</CardTitle>
                    <Button className="w-full md:w-auto bg-[#213147] h-9 font-black uppercase text-[10px] tracking-widest gap-2">
                      <UserPlus className="h-3.5 w-3.5" /> Authorize Rep
                    </Button>
                  </CardHeader>
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Professional</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Territory</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Pipeline</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Ledger</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reps?.map((rep) => (
                          <TableRow key={rep.email}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-black text-xs uppercase text-[#213147]">{rep.email.split('@')[0]}</span>
                                <span className="text-[10px] text-muted-foreground">{rep.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-bold uppercase">Southwest MI</TableCell>
                            <TableCell className="text-xs font-black text-primary">3 Signed / 5 Leads</TableCell>
                            <TableCell>
                              <Badge className="bg-green-600 text-[8px] font-black uppercase">Active</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* SYSTEM SECTION */}
            {activeNav === 'system' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <Tabs defaultValue="flags" className="space-y-6">
                  <TabsList className="bg-white border-2 p-1 h-12 rounded-xl w-full justify-start overflow-x-auto no-scrollbar flex-nowrap">
                    <TabsTrigger value="flags" className="text-[10px] font-black uppercase tracking-widest px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg whitespace-nowrap">Feature Flags</TabsTrigger>
                    <TabsTrigger value="templates" className="text-[10px] font-black uppercase tracking-widest px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg whitespace-nowrap">Menu Templates</TabsTrigger>
                    <TabsTrigger value="assets" className="text-[10px] font-black uppercase tracking-widest px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg whitespace-nowrap">QR Generator</TabsTrigger>
                    <TabsTrigger value="config" className="text-[10px] font-black uppercase tracking-widest px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg whitespace-nowrap">Platform Config</TabsTrigger>
                  </TabsList>

                  <TabsContent value="flags" className="space-y-6">
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Global Capability Toggles</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase">Enable or disable features across the entire platform ecosystem.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 divide-y space-y-4">
                        {[
                          { id: 'f1', label: 'In-App Tips', d: 'Allow patrons to select custom gratuity amounts during checkout.' },
                          { id: 'f2', label: 'Live GPS Tracking', d: 'Display driver real-time location to patrons.' },
                          { id: 'f3', label: 'Anonymous Checkout', d: 'Allow ordering without email verification.' },
                          { id: 'f4', label: 'Stripe Instant Payouts', d: 'Allow venues to draw revenue immediately after fulfillment.' }
                        ].map((flag) => (
                          <div key={flag.id} className="flex items-center justify-between py-4 first:pt-0">
                            <div className="space-y-1">
                              <p className="text-sm font-black uppercase text-[#213147]">{flag.label}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold max-w-md">{flag.d}</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="templates" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {['Public Golf Course', 'Private Club', 'Bowling Alley'].map(tpl => (
                        <Card key={tpl} className="border-2 shadow-sm hover:border-primary transition-colors cursor-pointer group">
                          <CardHeader>
                            <Layers className="h-8 w-8 text-primary mb-2" />
                            <CardTitle className="text-sm font-black uppercase">{tpl} Base</CardTitle>
                            <CardDescription className="text-[10px] uppercase">Standard category and item defaults.</CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-0">
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform">Use Template →</span>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="assets" className="space-y-6">
                    <Card className="border-2 shadow-sm flex flex-col items-center justify-center p-12 text-center bg-indigo-50/30">
                       <QrCode className="h-16 w-16 text-indigo-600 mb-4" />
                       <h3 className="font-headline font-black text-xl uppercase text-[#213147]">QR Asset Manager</h3>
                       <p className="text-xs font-bold text-muted-foreground uppercase max-w-sm mb-6">Bulk generate white-labeled QR codes for course cart placards or laneside signage.</p>
                       <Button className="bg-[#213147] h-12 px-8 font-black uppercase text-[10px] tracking-widest">Launch Generator</Button>
                    </Card>
                  </TabsContent>

                  <TabsContent value="config" className="space-y-6">
                    <Card className="border-2 shadow-sm max-w-2xl">
                      <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Global Support Config</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 space-y-6">
                         <div className="grid gap-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support & Onboarding Email</Label>
                           <div className="flex flex-col sm:flex-row gap-3">
                             <div className="relative flex-1">
                               <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                               <Input defaultValue="support@kooporders.com" className="pl-10 h-11 border-2 font-bold" />
                             </div>
                             <Button className="h-11 px-6 font-black uppercase tracking-widest text-[10px]">Save Global</Button>
                           </div>
                         </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* PATRONS PLACEHOLDER */}
            {activeNav === 'patrons' && (
              <div className="py-40 text-center animate-in fade-in duration-500">
                <UserCircle className="h-20 w-20 text-slate-200 mx-auto mb-4" />
                <h3 className="font-headline font-black text-2xl uppercase text-slate-300">Patron Accounts</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Reserved for Future Patron Identity Design</p>
              </div>
            )}

          </div>
        </ScrollArea>
      </main>

      {/* VENUE PROFILE DIALOG */}
      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 sm:p-10 space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                    <Store className="h-8 w-8" />
                  </div>
                  <div>
                    <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147] text-2xl">{selectedVenue?.courseName}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest">{selectedVenue?.type}</Badge>
                      <Badge className="bg-green-600 text-[9px] uppercase font-black tracking-widest">Founding Partner</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="bg-slate-50 border p-1 h-10 rounded-xl mb-6 w-full justify-start overflow-x-auto no-scrollbar flex-nowrap">
                  <TabsTrigger value="details" className="text-[10px] font-black uppercase tracking-widest px-4 h-full whitespace-nowrap">Establishment Details</TabsTrigger>
                  <TabsTrigger value="billing" className="text-[10px] font-black uppercase tracking-widest px-4 h-full whitespace-nowrap">Fee & Billing Config</TabsTrigger>
                  <TabsTrigger value="ops" className="text-[10px] font-black uppercase tracking-widest px-4 h-full whitespace-nowrap">Operational Status</TabsTrigger>
                  <TabsTrigger value="stripe" className="text-[10px] font-black uppercase tracking-widest px-4 h-full whitespace-nowrap">Stripe Express Control</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">General Manager / Contact</Label>
                      <p className="text-sm font-bold uppercase">{selectedVenue?.contactName || 'Venue Manager'}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Contact Email</Label>
                      <p className="text-sm font-bold">{selectedVenue?.contactEmail}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Assigned Sales Rep</Label>
                      <p className="text-sm font-black text-indigo-600 uppercase">{selectedVenue?.ownerId || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Contract Signed</Label>
                      <p className="text-sm font-bold uppercase">Jan 12, 2026</p>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Launch Date</Label>
                      <p className="text-sm font-bold uppercase text-primary">Feb 01, 2026</p>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Address</Label>
                      <p className="text-[10px] font-bold uppercase leading-tight">{selectedVenue?.streetAddress}, {selectedVenue?.city}, {selectedVenue?.state}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Platform Fee (Monthly)</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input defaultValue="0.00" className="h-10 font-black" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Patron Conv. Fee</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input defaultValue={selectedVenue?.serviceFee?.toFixed(2)} className="h-10 font-black" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ops" className="space-y-4 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border-2 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase">BevCart Module</span>
                      <Switch defaultChecked={selectedVenue?.bevcartActive} />
                    </div>
                    <div className="p-4 border-2 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase">Clubhouse Module</span>
                      <Switch defaultChecked={selectedVenue?.clubhouseActive} />
                    </div>
                    <div className="p-4 border-2 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase">Lane Delivery</span>
                      <Switch defaultChecked={selectedVenue?.lanedeliveryActive} />
                    </div>
                    <div className="p-4 border-2 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase">Founding Partner Badge</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-6 pb-6">
                  <div className="space-y-4 bg-indigo-50/50 p-6 rounded-[1.5rem] border-2 border-indigo-100">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Stripe Express Account ID</Label>
                      <Input 
                        value={stripeAccountId} 
                        onChange={(e) => setStripeAccountId(e.target.value)}
                        placeholder="acct_xxxxxxxx" 
                        className="font-mono font-bold border-2 border-indigo-200"
                      />
                      <p className="text-[8px] font-bold text-indigo-400 uppercase">The unique merchant ID from Stripe Connect Express.</p>
                    </div>

                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-indigo-100">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black uppercase text-[#213147]">Enable Payouts</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Allow automated ACH transfers to this merchant.</p>
                      </div>
                      <Switch checked={payoutsEnabled} onCheckedChange={setPayoutsEnabled} />
                    </div>

                    <div className="grid gap-2 border-t border-indigo-100 pt-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Manual Onboarding Link</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-indigo-400" />
                          <Input 
                            value={manualOnboardingLink} 
                            onChange={(e) => setManualOnboardingLink(e.target.value)}
                            placeholder="https://connect.stripe.com/setup/s/..." 
                            className="pl-10 font-bold border-2 border-indigo-200"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={handleSendOnboardingLink}
                          className="border-indigo-200 text-indigo-600 hover:bg-indigo-100 gap-2 h-10 px-4 font-black uppercase text-[9px]"
                        >
                          <Send className="h-3 w-3" /> Send
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <Button 
                        onClick={handleSaveVenueStripeData} 
                        disabled={isProcessingStripe}
                        className="h-12 bg-[#213147] hover:bg-black text-white font-black uppercase tracking-widest shadow-lg"
                      >
                        {isProcessingStripe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleVerifyStripeConnection} 
                        disabled={isVerifyingStripe || !stripeAccountId}
                        className="h-12 border-2 text-indigo-600 border-indigo-100 bg-white hover:bg-indigo-50 font-black uppercase tracking-widest"
                      >
                        {isVerifyingStripe ? <Loader2 className="h-5 w-5 animate-spin" /> : <HeartPulse className="h-4 w-4 mr-2" />}
                        Verify Health
                      </Button>
                    </div>

                    {verificationResult && (
                      <div className="p-4 bg-white border-2 border-indigo-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-2 border-b pb-1">Real-time Connection Data</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Business Name</p>
                            <p className="text-xs font-black text-[#213147] truncate">{verificationResult.businessName}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Capability Status</p>
                            <Badge variant={verificationResult.status === 'Ready' ? 'default' : 'destructive'} className="text-[8px] font-black uppercase px-2 h-4">
                              {verificationResult.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-xl flex gap-3">
                    <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 leading-none">Stripe Connect Express Policy</p>
                      <p className="text-[9px] font-bold text-amber-700 uppercase leading-tight">Payouts can only be enabled for accounts with completed identity verification on the Express platform.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 sm:-mx-10 sm:-mb-10 sm:p-10 rounded-b-[2.5rem] border-t flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setIsVenueDetailOpen(false)} className="text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none">Close Profile</Button>
                <Button className="bg-[#213147] font-black uppercase text-[10px] tracking-widest px-8 flex-1 sm:flex-none">Save Configuration</Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

    </div>
  );
}
