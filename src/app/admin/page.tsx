
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
  ChevronDown,
  Star,
  Printer,
  Copy,
  Smartphone,
  SmartphoneNfc,
  Truck,
  PlayCircle,
  Lock,
  Timer,
  Satellite,
  ShieldAlert
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
import type { Seller, PlatformConfig, Order, Venue, SellerType, MapUpdateSettings } from '@/lib/types';
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
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const SYSTEM_DEFAULT_THRESHOLDS = {
  'Beverage Cart': { warning: 10, max: 15 },
  'Clubhouse': { warning: 15, max: 20 },
  'Lane Delivery': { warning: 10, max: 15 },
  'Take Out': { warning: 15, max: 25 }
};

const SYSTEM_DEFAULT_MAP_SETTINGS: Record<string, MapUpdateSettings> = {
  'Beverage Cart': { frequencySeconds: 15, activeStages: ['Placed', 'Preparing', 'Out for Delivery'] },
  'Clubhouse': { frequencySeconds: 15, activeStages: ['Placed', 'Preparing', 'Out for Delivery'] }
};

const SERVICE_MODES = ['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'];

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      title={!sidebarOpen ? label : undefined}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative text-left",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && (
        <span className={cn("text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-right-2 duration-300", active ? "text-primary" : "")}>
          {label}
        </span>
      )}
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
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
  const [baseUrl, setBaseUrl] = useState('');
  
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [isVenueDetailOpen, setIsVenueDetailOpen] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- PLATFORM CONFIG STATE ---
  const [systemThresholds, setSystemThresholds] = useState<Record<string, { warning: number; max: number }>>(SYSTEM_DEFAULT_THRESHOLDS);
  const [mapSettings, setMapSettings] = useState<Record<string, MapUpdateSettings>>(SYSTEM_DEFAULT_MAP_SETTINGS);
  const [globalEnabledModes, setGlobalEnabledModes] = useState<string[]>(SERVICE_MODES);
  const [isSavingSystemConfig, setIsSavingSystemConfig] = useState(false);

  // Logo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsProcessingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    }
  }, []);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  useEffect(() => {
    if (config?.defaultThresholds) {
      setSystemThresholds({
        ...SYSTEM_DEFAULT_THRESHOLDS,
        ...config.defaultThresholds
      });
    }
    if (config?.mapUpdateSettings) {
      setMapSettings({
        ...SYSTEM_DEFAULT_MAP_SETTINGS,
        ...config.mapUpdateSettings
      });
    }
    if (config?.enabledModes) {
      setGlobalEnabledModes(config.enabledModes);
    }
  }, [config]);

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

  const metrics = useMemo(() => {
    if (!sellers || !orders) return null;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const activeSellers = sellers.filter(s => s.status === 'Active');
    const mtdOrders = orders.filter(o => {
      if (!o.createdAt || typeof o.createdAt.toDate !== 'function') return false;
      try {
        return o.createdAt.toDate() >= monthStart;
      } catch { return false; }
    });
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
    const platformDocRef = doc(firestore, 'platform', 'config');
    const updateData = { logoUrl: logoPreview, updatedAt: serverTimestamp() };
    setDoc(platformDocRef, updateData, { merge: true }).then(() => {
      toast({ title: "Platform Branding Updated" });
      setLogoPreview(null);
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: platformDocRef.path,
        operation: 'write',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsProcessingLogo(false);
    });
  };

  const handleUpdateSystemDefaults = async () => {
    if (!firestore) return;
    setIsSavingSystemConfig(true);
    const platformDocRef = doc(firestore, 'platform', 'config');
    const updateData = {
      defaultThresholds: systemThresholds,
      mapUpdateSettings: mapSettings,
      enabledModes: globalEnabledModes,
      updatedAt: serverTimestamp()
    };
    setDoc(platformDocRef, updateData, { merge: true }).then(() => {
      toast({ title: "System Defaults Updated", description: "Global operational protocols and service authorizations synchronized." });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: platformDocRef.path,
        operation: 'write',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsSavingSystemConfig(false);
    });
  };

  const handleThresholdChange = (mode: string, type: 'warning' | 'max', value: string) => {
    const numValue = parseInt(value, 10);
    setSystemThresholds(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [type]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  const handleMapSettingChange = (mode: string, field: keyof MapUpdateSettings, value: any) => {
    setMapSettings(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  const toggleMapStage = (mode: string, stage: string) => {
    const current = mapSettings[mode].activeStages;
    const next = current.includes(stage) 
      ? current.filter(s => s !== stage)
      : [...current, stage];
    handleMapSettingChange(mode, 'activeStages', next);
  };

  const toggleGlobalMode = (mode: string) => {
    setGlobalEnabledModes(prev => 
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  if (!isMounted) return null;

  const NAV_ITEMS = [
    { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
    { id: "venues", label: "Venue Management", icon: Store },
    { id: "demos", label: "Sales Demos", icon: Zap },
    { id: "system", label: "System Control", icon: Settings2 },
  ];

  const SideBarContent = ({ forceLabels = false }: { forceLabels?: boolean }) => {
    const showLabels = forceLabels || sidebarOpen;
    return (
      <div className="flex flex-col h-full bg-[#213147] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <StylizedKoopLogo size={showLabels ? "md" : "sm"} />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar text-left">
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
            <button onClick={() => sidebarOpen ? setSidebarOpen(false) : setSidebarOpen(true)} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const demoVenues = [
    {
      id: 'demo-course',
      title: 'Public Golf Menu',
      sub: 'Beverage Cart & Clubhouse',
      type: 'On-Course Ordering',
      gradient: 'from-indigo-500 to-blue-600',
      icon: <Globe className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-course/order?menuType=Beverage Cart',
      adminUrl: '/sellers/demo-course',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-course/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    },
    {
      id: 'demo-private-course',
      title: 'Private Golf Menu',
      sub: 'Member-Only Clubhouse',
      type: 'Private Experience',
      gradient: 'from-[#213147] to-slate-700',
      icon: <Lock className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-private-course/order?menuType=Clubhouse',
      adminUrl: '/sellers/demo-private-course',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-private-course/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    },
    {
      id: 'demo-bowling-alley',
      title: 'Bowling Alley',
      sub: 'In-Game Food & Drinks',
      type: 'Laneside Service',
      gradient: 'from-pink-600 to-rose-500',
      icon: <Smartphone className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-bowling-alley/order?menuType=Lane Delivery',
      adminUrl: '/sellers/demo-bowling-alley',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-bowling-alley/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30 shadow-sm relative">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-black font-headline uppercase tracking-tight text-[#213147]">
              {NAV_ITEMS.find(n => n.id === activeNav)?.label}
            </h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Platform Command Console</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isMobile && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#213147]">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 bg-[#213147] border-l-4 border-primary/20">
                <SheetHeader className="sr-only">
                  <SheetTitle>Platform Navigator</SheetTitle>
                  <SheetDescription>Global administration navigation menu.</SheetDescription>
                </SheetHeader>
                <SideBarContent forceLabels={true} />
              </SheetContent>
            </Sheet>
          )}
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 pb-20">
              {activeNav === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm uppercase text-[#213147]">{venue.courseName}</span>
                                  {venue.isFoundingPartner && (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 h-4 px-1.5 gap-0.5">
                                      <Star className="h-2 w-2 fill-current" />
                                      <span className="text-[8px] font-black tracking-tight">FOUNDING</span>
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
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

              {activeNav === 'demos' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {demoVenues.map((venue) => (
                      <Card key={venue.id} className="group hover:border-indigo-500 transition-all border-2 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className={cn("h-24 bg-gradient-to-br p-6 flex items-end relative", venue.gradient)}>
                          {venue.icon}
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md uppercase text-[9px] font-black">{venue.type}</Badge>
                        </div>
                        <CardHeader className="pt-4 space-y-1">
                          <CardTitle className="text-lg font-black uppercase">{venue.title}</CardTitle>
                          <CardDescription className="text-xs">{venue.sub}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-6">
                          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-[2rem] border-2 border-dashed">
                            <div className="bg-white p-2 rounded-2xl border-2 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${baseUrl}${venue.buyerUrl}`}
                                alt="Menu QR"
                                width={128}
                                height={128}
                                className="rounded-xl w-32 h-32"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <QrCode className="h-2.5 w-2.5" /> Scan to Preview
                              </p>
                              <p className="text-[10px] font-bold text-slate-600 leading-tight">Live Mobile Order Interface</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Staff Access Point</p>
                            <div className="grid grid-cols-1 gap-2">
                              {venue.staffViews.map((view) => (
                                <Button 
                                  key={view.url}
                                  variant="outline" 
                                  size="sm" 
                                  asChild
                                  className="h-9 justify-start text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Link href={view.url}>
                                    {view.icon}
                                    <span className="ml-2">{view.label}</span>
                                    <ExternalLink className="ml-auto h-3 w-3 opacity-30" />
                                  </Link>
                                </Button>
                              ))}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                asChild
                                className="h-9 justify-start text-[10px] font-black uppercase tracking-widest text-[#213147] hover:bg-slate-100"
                              >
                                <Link href={venue.adminUrl}>
                                  <LayoutDashboard className="h-3.5 w-3.5" />
                                  <span className="ml-2">Venue Admin</span>
                                  <ExternalLink className="ml-auto h-3 w-3 opacity-30" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-4 border-t bg-muted/5">
                          <Button asChild className="w-full justify-between h-11 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[10px]">
                            <Link href={venue.buyerUrl}>
                              Launch Patron Menu <PlayCircle className="h-4 w-4" />
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'system' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* GLOBAL SERVICE AUTHORIZATION */}
                    <Card className="border-2 shadow-sm overflow-hidden lg:col-span-2">
                      <CardHeader className="border-b bg-[#213147] text-white flex flex-row items-center gap-3">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Global Service Authorization</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase text-white/50">Restrict specific channels across the entire platform</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {SERVICE_MODES.map(mode => {
                            const isEnabled = globalEnabledModes.includes(mode);
                            return (
                              <div 
                                key={mode} 
                                onClick={() => toggleGlobalMode(mode)}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                  isEnabled 
                                    ? "border-primary bg-primary/5 shadow-md" 
                                    : "border-slate-100 opacity-50 grayscale"
                                )}
                              >
                                <div className={cn("p-2 rounded-xl", isEnabled ? "bg-primary text-white" : "bg-slate-200 text-slate-400")}>
                                  <Zap className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-[#213147] text-center">{mode}</span>
                                <Switch checked={isEnabled} className="data-[state=checked]:bg-primary" />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="border-b bg-primary/5">
                        <CardTitle className="font-black uppercase tracking-tight text-sm">Platform Branding</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase">Master logo across all venue portals</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-[3/1] bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/50 transition-all"
                        >
                          {logoPreview || config?.logoUrl ? (
                            <img src={logoPreview || config?.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-4" />
                          ) : (
                            <div className="text-center">
                              <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400 group-hover:text-primary transition-colors" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Select PNG Asset</p>
                            </div>
                          )}
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/png" onChange={handleLogoSelect} />
                        </div>
                        {logoPreview && (
                          <div className="flex gap-2">
                            <Button onClick={handleUploadLogo} disabled={isUploadingLogo} className="flex-1 font-black uppercase tracking-widest text-[10px]">Commit Branding</Button>
                            <Button variant="outline" onClick={() => setLogoPreview(null)} className="font-black uppercase tracking-widest text-[10px]">Discard</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="border-b bg-primary/5 flex flex-row items-center gap-3">
                        <Timer className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Global Timing Defaults</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase">Initial windows for new establishments</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-6">
                          {SERVICE_MODES.map(mode => {
                            const thresholds = systemThresholds[mode] || { warning: 15, max: 20 };
                            return (
                              <div key={mode} className="space-y-3 p-4 bg-slate-50 rounded-2xl border-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-[#213147] tracking-tight">{mode}</span>
                                  <Badge variant="outline" className="text-[8px] font-bold uppercase h-4 px-1">Global Standard</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1.5">
                                      <Label className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Warning (Min)</Label>
                                      <Input 
                                        type="number" 
                                        min="0"
                                        step="1"
                                        value={thresholds.warning} 
                                        onChange={e => handleThresholdChange(mode, 'warning', e.target.value)} 
                                        className="h-10 border-2 font-bold focus-visible:ring-amber-400"
                                      />
                                   </div>
                                   <div className="space-y-1.5">
                                      <Label className="text-[8px] font-black uppercase text-red-600 tracking-widest">Max Window (Min)</Label>
                                      <Input 
                                        type="number" 
                                        min="0"
                                        step="1"
                                        value={thresholds.max} 
                                        onChange={e => handleThresholdChange(mode, 'max', e.target.value)} 
                                        className="h-10 border-2 font-bold focus-visible:ring-red-600"
                                      />
                                   </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm overflow-hidden lg:col-span-2">
                      <CardHeader className="border-b bg-[#213147] text-white flex flex-row items-center gap-3">
                        <Satellite className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Operational Sync Protocols</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase text-white/50">Map behavior and interface refresh logic</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        {['Beverage Cart', 'Clubhouse'].map(mode => {
                          const settings = mapSettings[mode] || SYSTEM_DEFAULT_MAP_SETTINGS[mode];
                          return (
                            <div key={mode} className="space-y-6">
                              <div className="flex items-center gap-2 border-b-2 pb-2">
                                <h4 className="font-headline font-black text-xs uppercase text-[#213147]">{mode} Logic</h4>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Sync Frequency (Seconds)</Label>
                                  <div className="flex items-center gap-3">
                                    <Input 
                                      type="number"
                                      min="5"
                                      max="300"
                                      value={settings.frequencySeconds}
                                      onChange={e => handleMapSettingChange(mode, 'frequencySeconds', parseInt(e.target.value, 10) || 15)}
                                      className="h-11 border-2 font-bold"
                                    />
                                    <Badge variant="secondary" className="text-[8px] font-black h-5 uppercase">UI Cycle</Badge>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Tracking Stage Protocol</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {['Placed', 'Preparing', 'Out for Delivery', 'Delivered'].map(stage => (
                                      <div 
                                        key={stage} 
                                        onClick={() => toggleMapStage(mode, stage)}
                                        className={cn(
                                          "flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all",
                                          settings.activeStages.includes(stage) 
                                            ? "border-primary bg-primary/5" 
                                            : "border-slate-100 opacity-60"
                                        )}
                                      >
                                        <Checkbox checked={settings.activeStages.includes(stage)} />
                                        <span className="text-[9px] font-black uppercase text-[#213147]">{stage}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                      <CardFooter className="bg-slate-50 border-t p-6">
                        <Button 
                          onClick={handleUpdateSystemDefaults} 
                          disabled={isSavingSystemConfig} 
                          className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl"
                        >
                          {isSavingSystemConfig ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                          Commit Platform Operational Protocols
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        <aside className={cn(
          "bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-l-4 border-primary/20 shrink-0 shadow-2xl z-20",
          sidebarOpen ? "w-64" : "w-20"
        )}>
          <SideBarContent />
        </aside>
      </div>

      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-w-[95vw] rounded-[2rem] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 sm:p-10 space-y-8">
              <DialogHeader>
                <div className="flex items-center gap-4 text-left">
                  <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-headline font-black uppercase text-[#213147] text-2xl leading-none">{selectedVenue?.courseName}</DialogTitle>
                    <DialogDescription className="sr-only">Establishment registry management tools</DialogDescription>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest mt-1">{selectedVenue?.type}</Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="bg-slate-50 border-2 rounded-2xl p-6 text-left">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Venue Registry Management is under development.</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Establishment Name</Label><Input value={selectedVenue?.courseName || ''} readOnly className="border-2" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Registry Status</Label><Badge className="bg-green-600 h-10 w-full justify-center">Active</Badge></div>
                  </div>
                  <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Primary Registry ID</Label><code className="block p-3 bg-white border-2 rounded-xl text-xs font-mono">{selectedVenue?.id}</code></div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <Button onClick={() => setIsVenueDetailOpen(false)} className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest shadow-xl text-xs">
                  Return to Registry
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
