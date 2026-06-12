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
    const mtdOrders = orders.filter(o => o.createdAt?.toDate() >= monthStart);
    const todayOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const trailing30Orders = orders.filter(o => o.createdAt?.toDate() >= thirtyDaysAgo);

    const mtdGMV = mtdOrders.reduce((acc, o) => acc + o.total, 0);
    const trailing30GMV = trailing30Orders.reduce((acc, o) => acc + o.total, 0);
    const mtdFees = mtdOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);

    const currentDayOfMonth = now.getDate() || 1;
    const projectedFees = (mtdFees / currentDayOfMonth) * 30;

    return {
      venueCounts: { total: activeSellers.length },
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
      toast({ title: "Verification Success" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Connection Failed", description: e.message });
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
      venuesSnapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { patronConvenienceFee: 150, updatedAt: serverTimestamp() });
        batch.update(doc(firestore, 'sellers', docSnap.id), { serviceFee: 1.50, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: "Migration Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Migration Failed", description: e.message });
    } finally {
      setIsMigrating(false);
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

  const handleRemoveLogo = async () => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'platform', 'config'), { logoUrl: null, updatedAt: serverTimestamp() });
    toast({ title: "Logo Removed" });
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
                <div className="flex bg-white p-4 rounded-2xl border-2 shadow-sm gap-4">
                  <Input placeholder="Search registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Establishment</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers?.filter(s => s.courseName.toLowerCase().includes(searchTerm.toLowerCase())).map((venue) => (
                        <TableRow key={venue.id}>
                          <TableCell className="font-black text-sm uppercase text-[#213147]">{venue.courseName}</TableCell>
                          <TableCell><Badge className={cn(venue.status === 'Active' ? 'bg-green-600' : 'bg-slate-300')}>{venue.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsVenueDetailOpen(true); }}>Profile</Button>
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
                  <Card className="border-2 shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-primary/5">
                      <CardTitle className="font-black uppercase tracking-tight text-sm">Branding</CardTitle>
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
                      {config?.logoUrl && <Button variant="ghost" className="w-full text-destructive" onClick={handleRemoveLogo}>Remove Logo</Button>}
                    </CardContent>
                  </Card>

                  <Card className="border-2 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                      <CardTitle className="font-black uppercase tracking-tight text-sm">Maintenance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <Button onClick={handleRunConvenienceFeeMigration} disabled={isMigrating} className="w-full h-12 gap-2">
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
        <DialogContent className="sm:max-w-[700px] max-w-[95vw] rounded-[2rem] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 sm:p-10 space-y-6">
              <DialogHeader>
                <DialogTitle className="font-headline font-black uppercase text-[#213147] text-2xl">{selectedVenue?.courseName}</DialogTitle>
                <Badge variant="outline">{selectedVenue?.type}</Badge>
              </DialogHeader>
              <div className="bg-indigo-50/50 p-6 rounded-[1.5rem] border-2 border-indigo-100 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase">Stripe Account ID</Label>
                    <Input value={stripeAccountId} onChange={(e) => setStripeAccountId(e.target.value)} className="border-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase">Stripe Connect ID</Label>
                    <Input value={stripeConnectId} onChange={(e) => setStripeConnectId(e.target.value)} className="border-2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase">Fixed Fee (Cents)</Label>
                    <Input type="number" value={platformFeeFixed} onChange={(e) => setPlatformFeeFixed(Number(e.target.value))} className="border-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase">Percent Fee</Label>
                    <Input type="number" value={platformFeePercent} onChange={(e) => setPlatformFeePercent(Number(e.target.value))} className="border-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase">Patron Fee (Cents)</Label>
                    <Input type="number" value={patronConvenienceFee} onChange={(e) => setPatronConvenienceFee(Number(e.target.value))} className="border-2" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border-2">
                  <Label className="font-black uppercase text-xs">Enable Payouts</Label>
                  <Switch checked={payoutsEnabled} onCheckedChange={setPayoutsEnabled} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleSaveVenueStripeData} disabled={isProcessingStripe} className="h-12"><Save className="h-4 w-4 mr-2" /> Save</Button>
                  <Button variant="outline" onClick={handleVerifyStripeConnection} disabled={isVerifyingStripe} className="h-12"><HeartPulse className="h-4 w-4 mr-2" /> Verify</Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsVenueDetailOpen(false)} className="w-full">Close</Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
