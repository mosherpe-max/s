
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
  ShieldAlert,
  Coins,
  Wand2,
  Settings,
  MailPlus,
  Key,
  ThermometerSnowflake,
  Flame,
  CloudSun,
  AlertTriangle,
  Sparkles
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
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth, useDoc, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Seller, PlatformConfig, Order, Venue, MapUpdateSettings } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, getNumericOrderId, SUPER_ADMIN_ID } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { startOfMonth } from 'date-fns';
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
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { seedAllDemoData } from '@/lib/seed-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const SYSTEM_DEFAULT_GPS_THRESHOLDS = {
  hot: 60,   // 1 minute
  warm: 300,  // 5 minutes
  cold: 600   // 10 minutes
};

const SERVICE_MODES = ['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out'];

const venueRegistrationSchema = z.object({
  name: z.string().min(2, 'Establishment name required'),
  type: z.enum(sellerTypes as any),
  contactName: z.string().min(2, 'Contact name required'),
  contactEmail: z.string().email('Valid email required'),
  ownerUid: z.string().min(1, 'Initial Owner UID required for registry'),
});

type VenueRegistrationData = z.infer<typeof venueRegistrationSchema>;

const venueMaintenanceSchema = z.object({
  name: z.string().min(2, 'Establishment name required'),
  ownerUid: z.string().min(1, 'Owner UID required'),
  stripeConnectId: z.string().optional(),
  patronConvenienceFee: z.coerce.number().min(0),
  platformFeeFixed: z.coerce.number().min(0),
  platformFeePercent: z.coerce.number().min(0).max(100),
  monthlyPlatformFee: z.coerce.number().min(0),
  isFoundingPartner: z.boolean().default(false),
});

type VenueMaintenanceData = z.infer<typeof venueMaintenanceSchema>;

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
      <CardHeader className="pb-2 pt-5 px-4 sm:px-6">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2"><Icon className="h-3 w-3" /> {label}</span>
          {trend && <span className="text-green-500 font-bold flex items-center gap-0.5">{trend} <ArrowUpRight className="h-2 w-2" /></span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5 px-4 sm:px-6">
        <div className="text-2xl sm:text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function PlatformAdminPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isVenueDetailOpen, setIsVenueDetailOpen] = useState(false);
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isResettingDemos, setIsResettingDemos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- PLATFORM CONFIG STATE ---
  const [systemThresholds, setSystemThresholds] = useState<Record<string, { warning: number; max: number }>>(SYSTEM_DEFAULT_THRESHOLDS);
  const [mapSettings, setMapSettings] = useState<Record<string, MapUpdateSettings>>(SYSTEM_DEFAULT_MAP_SETTINGS);
  const [gpsFreshness, setGpsFreshness] = useState(SYSTEM_DEFAULT_GPS_THRESHOLDS);
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
    }
  }, []);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  // Fetch Venue Data for Maintenance
  const venueRef = useMemoFirebase(() => {
    if (!firestore || !selectedSeller?.id) return null;
    return doc(firestore, 'venues', selectedSeller.id);
  }, [firestore, selectedSeller?.id]);
  const { data: selectedVenueData } = useDoc<Venue>(venueRef);

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
    if (config?.gpsFreshnessThresholds) {
      setGpsFreshness({
        ...SYSTEM_DEFAULT_GPS_THRESHOLDS,
        ...config.gpsFreshnessThresholds
      });
    }
    if (config?.enabledModes) {
      setGlobalEnabledModes(config.enabledModes);
    }
  }, [config]);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'sellers'), limit(100));
  }, [firestore, user]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'orders'), limit(500), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

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
    const mtdGMV = mtdOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const mtdFees = mtdOrders.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
    return {
      venueCounts: { total: activeSellers.length },
      gmv: { mtd: mtdGMV },
      orders: { mtd: mtdOrders.length },
      fees: { mtd: mtdFees }
    };
  }, [sellers, orders]);

  const registrationForm = useForm<VenueRegistrationData>({
    resolver: zodResolver(venueRegistrationSchema),
    defaultValues: {
      name: '',
      type: 'Public Golf Course',
      contactName: '',
      contactEmail: '',
      ownerUid: '',
    }
  });

  const maintenanceForm = useForm<VenueMaintenanceData>({
    resolver: zodResolver(venueMaintenanceSchema),
    defaultValues: {
      name: '',
      ownerUid: '',
      stripeConnectId: '',
      patronConvenienceFee: 150,
      platformFeeFixed: 20,
      platformFeePercent: 0,
      monthlyPlatformFee: 0,
      isFoundingPartner: false,
    }
  });

  useEffect(() => {
    if (selectedVenueData) {
      maintenanceForm.reset({
        name: selectedVenueData.name || '',
        ownerUid: selectedVenueData.ownerUid || '',
        stripeConnectId: selectedVenueData.stripeConnectId || selectedVenueData.stripeAccountId || '',
        patronConvenienceFee: selectedVenueData.patronConvenienceFee || 150,
        platformFeeFixed: selectedVenueData.platformFeeFixed || 20,
        platformFeePercent: selectedVenueData.platformFeePercent || 0,
        monthlyPlatformFee: selectedVenueData.monthlyPlatformFee || 0,
        isFoundingPartner: selectedVenueData.isFoundingPartner || false,
      });
    }
  }, [selectedVenueData, maintenanceForm]);

  const handleCreateVenue = async (data: VenueRegistrationData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    
    const venueId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const batch = writeBatch(firestore);

    const venueRef = doc(firestore, 'venues', venueId);
    const venuePayload = {
      venueId,
      name: data.name,
      ownerUid: data.ownerUid,
      patronConvenienceFee: 150, 
      platformFeeFixed: 20,      
      platformFeePercent: 0,
      monthlyPlatformFee: 0,
      payoutsEnabled: false,
      stripeOnboardingComplete: false,
      isFoundingPartner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(venueRef, venuePayload);

    const sellerRef = doc(firestore, 'sellers', venueId);
    const isGolf = data.type.toLowerCase().includes('golf');
    const initialThresholds = config?.defaultThresholds || SYSTEM_DEFAULT_THRESHOLDS;

    const sellerPayload = {
      id: venueId,
      courseName: data.name,
      type: data.type,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: '',
      status: 'Active',
      serviceFee: 1.50,
      taxRate: 6.0,
      menuTypes: isGolf ? ['Beverage Cart', 'Clubhouse', 'Take Out'] : ['Lane Delivery', 'Take Out'],
      bevcartActive: false,
      clubhouseActive: false,
      lanedeliveryActive: false,
      takeoutActive: false,
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      latitude: 0,
      longitude: 0,
      orderThresholds: initialThresholds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(sellerRef, sellerPayload);

    const roleRef = doc(firestore, 'roles_seller_admin', data.contactEmail.toLowerCase());
    batch.set(roleRef, {
      userName: data.contactName,
      email: data.contactEmail.toLowerCase(),
      sellerId: venueId,
      courseName: data.name,
      assignedAt: serverTimestamp(),
    });

    batch.commit().then(() => {
      toast({ title: "Venue Created", description: `${data.name} has been added to the Koop platform.` });
      setIsAddVenueOpen(false);
      registrationForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `venues/${venueId}`,
        operation: 'create',
        requestResourceData: venuePayload,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsProcessingSave(false);
    });
  };

  const handleSaveVenueMaintenance = async (data: VenueMaintenanceData) => {
    if (!firestore || !selectedSeller?.id) return;
    setIsProcessingSave(true);

    const vRef = doc(firestore, 'venues', selectedSeller.id);
    const sRef = doc(firestore, 'sellers', selectedSeller.id);
    const batch = writeBatch(firestore);

    batch.update(vRef, {
      name: data.name,
      ownerUid: data.ownerUid,
      stripeConnectId: data.stripeConnectId || null,
      stripeAccountId: data.stripeConnectId || null,
      patronConvenienceFee: data.patronConvenienceFee,
      platformFeeFixed: data.platformFeeFixed,
      platformFeePercent: data.platformFeePercent,
      monthlyPlatformFee: data.monthlyPlatformFee,
      isFoundingPartner: data.isFoundingPartner,
      updatedAt: serverTimestamp()
    });

    batch.update(sRef, {
      courseName: data.name,
      isFoundingPartner: data.isFoundingPartner,
      updatedAt: serverTimestamp()
    });

    batch.commit().then(() => {
      toast({ title: "Venue Registry Updated" });
      setIsVenueDetailOpen(false);
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: vRef.path,
        operation: 'update',
        requestResourceData: data,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsProcessingSave(false);
    });
  };

  const handleResetDemos = async () => {
    if (!firestore) return;
    setIsResettingDemos(true);
    try {
      await seedAllDemoData(firestore);
      toast({ title: "Demos Reseeded", description: "All demo venues now feature comprehensive master menus with linked modifier sets." });
    } catch (e) {
      toast({ variant: "destructive", title: "Reset Failed", description: "Authorization required to rebuild core demo indices." });
    } finally {
      setIsResettingDemos(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
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
      gpsFreshnessThresholds: gpsFreshness,
      enabledModes: globalEnabledModes,
      updatedAt: serverTimestamp()
    };
    setDoc(platformDocRef, updateData, { merge: true }).then(() => {
      toast({ title: "System Defaults Updated" });
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThresholdChange = (mode: string, field: 'warning' | 'max', val: string) => {
    const num = parseInt(val, 10) || 0;
    setSystemThresholds(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [field]: num }
    }));
  };

  const handleGpsFreshnessChange = (field: 'hot' | 'warm' | 'cold', val: string) => {
    const num = parseInt(val, 10) || 0;
    setGpsFreshness(prev => ({ ...prev, [field]: num }));
  };

  const handleMapSettingChange = (mode: string, field: keyof MapUpdateSettings, val: any) => {
    setMapSettings(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [field]: val }
    }));
  };

  const toggleMapStage = (mode: string, stage: string) => {
    const current = mapSettings[mode]?.activeStages || [];
    const next = current.includes(stage) ? current.filter(s => s !== stage) : [...current, stage];
    handleMapSettingChange(mode, 'activeStages', next);
  };

  const toggleGlobalMode = (mode: string) => {
    const next = globalEnabledModes.includes(mode) ? globalEnabledModes.filter(m => m !== mode) : [...globalEnabledModes, mode];
    setGlobalEnabledModes(next);
  };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#213147] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Securing Session...</p>
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

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
        <div className="mt-auto border-t border-white/5 p-4 shrink-0 space-y-4">
          {showLabels && (
            <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-white truncate uppercase tracking-tight">Platform Admin</span>
                  <span className="text-[8px] font-bold text-slate-400 truncate uppercase">{user?.email}</span>
                </div>
              </div>
            </div>
          )}
          {!isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
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
      staffEntryUrl: '/sellers/demo-course/staff-login',
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
      staffEntryUrl: '/sellers/demo-private-course/staff-login',
      adminUrl: '/sellers/demo-private-course',
      staffViews: [
        { label: 'Staff Entry', url: '/sellers/demo-private-course/staff-login', icon: <ShieldCheck className="h-3.5 w-3.5" /> }
      ]
    },
    {
      id: 'demo-bowling-alley',
      title: 'Bowling Center',
      sub: 'In-Game Food & Drinks',
      type: 'Laneside Service',
      gradient: 'from-pink-600 to-rose-500',
      icon: <Smartphone className="text-white/20 h-16 w-16 absolute -right-2 -top-2" />,
      buyerUrl: '/sellers/demo-bowling-alley/order?menuType=Lane Delivery',
      staffEntryUrl: '/sellers/demo-bowling-alley/staff-login',
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className={cn(
          "bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0 shadow-2xl z-20",
          sidebarOpen ? "w-64" : "w-20"
        )}>
          <SideBarContent />
        </aside>

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
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex-1 flex bg-white p-3 sm:p-4 rounded-2xl border-2 shadow-sm gap-4 items-center w-full min-w-0">
                      <Search className="h-4 w-4 text-muted-foreground ml-1 sm:ml-2 shrink-0" />
                      <Input 
                        placeholder="Search registry by venue name..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm font-medium p-0 h-auto flex-1" 
                      />
                    </div>
                    <Button 
                      onClick={() => setIsAddVenueOpen(true)} 
                      className="bg-primary hover:bg-primary/90 h-12 md:h-14 px-6 md:px-8 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest gap-2 shadow-xl shadow-primary/20 w-full md:w-auto shrink-0"
                    >
                      <Plus className="h-4 w-4" /> Register New Establishment
                    </Button>
                  </div>
                  
                  <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                      <Table className="min-w-[700px] md:min-w-full">
                        <TableHeader className="bg-slate-50 border-b">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase py-4">Establishment</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Type</TableHead>
                            <TableHead className="text-[10px] font-black uppercase hidden sm:table-cell">Contact</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sellers?.filter(s => s.courseName.toLowerCase().includes(searchTerm.toLowerCase())).map((venue) => (
                            <TableRow key={venue.id} className="group hover:bg-slate-50/50">
                              <TableCell className="py-4">
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
                              <TableCell className="text-[10px] font-medium hidden sm:table-cell">{venue.contactName}</TableCell>
                              <TableCell><Badge className={cn(venue.status === 'Active' ? 'bg-green-600' : 'bg-slate-300')}>{venue.status}</Badge></TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => { setSelectedSeller(venue); setIsVenueDetailOpen(true); }} 
                                    className="text-[10px] font-black uppercase gap-1.5 h-8 border-2"
                                  >
                                    <Settings className="h-3 w-3" /> Maintain
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    asChild
                                    className="text-[10px] font-black uppercase gap-1.5 h-8"
                                  >
                                    <Link href={`/sellers/${venue.id}`}>
                                      <ExternalLink className="h-3 w-3" /> Terminal
                                    </Link>
                                  </Button>
                                </div>
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
                  <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="bg-amber-50 p-3 rounded-2xl"><Sparkles className="h-6 w-6 text-amber-500" /></div>
                        <div>
                           <h3 className="font-headline font-black text-lg uppercase text-[#213147]">Demo System Control</h3>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Provision and reset standardized environments</p>
                        </div>
                     </div>
                     <Button 
                       onClick={handleResetDemos} 
                       disabled={isResettingDemos}
                       className="h-12 bg-amber-500 hover:bg-amber-600 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-amber-500/20"
                     >
                       {isResettingDemos ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                       Reseed & Reset All Demo Environments
                     </Button>
                  </div>

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
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center gap-3 bg-muted/30 p-3 rounded-2xl border-2 border-dashed">
                              <div className="bg-white p-1.5 rounded-xl border-2 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}${venue.buyerUrl}`}
                                  alt="Patron QR"
                                  width={100}
                                  height={100}
                                  className="rounded-lg w-24 h-24"
                                />
                              </div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <ShoppingBag className="h-2 w-2" /> Patron Menu
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-3 bg-indigo-50/50 p-3 rounded-2xl border-2 border-indigo-100/50 border-dashed">
                              <div className="bg-white p-1.5 rounded-xl border-2 shadow-sm hover:scale-105 transition-transform cursor-pointer">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}${venue.staffEntryUrl}`}
                                  alt="Staff QR"
                                  width={100}
                                  height={100}
                                  className="rounded-lg w-24 h-24"
                                />
                              </div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                                <ShieldCheck className="h-2 w-2" /> Staff Entry
                              </p>
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
                            <Button variant="outline" onClick={() => setLogoPreview(null)} className="font-black uppercase tracking-widest text-[11px]">Discard</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="border-b bg-primary/5 flex flex-row items-center gap-3">
                        <Satellite className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="font-black uppercase tracking-tight text-sm">GPS Freshness Protocol</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase">Signal Health Thresholds (Seconds)</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-green-600 tracking-widest flex items-center gap-1 text-center justify-center">
                              <CheckCircle2 className="h-2 w-2" /> Hot (Good)
                            </Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={gpsFreshness.hot || ''} 
                              onChange={e => handleGpsFreshnessChange('hot', e.target.value)} 
                              className="h-10 border-2 font-bold focus-visible:ring-green-500 border-green-100 text-center"
                            />
                            <p className="text-[8px] sm:text-[10px] font-bold text-green-600/60 text-center">{"<"} {gpsFreshness.hot}s</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-1 text-center justify-center">
                              <AlertTriangle className="h-2 w-2" /> Warm (Concern)
                            </Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={gpsFreshness.warm || ''} 
                              onChange={e => handleGpsFreshnessChange('warm', e.target.value)} 
                              className="h-10 border-2 font-bold focus-visible:ring-amber-500 border-amber-100 text-center"
                            />
                            <p className="text-[8px] sm:text-[10px] font-bold text-amber-600/60 text-center">{"<"} {gpsFreshness.warm}s</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[8px] font-black uppercase text-red-600 tracking-widest flex items-center gap-1 text-center justify-center">
                              <Flame className="h-2 w-2" /> Cold (Bad)
                            </Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={gpsFreshness.cold || ''} 
                              onChange={e => handleGpsFreshnessChange('cold', e.target.value)} 
                              className="h-10 border-2 font-bold focus-visible:ring-red-500 border-red-100 text-center"
                            />
                            <p className="text-[8px] sm:text-[10px] font-bold text-red-600/60 text-center">{"<"} {gpsFreshness.cold}s</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm overflow-hidden">
                      <CardHeader className="border-b bg-primary/5 flex flex-row items-center gap-3">
                        <Timer className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="font-black uppercase tracking-tight text-sm">Global Order Duration Thresholds</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase">Initial windows for new establishments</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                          {SERVICE_MODES.map(mode => {
                            const thresholds = systemThresholds[mode] || { warning: 15, max: 20 };
                            return (
                              <div key={mode} className="space-y-3 p-4 bg-slate-50 rounded-2xl border-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-[#213147] tracking-tight">{mode}</span>
                                  <Badge variant="outline" className="text-[8px] font-bold uppercase h-4 px-1">Global Default</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1.5">
                                      <Label className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Warning (Min)</Label>
                                      <Input 
                                        type="number" 
                                        min="0"
                                        step="1"
                                        value={thresholds.warning || ''} 
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
                                        value={thresholds.max || ''} 
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
                                      value={settings.frequencySeconds || ''}
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
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </main>
      </div>

      <Dialog open={isAddVenueOpen} onOpenChange={setIsAddVenueOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-2xl leading-none">Venue Registration</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Provision a new business registry and operational terminal</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8">
              <Form {...registrationForm}>
                <form onSubmit={registrationForm.handleSubmit(handleCreateVenue)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={registrationForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Establishment Name</FormLabel>
                        <FormControl><Input {...field} placeholder="Oak Ridge Country Club" className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={registrationForm.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Venue Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {sellerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                    <FormField control={registrationForm.control} name="contactName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Primary Contact</FormLabel>
                        <FormControl><Input {...field} placeholder="Full Name" className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={registrationForm.control} name="contactEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Business Email</FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="manager@venue.com" className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={registrationForm.control} name="ownerUid" render={({ field }) => (
                    <FormItem className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/10">
                      <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Initial Manager Identity (Auth UID)</FormLabel>
                      <div className="flex gap-2">
                        <FormControl><Input {...field} placeholder="Firebase Auth UID" className="h-11 border-2 font-mono text-[10px]" /></FormControl>
                        <Button type="button" variant="outline" size="icon" className="h-11 w-11 border-2 shrink-0" onClick={() => registrationForm.setValue('ownerUid', 'god-mode-test-uid')} title="Quick Test UID"><Wand2 className="h-4 w-4" /></Button>
                      </div>
                      <FormDescription className="text-[9px] font-bold uppercase text-primary/60">This UID will have master permissions for this specific venue.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-16 bg-[#213147] hover:bg-black font-black uppercase tracking-[0.2em] text-xs shadow-2xl gap-3">
                    {isProcessingSave ? <Loader2 className="animate-spin h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    Initialize Platform Entry
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* VENUE MAINTENANCE DIALOG */}
      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shrink-0">
                <Settings2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl leading-none">Venue Maintenance</DialogTitle>
                <DialogDescription className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">
                  Adjust platform registry and financial settings for {selectedSeller?.courseName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8">
              <Form {...maintenanceForm}>
                <form onSubmit={maintenanceForm.handleSubmit(handleSaveVenueMaintenance)} className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField control={maintenanceForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Public Name</FormLabel>
                        <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={maintenanceForm.control} name="ownerUid" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Owner UID</FormLabel>
                        <FormControl><Input {...field} className="h-12 border-2 font-mono text-[10px]" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-b-2 pb-2">
                       <CreditCard className="h-4 w-4 text-indigo-600" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Financial Integration</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <FormField control={maintenanceForm.control} name="stripeConnectId" render={({ field }) => (
                         <FormItem>
                           <FormLabel className="text-[10px] font-black uppercase tracking-widest">Stripe Connect ID</FormLabel>
                           <FormControl><Input {...field} placeholder="acct_..." className="h-11 border-2 font-mono text-[10px]" /></FormControl>
                           <FormDescription className="text-[8px] font-bold uppercase text-muted-foreground">The Express account ID for payouts.</FormDescription>
                           <FormMessage />
                         </FormItem>
                       )} />
                       <FormField control={maintenanceForm.control} name="monthlyPlatformFee" render={({ field }) => (
                         <FormItem>
                           <FormLabel className="text-[10px] font-black uppercase tracking-widest">Monthly Platform Fee ($)</FormLabel>
                           <FormControl><Input {...field} type="number" step="0.01" className="h-11 border-2 font-bold" /></FormControl>
                           <FormDescription className="text-[8px] font-bold uppercase text-muted-foreground">The recurring subscription cost for this venue.</FormDescription>
                           <FormMessage />
                         </FormItem>
                       )} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={maintenanceForm.control} name="patronConvenienceFee" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-widest">Patron Fee (Cents)</FormLabel>
                          <FormControl><Input {...field} type="number" className="h-10 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[7px] font-bold">Total added at checkout.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={maintenanceForm.control} name="platformFeeFixed" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-widest">Koop Fixed (Cents)</FormLabel>
                          <FormControl><Input {...field} type="number" className="h-10 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[7px] font-bold">Koop's flat cut per order.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={maintenanceForm.control} name="platformFeePercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase tracking-widest">Koop Percent (%)</FormLabel>
                          <FormControl><Input {...field} type="number" step="0.1" className="h-10 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[7px] font-bold">Koop's volume cut.</FormDescription>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border-2 border-amber-100">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5 text-amber-500 fill-current" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-800">Founding Partner</p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase">Displays elite badge across patron interface</p>
                      </div>
                    </div>
                    <FormField control={maintenanceForm.control} name="isFoundingPartner" render={({ field }) => (
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500" />
                      </FormControl>
                    )} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button type="submit" disabled={isProcessingSave} className="flex-1 h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                      {isProcessingSave ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Commit Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsVenueDetailOpen(false)} className="h-14 px-8 border-2 font-black uppercase tracking-widest text-[11px]">
                      Discard
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
