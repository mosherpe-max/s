'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  HeartPulse,
  Database,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Trash2,
  Menu
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
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { Seller, PlatformConfig, Order, SalesRepRole, Venue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, startOfMonth, subDays } from 'date-fns';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
        <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function PlatformAdminPage() {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [selectedVenueRegistry, setSelectedVenueRegistry] = useState<Venue | null>(null);
  const [isVenueDetailOpen, setIsVenueDetailOpen] = useState(false);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Logo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsProcessingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Venue Stripe State
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeConnectId, setStripeConnectId] = useState('');
  const [platformFeeFixed, setPlatformFeeFixed] = useState(20);
  const [platformFeePercent, setPlatformFeePercent] = useState(0);
  const [patronConvenienceFee, setPatronConvenienceFee] = useState(150);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [manualOnboardingLink, setManualOnboardingLink] = useState('');

  useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

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

  useEffect(() => {
    const fetchRegistry = async () => {
      if (!firestore || !selectedVenue) return;
      const venueDoc = await getDoc(doc(firestore, 'venues', selectedVenue.id));
      if (venueDoc.exists()) {
        const data = venueDoc.data() as Venue;
        setSelectedVenueRegistry(data);
        setStripeAccountId(data.stripeAccountId || '');
        setStripeConnectId(data.stripeConnectId || '');
        setPlatformFeeFixed(data.platformFeeFixed ?? 20);
        setPlatformFeePercent(data.platformFeePercent ?? 0);
        setPatronConvenienceFee(data.patronConvenienceFee ?? 150);
        setPayoutsEnabled(data.payoutsEnabled || false);
        setManualOnboardingLink((data as any).stripeOnboardingLink || '');
      } else {
        setSelectedVenueRegistry(null);
        setStripeAccountId('');
        setStripeConnectId('');
        setPlatformFeeFixed(20);
        setPlatformFeePercent(0);
        setPatronConvenienceFee(150);
        setPayoutsEnabled(false);
        setManualOnboardingLink('');
      }
      setVerificationResult(null);
    };
    fetchRegistry();
  }, [selectedVenue, firestore]);

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

    const currentDayOfMonth = now.getDate() || 1;
    const projectedFees = (mtdFees / currentDayOfMonth) * 30;

    return {
      venueCounts: { total: activeSellers.length, golf: golfVenues.length, bowling: bowlingVenues.length, other: activeSellers.length - golfVenues.length - bowlingVenues.length },
      gmv: { mtd: mtdGMV, trailing30: trailing30GMV },
      orders: { today: todayOrders.length, mtd: mtdOrders.length, all_time: orders.length },
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

  const handleSaveVenueStripeData = async () => {
    if (!firestore || !selectedVenue) return;
    setIsProcessingStripe(true);
    try {
      const batch = writeBatch(firestore);
      const venueRef = doc(firestore, 'venues', selectedVenue.id);
      const sellerRef = doc(firestore, 'sellers', selectedVenue.id);

      const registryData = {
        venueId: selectedVenue.id,
        name: selectedVenue.courseName,
        stripeAccountId: stripeAccountId.trim(),
        stripeConnectId: stripeConnectId.trim(),
        platformFeeFixed: Number(platformFeeFixed),
        platformFeePercent: Number(platformFeePercent),
        patronConvenienceFee: Number(patronConvenienceFee),
        payoutsEnabled: payoutsEnabled,
        stripeOnboardingLink: manualOnboardingLink.trim(),
        updatedAt: serverTimestamp(),
      };

      batch.set(venueRef, registryData, { merge: true });
      
      // Keep operational Seller document in sync with the variable fee (stored in dollars)
      batch.update(sellerRef, {
        serviceFee: Number(patronConvenienceFee) / 100,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Venue Payment Registry & Profile Updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
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
        title: "Real-time Verification Success",
        description: `Connected to ${(result.data as any).businessName}`
      });
    } catch (e: any) {
      const errorMsg = e?.details?.details || e.message || "Unknown server error during verification.";
      toast({ 
        variant: "destructive", 
        title: "Connection Failed", 
        description: errorMsg 
      });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const handleRunConvenienceFeeMigration = async () => {
    if (!firestore) return;
    setIsMigrating(true);
    try {
      const batch = writeBatch(firestore);
      const venuesSnapshot = await getDocs(collection(firestore, 'venues'));
      
      let count = 0;
      venuesSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.patronConvenienceFee === undefined) {
          // Update Registry
          batch.update(docSnap.ref, { patronConvenienceFee: 150, updatedAt: serverTimestamp() });
          
          // Update corresponding operational Seller profile
          const sellerRef = doc(firestore, 'sellers', docSnap.id);
          batch.update(sellerRef, { serviceFee: 1.50, updatedAt: serverTimestamp() });
          
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        toast({ title: "Migration Complete", description: `Updated ${count} venues with default $1.50 variable fee.` });
      } else {
        toast({ title: "Migration Skipped", description: "All venues already have convenience fee defined." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Migration Failed", description: e.message });
    } finally {
      setIsMigrating(false);
    }
  };

  // Logo Upload Functions
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png')) {
      toast({ variant: "destructive", title: "Invalid Format", description: "Please upload a PNG file for high-resolution branding." });
      return;
    }

    if (file.size > 800000) { // Keep under 800KB for Firestore doc safety
      toast({ variant: "destructive", title: "File Too Large", description: "Please optimize your PNG to be under 800KB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!firestore || !logoPreview) return;
    setIsProcessingLogo(true);
    try {
      await setDoc(doc(firestore, 'platform', 'config'), {
        logoUrl: logoPreview,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Platform Branding Updated", description: "Your custom logo is now active site-wide." });
      setLogoPreview(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: e.message });
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'platform', 'config'), {
        logoUrl: null,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Logo Removed", description: "The platform has reverted to default SVG branding." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  if (!isMounted) return null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
    { id: "venues", label: "Venue Management", icon: Store },
    { id: "finance", label: "Financial & Billing", icon: CreditCard },
    { id: "orders", label: "Global Order Feed", icon: ClipboardList },
    { id: "reps", label: "Sales Rep Hub", icon: Briefcase },
    { id: "system", label: "System Control", icon: Settings2 },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavButton 
              key={item.id}
              id={item.id} 
              label={item.label} 
              icon={item.icon} 
              active={activeNav === item.id} 
              onClick={(id) => { setActiveNav(id); if (isMobile) setSidebarOpen(false); }}
              sidebarOpen={showLabels}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 p-4">
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors">
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      
      {/* SIDEBAR (Desktop) */}
      <aside className={cn(
        "bg-[#213147] hidden lg:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <SideBarContent />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#213147]">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-[#213147] border-r-4 border-primary/20">
                  <div className="flex flex-col h-full">
                    <SideBarContent forceLabels={true} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight text-[#213147] truncate max-w-[150px] sm:max-w-none">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary hidden sm:flex">Master Access</Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!isMobile && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Production Mode</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-20">

            {activeNav === 'dashboard' && (
              <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-500">
                <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-2 no-scrollbar -mx-2 px-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:pb-0 md:mx-0 md:px-0">
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Active Partners" value={metrics?.venueCounts.total || 0} sub={`${metrics?.venueCounts.golf} Golf • ${metrics?.venueCounts.bowling} Bowling`} icon={Store} colorClass="bg-indigo-600" trend="+2" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Platform GMV" value={`$${metrics?.gmv.mtd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub={`30D Vol: $${metrics?.gmv.trailing30.toLocaleString()}`} icon={DollarSign} colorClass="bg-green-600" trend="+12%" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Orders Processed" value={metrics?.orders.mtd || 0} sub={`${metrics?.orders.today} today • ${metrics?.orders.all_time} total`} icon={ShoppingBag} colorClass="bg-primary" trend="+8%" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <KPICard label="Fee Revenue (MTD)" value={`$${metrics?.fees.mtd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub={`Projected: $${metrics?.fees.projected.toLocaleString()}`} icon={BarChart3} colorClass="bg-amber-500" />
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'venues' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl border-2 shadow-sm gap-4">
                  <div className="flex-1 w-full max-w-md relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search registry..." className="pl-10 h-10 border-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Button className="w-full sm:w-auto bg-[#213147] font-black uppercase text-[10px] tracking-widest h-10 gap-2"><Plus className="h-4 w-4" /> Provision Venue</Button>
                </div>

                <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto no-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Establishment</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Service Fee</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers?.filter(s => s.courseName.toLowerCase().includes(searchTerm.toLowerCase())).map((venue) => (
                        <TableRow key={venue.id}>
                          <TableCell className="font-black text-sm uppercase text-[#213147] truncate max-w-[150px]">{venue.courseName}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[8px] uppercase">{venue.type}</Badge></TableCell>
                          <TableCell className="font-bold text-xs">${venue.serviceFee?.toFixed(2)}</TableCell>
                          <TableCell><Badge className={cn("text-[8px] uppercase", venue.status === 'Active' ? 'bg-green-600' : 'bg-slate-300')}>{venue.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsVenueDetailOpen(true); }} className="h-8 text-[9px] font-black uppercase tracking-widest border-2">Profile</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {activeNav === 'system' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* PLATFORM BRANDING UPLOAD */}
                   <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="border-b bg-primary/5">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="h-5 w-5 text-primary" />
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Platform Branding</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase">High-Resolution Logo Assets</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between mb-2">
                             <p className="text-xs font-black uppercase text-[#213147]">Site-Wide Logo</p>
                             {config?.logoUrl && (
                               <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="h-7 text-[9px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5">
                                 <Trash2 className="h-3 w-3 mr-1.5" /> Remove
                               </Button>
                             )}
                           </div>

                           <div 
                             onClick={() => fileInputRef.current?.click()}
                             className={cn(
                               "relative w-full aspect-[3/1] bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100/50 group overflow-hidden",
                               logoPreview ? "border-primary/50" : "border-slate-200"
                             )}
                           >
                             {logoPreview || config?.logoUrl ? (
                               <div className="relative w-full h-full p-4 flex items-center justify-center">
                                 <img 
                                   src={logoPreview || config?.logoUrl} 
                                   alt="Logo Preview" 
                                   className="max-h-full max-w-full object-contain drop-shadow-sm" 
                                 />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                   <Upload className="h-6 w-6 text-white" />
                                   <span className="text-xs font-black text-white uppercase tracking-widest">Replace PNG</span>
                                 </div>
                               </div>
                             ) : (
                               <div className="text-center space-y-2">
                                 <div className="bg-white p-3 rounded-full shadow-sm border mx-auto inline-block text-slate-400 group-hover:text-primary transition-colors">
                                   <Upload className="h-6 w-6" />
                                 </div>
                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tap to select high-res PNG</p>
                                 <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">Transparent • Max 800KB</p>
                               </div>
                             )}
                             <input 
                               type="file" 
                               ref={fileInputRef} 
                               className="hidden" 
                               accept="image/png" 
                               onChange={handleLogoSelect} 
                             />
                           </div>

                           {logoPreview && (
                             <div className="flex gap-2 animate-in slide-in-from-top-2">
                               <Button 
                                 onClick={handleUploadLogo} 
                                 disabled={isUploadingLogo}
                                 className="flex-1 bg-primary hover:bg-primary/90 font-black uppercase text-[10px] tracking-widest h-10"
                               >
                                 {isUploadingLogo ? <Loader2 className="animate-spin" /> : "Commit Branding"}
                               </Button>
                               <Button 
                                 variant="outline" 
                                 onClick={() => setLogoPreview(null)}
                                 className="px-4 text-[10px] font-black uppercase border-2 h-10"
                               >
                                 Cancel
                               </Button>
                             </div>
                           )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3" /> Branding Policy
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                            Once updated, this logo will propagate immediately to the App Header, Landing Page, and Admin Dashboards.
                          </p>
                        </div>
                      </CardHeader>
                   </Card>

                   <Card className="border-2 shadow-sm">
                      <CardHeader className="border-b bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-indigo-600" />
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Maintenance</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase">Database maintenance</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-4">
                        <div className="space-y-2">
                           <p className="text-xs font-bold text-[#213147] uppercase tracking-tight">Initialize Convenience Fee</p>
                           <p className="text-[10px] text-muted-foreground leading-relaxed">
                             Sync missing `patronConvenienceFee` fields to existing venues.
                           </p>
                        </div>
                        <Button 
                          onClick={handleRunConvenienceFeeMigration} 
                          disabled={isMigrating} 
                          className="w-full bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[10px] h-12 gap-2"
                        >
                          {isMigrating ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Run Migration
                        </Button>
                      </CardContent>
                   </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] rounded-[2rem] sm:rounded-[2.5rem] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-4 sm:p-10 space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2 sm:mb-4">
                  <div className="bg-indigo-50 p-3 sm:p-4 rounded-2xl text-indigo-600"><Store className="h-6 sm:h-8 w-6 sm:w-8" /></div>
                  <div>
                    <DialogTitle className="font-headline font-black uppercase text-[#213147] text-xl sm:text-2xl">{selectedVenue?.courseName}</DialogTitle>
                    <Badge variant="outline" className="text-[8px] sm:text-[9px] uppercase font-black">{selectedVenue?.type}</Badge>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="stripe" className="mt-2">
                <TabsList className="bg-slate-50 border p-1 h-10 rounded-xl mb-4 sm:mb-6 w-full justify-start overflow-x-auto no-scrollbar flex-nowrap">
                  <TabsTrigger value="details" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 h-full">Details</TabsTrigger>
                  <TabsTrigger value="stripe" className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-4 h-full">Stripe Control</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6">
                   <div>
                     <Label className="text-[9px] font-black uppercase text-muted-foreground">Contact Email</Label>
                     <p className="text-sm font-bold">{selectedVenue?.contactEmail}</p>
                   </div>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-6 pb-6">
                  <div className="space-y-6 bg-indigo-50/50 p-4 sm:p-6 rounded-[1.5rem] border-2 border-indigo-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Stripe Account ID</Label>
                        <Input value={stripeAccountId} onChange={(e) => setStripeAccountId(e.target.value)} placeholder="acct_xxxxxxxx" className="font-mono font-bold border-2 border-indigo-200" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Stripe Connect ID</Label>
                        <Input value={stripeConnectId} onChange={(e) => setStripeConnectId(e.target.value)} placeholder="acct_xxxxxxxx" className="font-mono font-bold border-2 border-indigo-200" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-indigo-100 pt-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Koop Fixed (Cents)</Label>
                        <Input type="number" value={platformFeeFixed} onChange={(e) => setPlatformFeeFixed(Number(e.target.value))} className="font-bold border-2 border-indigo-200" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Koop % Fee</Label>
                        <Input type="number" step="0.1" value={platformFeePercent} onChange={(e) => setPlatformFeePercent(Number(e.target.value))} className="font-bold border-2 border-indigo-200" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Patron Fee (Cents)</Label>
                        <Input type="number" value={patronConvenienceFee} onChange={(e) => setPatronConvenienceFee(Number(e.target.value))} className="font-bold border-2 border-primary/20" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-indigo-100">
                      <div>
                        <p className="text-xs font-black uppercase text-[#213147]">Enable Payouts</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">Allow automated Transfers.</p>
                      </div>
                      <Switch checked={payoutsEnabled} onCheckedChange={setPayoutsEnabled} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <Button onClick={handleSaveVenueStripeData} disabled={isProcessingStripe} className="h-12 bg-[#213147] font-black uppercase tracking-widest shadow-lg">
                        {isProcessingStripe ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Registry
                      </Button>
                      <Button variant="outline" onClick={handleVerifyStripeConnection} disabled={isVerifyingStripe || !stripeAccountId} className="h-12 border-2 text-indigo-600 border-indigo-100 gap-2 font-black uppercase tracking-widest">
                        {isVerifyingStripe ? <Loader2 className="h-5 w-5 animate-spin" /> : <HeartPulse className="h-4 w-4 mr-2" />} Verify Health
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
                            <Badge variant={verificationResult.status === 'Ready' ? 'default' : 'destructive'} className="text-[8px] font-black uppercase px-2 h-4">{verificationResult.status}</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="bg-slate-50 -mx-4 -mb-4 p-4 sm:-mx-10 sm:-mb-10 sm:p-10 rounded-b-[2.5rem] border-t">
                <Button variant="ghost" onClick={() => setIsVenueDetailOpen(false)} className="text-[10px] font-black uppercase tracking-widest w-full">Close Profile</Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
