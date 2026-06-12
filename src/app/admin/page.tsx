
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
  Image as LucideImage,
  Upload,
  Trash2,
  Menu,
  Phone,
  Building,
  Target,
  ChevronDown
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, getDoc, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { Seller, PlatformConfig, Order, SalesRepRole, Venue, SellerType } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- VENUE FORM STATE ---
  const [vName, setVName] = useState('');
  const [vType, setVType] = useState<SellerType>('Public Golf Course');
  const [vLanes, setVLanes] = useState(0);
  const [vAddress, setVAddress] = useState('');
  const [vCity, setVCity] = useState('');
  const [vState, setVState] = useState('');
  const [vZip, setVZip] = useState('');
  const [vContactName, setVContactName] = useState('');
  const [vContactEmail, setVContactEmail] = useState('');
  const [vContactPhone, setVContactPhone] = useState('');
  const [vTaxRate, setVTaxRate] = useState(6.0);
  const [vMonthlyRate, setVMonthlyRate] = useState(0);
  const [vStartDate, setVStartDate] = useState('');
  const [vActiveModes, setVActiveModes] = useState<string[]>([]);

  // Stripe & Fee Registry State
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeConnectId, setStripeConnectId] = useState('');
  const [platformFeeFixed, setPlatformFeeFixed] = useState(20);
  const [platformFeePercent, setPlatformFeePercent] = useState(0);
  const [patronConvenienceFee, setPatronConvenienceFee] = useState(150);
  const [serviceFees, setServiceFees] = useState<Record<string, number>>({});
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);

  // Logo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsProcessingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  const { data: sellers } = useCollection<Seller>(sellersQuery);
  const { data: orders } = useCollection<Order>(ordersQuery);

  useEffect(() => {
    const loadVenueData = async () => {
      if (!firestore || !selectedVenue) return;
      
      // Load Profile (Seller)
      setVName(selectedVenue.courseName || '');
      setVType(selectedVenue.type || 'Public Golf Course');
      setVLanes(selectedVenue.laneCount || 0);
      setVAddress(selectedVenue.streetAddress || '');
      setVCity(selectedVenue.city || '');
      setVState(selectedVenue.state || '');
      setVZip(selectedVenue.zip || '');
      setVContactName(selectedVenue.contactName || '');
      setVContactEmail(selectedVenue.contactEmail || '');
      setVContactPhone(selectedVenue.contactPhone || '');
      setVTaxRate(selectedVenue.taxRate || 6.0);
      setVActiveModes(selectedVenue.menuTypes || []);

      // Load Registry (Venue)
      const venueDoc = await getDoc(doc(firestore, 'venues', selectedVenue.id));
      if (venueDoc.exists()) {
        const data = venueDoc.data() as Venue;
        setSelectedVenueRegistry(data);
        setStripeAccountId(data.stripeAccountId || '');
        setStripeConnectId(data.stripeConnectId || '');
        setPlatformFeeFixed(data.platformFeeFixed ?? 20);
        setPlatformFeePercent(data.platformFeePercent ?? 0);
        setPatronConvenienceFee(data.patronConvenienceFee ?? 150);
        setServiceFees(data.serviceFees || {});
        setPayoutsEnabled(data.payoutsEnabled || false);
        setVMonthlyRate(data.monthlyPlatformFee || 0);
        setVStartDate(data.serviceStartDate ? format(data.serviceStartDate.toDate(), 'yyyy-MM-dd') : '');
      } else {
        setSelectedVenueRegistry(null);
        setStripeAccountId('');
        setStripeConnectId('');
        setPlatformFeeFixed(20);
        setPlatformFeePercent(0);
        setPatronConvenienceFee(150);
        setServiceFees({});
        setPayoutsEnabled(false);
        setVMonthlyRate(0);
        setVStartDate('');
      }
      setVerificationResult(null);
    };
    loadVenueData();
  }, [selectedVenue, firestore]);

  const metrics = useMemo(() => {
    if (!sellers || !orders) return null;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const activeSellers = sellers.filter(s => s.status === 'Active');
    const mtdOrders = orders.filter(o => o.createdAt?.toDate() >= monthStart);
    const mtdGMV = mtdOrders.reduce((acc, o) => acc + o.total, 0);
    const mtdFees = mtdOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
    return {
      venueCounts: { total: activeSellers.length },
      gmv: { mtd: mtdGMV },
      orders: { mtd: mtdOrders.length },
      fees: { mtd: mtdFees }
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

  const handleApplyMasterFeeToAll = () => {
    const updated = { ...serviceFees };
    vActiveModes.forEach(mode => {
      updated[mode] = patronConvenienceFee;
    });
    setServiceFees(updated);
    toast({ title: "Master Fee Applied", description: `Defaulting all active modes to ${patronConvenienceFee} cents.` });
  };

  const handleSaveVenueData = async () => {
    if (!firestore || !selectedVenue) return;
    setIsProcessingSave(true);
    try {
      const batch = writeBatch(firestore);
      const venueRef = doc(firestore, 'venues', selectedVenue.id);
      const sellerRef = doc(firestore, 'sellers', selectedVenue.id);

      // 1. Update Registry (Venue Entity)
      const registryData = {
        venueId: selectedVenue.id,
        name: vName,
        stripeAccountId: stripeAccountId.trim(),
        stripeConnectId: stripeConnectId.trim(),
        platformFeeFixed: Number(platformFeeFixed),
        platformFeePercent: Number(platformFeePercent),
        patronConvenienceFee: Number(patronConvenienceFee),
        serviceFees: serviceFees,
        payoutsEnabled: payoutsEnabled,
        monthlyPlatformFee: Number(vMonthlyRate),
        serviceStartDate: vStartDate ? Timestamp.fromDate(new Date(vStartDate)) : null,
        updatedAt: serverTimestamp(),
      };
      batch.set(venueRef, registryData, { merge: true });

      // 2. Update Operational Profile (Seller Entity)
      // Convert fees from cents to dollars for the profile
      const serviceFeesInDollars: Record<string, number> = {};
      Object.entries(serviceFees).forEach(([mode, cents]) => {
        serviceFeesInDollars[mode] = cents / 100;
      });

      const profileData = {
        courseName: vName,
        type: vType,
        laneCount: vType === 'Bowling Alley' ? Number(vLanes) : 0,
        streetAddress: vAddress,
        city: vCity,
        state: vState,
        zip: vZip,
        contactName: vContactName,
        contactEmail: vContactEmail,
        contactPhone: vContactPhone,
        taxRate: Number(vTaxRate),
        menuTypes: vActiveModes,
        serviceFee: Number(patronConvenienceFee) / 100, // Sync master dollars
        serviceFees: serviceFeesInDollars, // Sync mode-specific dollars
        updatedAt: serverTimestamp()
      };
      batch.update(sellerRef, profileData);

      await batch.commit();
      toast({ title: "Venue Data Synchronized", description: `${vName} profiles updated successfully.` });
      setIsVenueDetailOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsVenueDetailOpen(false); // Close dialog even on failure for demo stability
      setIsProcessingSave(false);
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
      toast({ title: "Verification Success" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Connection Failed", description: e.message });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!firestore || !logoPreview) return;
    setIsProcessingLogo(true);
    try {
      await setDoc(doc(firestore, 'platform', 'config'), { logoUrl: logoPreview, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Platform Branding Updated" });
      setLogoPreview(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: e.message });
    } finally {
      setIsProcessingLogo(false);
    }
  };

  if (!isMounted) return null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
    { id: "venues", label: "Venue Management", icon: Store },
    { id: "system", label: "System Control", icon: Settings2 },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
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
        <div className="mt-auto border-t border-white/5 p-4 shrink-0">
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white transition-colors">
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
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
                  <SideBarContent forceLabels={true} />
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight text-[#213147]">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
          </div>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <ScrollArea className="flex-1 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-20">
            {activeNav === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard label="Active Partners" value={metrics?.venueCounts.total || 0} sub="Global registry" icon={Store} colorClass="bg-indigo-600" />
                  <KPICard label="GMV (MTD)" value={`$${metrics?.gmv.mtd.toLocaleString()}`} sub="Gross sales" icon={DollarSign} colorClass="bg-green-600" />
                  <KPICard label="Orders (MTD)" value={metrics?.orders.mtd || 0} sub="Processed" icon={ShoppingBag} colorClass="bg-primary" />
                  <KPICard label="Fee Revenue" value={`$${metrics?.fees.mtd.toLocaleString()}`} sub="Platform cut" icon={BarChart3} colorClass="bg-amber-500" />
                </div>
              </div>
            )}

            {activeNav === 'venues' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex bg-white p-4 rounded-2xl border-2 shadow-sm gap-4 items-center">
                  <Search className="h-4 w-4 text-muted-foreground ml-2" />
                  <Input placeholder="Search registry by venue name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 shadow-none focus-visible:ring-0 text-sm font-medium" />
                </div>
                <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Establishment</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Contact</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellers?.filter(s => s.courseName.toLowerCase().includes(searchTerm.toLowerCase())).map((venue) => (
                          <TableRow key={venue.id}>
                            <TableCell className="font-black text-sm uppercase text-[#213147]">{venue.courseName}</TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{venue.type}</TableCell>
                            <TableCell className="text-[10px] font-medium">{venue.contactName}</TableCell>
                            <TableCell><Badge className={cn(venue.status === 'Active' ? 'bg-green-600' : 'bg-slate-300')}>{venue.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsVenueDetailOpen(true); }} className="text-[10px] font-black uppercase">Manage</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'system' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-primary/5">
                      <CardTitle className="font-black uppercase tracking-tight text-sm">Platform Branding</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full aspect-[3/1] bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden"
                      >
                        {logoPreview || config?.logoUrl ? (
                          <img src={logoPreview || config?.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                            <p className="text-[10px] font-black uppercase">Select PNG</p>
                          </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png" onChange={handleLogoSelect} />
                      </div>
                      {logoPreview && (
                        <div className="flex gap-2">
                          <Button onClick={handleUploadLogo} disabled={isUploadingLogo} className="flex-1">Commit</Button>
                          <Button variant="outline" onClick={() => setLogoPreview(null)}>Cancel</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-w-[95vw] rounded-[2rem] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 sm:p-10 space-y-8">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-2xl">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <DialogTitle className="font-headline font-black uppercase text-[#213147] text-2xl leading-none mb-1">{vName}</DialogTitle>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{vType}</Badge>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-slate-100 p-1 mb-6 rounded-xl w-full justify-start overflow-x-auto no-scrollbar">
                  <TabsTrigger value="profile" className="text-[10px] font-black uppercase tracking-widest px-6 h-9">Operational Profile</TabsTrigger>
                  <TabsTrigger value="billing" className="text-[10px] font-black uppercase tracking-widest px-6 h-9">Billing & Fees</TabsTrigger>
                  <TabsTrigger value="stripe" className="text-[10px] font-black uppercase tracking-widest px-6 h-9">Stripe Engine</TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-left-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Core Identity</h3>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase">Venue Name</Label>
                        <Input value={vName} onChange={e => setVName(e.target.value)} className="border-2 font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase">Type</Label>
                          <Select onValueChange={(v: any) => setVType(v)} value={vType}>
                            <SelectTrigger className="border-2 font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {sellerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {vType === 'Bowling Alley' && (
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase">Lanes</Label>
                            <Input type="number" value={vLanes} onChange={e => setVLanes(Number(e.target.value))} className="border-2 font-bold" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Location</h3>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase">Street Address</Label>
                        <Input value={vAddress} onChange={e => setVAddress(e.target.value)} className="border-2 font-bold" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1"><Label className="text-[10px] font-black uppercase">City</Label><Input value={vCity} onChange={e => setVCity(e.target.value)} className="border-2 font-bold" /></div>
                        <div className="col-span-1"><Label className="text-[10px] font-black uppercase">State</Label><Input value={vState} onChange={e => setVState(e.target.value)} className="border-2 font-bold" /></div>
                        <div className="col-span-1"><Label className="text-[10px] font-black uppercase">Zip</Label><Input value={vZip} onChange={e => setVZip(e.target.value)} className="border-2 font-bold" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Primary Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Person Name</Label><Input value={vContactName} onChange={e => setVContactName(e.target.value)} className="border-2 font-bold" /></div>
                      <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Email</Label><Input value={vContactEmail} onChange={e => setVContactEmail(e.target.value)} className="border-2 font-bold" /></div>
                      <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Phone</Label><Input value={vContactPhone} onChange={e => setVContactPhone(e.target.value)} className="border-2 font-bold" /></div>
                    </div>
                  </div>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="space-y-8 animate-in fade-in slide-in-from-left-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                      <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Platform Revenue</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase">Monthly Rate ($)</Label>
                          <Input type="number" value={vMonthlyRate} onChange={e => setVMonthlyRate(Number(e.target.value))} className="border-2 font-bold h-12" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase">Start Date</Label>
                          <Input type="date" value={vStartDate} onChange={e => setVStartDate(e.target.value)} className="border-2 font-bold h-12" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Fixed Fee (Cents)</Label><Input type="number" value={platformFeeFixed} onChange={e => setPlatformFeeFixed(Number(e.target.value))} className="border-2 font-bold" /></div>
                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Percent Fee (%)</Label><Input type="number" value={platformFeePercent} onChange={e => setPlatformFeePercent(Number(e.target.value))} className="border-2 font-bold" /></div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-1">Patron Logistics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase">Master Fee (Cents)</Label>
                          <Input 
                            type="number" 
                            value={patronConvenienceFee} 
                            onChange={e => setPatronConvenienceFee(Number(e.target.value))} 
                            className="border-2 font-bold h-12 border-primary/20" 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase">Venue Tax Rate (%)</Label>
                          <Input type="number" step="0.1" value={vTaxRate} onChange={e => setVTaxRate(Number(e.target.value))} className="border-2 font-bold h-12" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase">Active Channels</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => {
                                setVActiveModes(prev => prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]);
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-full border-2 text-[9px] font-black uppercase tracking-widest transition-all",
                                vActiveModes.includes(mode) ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                              )}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GRANULAR FEES SECTION */}
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 space-y-6">
                    <Collapsible>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg"><Zap className="h-4 w-4 text-primary" /></div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">Service Specific Overrides</p>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase">Define custom convenience fees per channel</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleApplyMasterFeeToAll}
                            className="text-[9px] font-black uppercase h-8 border-primary/20 hover:bg-primary/5 text-primary"
                          >
                            Apply Master to All
                          </Button>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className="h-4 w-4" /></Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>

                      <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                          {['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'].map(mode => {
                            const isActive = vActiveModes.includes(mode);
                            return (
                              <div key={mode} className={cn("space-y-2 p-3 rounded-2xl border-2 bg-white transition-opacity", !isActive && "opacity-40 grayscale")}>
                                <div className="flex justify-between items-center mb-1">
                                  <Label className="text-[9px] font-black uppercase text-[#213147] truncate">{mode}</Label>
                                  {!isActive && <Badge variant="outline" className="text-[7px] font-bold h-3 px-1 uppercase">OFF</Badge>}
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground uppercase">¢</span>
                                  <Input 
                                    type="number" 
                                    disabled={!isActive}
                                    value={serviceFees[mode] ?? patronConvenienceFee} 
                                    onChange={e => setServiceFees(prev => ({ ...prev, [mode]: Number(e.target.value) }))}
                                    className="h-10 pl-6 border-2 font-bold text-sm focus-visible:ring-primary" 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </TabsContent>

                {/* STRIPE TAB */}
                <TabsContent value="stripe" className="space-y-6 animate-in fade-in slide-in-from-left-2">
                   <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Stripe Account ID</Label><Input value={stripeAccountId} onChange={e => setStripeAccountId(e.target.value)} className="border-2 font-mono" /></div>
                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase">Stripe Connect ID</Label><Input value={stripeConnectId} onChange={e => setStripeConnectId(e.target.value)} className="border-2 font-mono" /></div>
                      </div>
                      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className={cn("h-5 w-5", payoutsEnabled ? "text-green-500" : "text-slate-300")} />
                          <Label className="font-black uppercase text-xs">Enable Live Payouts</Label>
                        </div>
                        <Switch checked={payoutsEnabled} onCheckedChange={setPayoutsEnabled} className="data-[state=checked]:bg-green-600" />
                      </div>
                      <Button variant="outline" onClick={handleVerifyStripeConnection} disabled={isVerifyingStripe} className="w-full h-12 font-black uppercase tracking-widest border-2 gap-2">
                        {isVerifyingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4 text-primary" />}
                        Run Diagnostic Verification
                      </Button>
                      {verificationResult && (
                        <div className="p-4 bg-white border-2 rounded-2xl animate-in zoom-in-95">
                          <p className="text-[9px] font-black uppercase text-indigo-600 mb-2">Diagnostic Results</p>
                          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                            <div><span className="text-[8px] text-muted-foreground block">MERCHANT</span>{verificationResult.businessName}</div>
                            <div><span className="text-[8px] text-muted-foreground block">STATUS</span>{verificationResult.status}</div>
                          </div>
                        </div>
                      )}
                   </div>
                </TabsContent>
              </Tabs>

              <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
                <Button onClick={handleSaveVenueData} disabled={isProcessingSave} className="flex-1 h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest shadow-xl text-lg gap-3 rounded-2xl">
                  {isProcessingSave ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                  Synchronize Master Records
                </Button>
                <Button variant="ghost" onClick={() => setIsVenueDetailOpen(false)} className="h-14 px-8 font-black uppercase tracking-widest rounded-2xl">Discard</Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
