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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc, useUser } from '@/firebase';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, getDoc, getDocs, writeBatch, Timestamp, deleteDoc } from 'firebase/firestore';
import type { Seller, PlatformConfig, Order, Venue, SellerType, MapUpdateSettings, SellerAdminRole } from '@/lib/types';
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
import { format } from 'date-fns';

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

const inviteUserSchema = z.object({
  userName: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
});

type InviteUserData = z.infer<typeof inviteUserSchema>;

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

  // Ensure queries only execute when a user is authenticated
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

  const selectedVenueRef = useMemoFirebase(() => {
    if (!firestore || !selectedSeller?.id || !user) return null;
    return doc(firestore, 'venues', selectedSeller.id);
  }, [firestore, selectedSeller?.id, user]);
  const { data: selectedVenueData } = useDoc<Venue>(selectedVenueRef);

  const venueAdminsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedSeller?.id || !user) return null;
    return query(collection(firestore, 'roles_seller_admin'), where('sellerId', '==', selectedSeller.id));
  }, [firestore, selectedSeller?.id, user]);
  const { data: venueAdmins } = useCollection<SellerAdminRole>(venueAdminsQuery);

  const selectedVenueOrders = useMemo(() => {
    if (!orders || !selectedSeller?.id) return [];
    return orders.filter(o => o.sellerId === selectedSeller.id);
  }, [orders, selectedSeller?.id]);

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

  const inviteForm = useForm<InviteUserData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      userName: '',
      email: '',
    }
  });

  const handleCreateVenue = async (data: VenueRegistrationData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    
    const venueId = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const batch = writeBatch(firestore);

    // 1. Create Business Registry (Venues)
    const venueRef = doc(firestore, 'venues', venueId);
    const venuePayload = {
      venueId,
      name: data.name,
      ownerUid: data.ownerUid,
      patronConvenienceFee: 150, // Default $1.50
      platformFeeFixed: 20,      // Default $0.20
      platformFeePercent: 0,
      payoutsEnabled: false,
      stripeOnboardingComplete: false,
      isFoundingPartner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(venueRef, venuePayload);

    // 2. Create Operational Profile (Sellers)
    const sellerRef = doc(firestore, 'sellers', venueId);
    const isGolf = data.type.toLowerCase().includes('golf');
    
    // Inherit Global Timing Defaults
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

    // 3. Add initial Admin Role
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

  const handleInviteUser = async (data: InviteUserData) => {
    if (!firestore || !selectedSeller) return;
    setIsProcessingSave(true);
    
    const roleRef = doc(firestore, 'roles_seller_admin', data.email.toLowerCase());
    const payload = {
      userName: data.userName,
      email: data.email.toLowerCase(),
      sellerId: selectedSeller.id,
      courseName: selectedSeller.courseName,
      assignedAt: serverTimestamp(),
    };

    setDoc(roleRef, payload).then(async () => {
      toast({ title: "Admin Authorized", description: `${data.userName} now has management access.` });
      
      // Attempt to send invitation email (via Firebase reset flow)
      try {
        await sendPasswordResetEmail(auth!, data.email.toLowerCase());
        toast({ title: "Invitation Sent", description: "Password setup link dispatched via email." });
      } catch (err) {
        console.warn("Could not send setup email directly. User likely doesn't exist yet or config restriction.", err);
        toast({ variant: "destructive", title: "Email Pending", description: "User added to registry, but setup email requires manual trigger or existing account." });
      }
      
      inviteForm.reset();
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: roleRef.path,
        operation: 'create',
        requestResourceData: payload,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsProcessingSave(false);
    });
  };

  const handleRevokeAdmin = async (email: string) => {
    if (!firestore) return;
    const roleRef = doc(firestore, 'roles_seller_admin', email.toLowerCase());
    deleteDoc(roleRef).then(() => {
      toast({ title: "Access Revoked" });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: roleRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext));
    });
  };

  const handleUpdateVenueBusiness = async (venueId: string, updates: Partial<Venue>) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const venueRef = doc(firestore, 'venues', venueId);
    const updateData = { ...updates, updatedAt: serverTimestamp() };
    
    updateDoc(venueRef, updateData).then(() => {
      toast({ title: "Business Registry Updated" });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: venueRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    }).finally(() => {
      setIsProcessingSave(false);
    });
  };

  const handleUpdateSellerProfile = async (id: string, updates: Partial<Seller>) => {
    if (!firestore) return;
    const sellerRef = doc(firestore, 'sellers', id);
    const updateData = { ...updates, updatedAt: serverTimestamp() };
    updateDoc(sellerRef, updateData).then(() => {
      toast({ title: "Operational Profile Updated" });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sellerRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
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
      gpsFreshnessThresholds: gpsFreshness,
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
    if (value === '') {
      setSystemThresholds(prev => ({
        ...prev,
        [mode]: { ...prev[mode], [type]: 0 }
      }));
      return;
    }
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

  const handleGpsFreshnessChange = (field: 'hot' | 'warm' | 'cold', value: string) => {
    if (value === '') {
      setGpsFreshness(prev => ({ ...prev, [field]: 0 }));
      return;
    }
    const numValue = parseInt(value, 10);
    setGpsFreshness(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue
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
      title: 'Bowling Alley',
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
                                    className="text-[10px] font-black uppercase gap-1.5 h-8 hidden md:inline-flex"
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

                    {/* GPS FRESHNESS SETTINGS */}
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
                        <p className="text-[8px] font-bold text-muted-foreground uppercase leading-relaxed italic text-center">
                          Defines when location markers shift through signal health states.
                        </p>
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

      {/* DIALOG: ADD NEW VENUE */}
      <Dialog open={isAddVenueOpen} onOpenChange={setIsAddVenueOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
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

      {/* DIALOG: MANAGE VENUE DETAILS */}
      <Dialog open={isVenueDetailOpen} onOpenChange={setIsVenueDetailOpen}>
        <DialogContent className="sm:max-w-[800px] max-w-[95vw] h-[85vh] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl flex flex-col">
          <DialogHeader className="p-8 bg-slate-50 border-b relative shrink-0">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="font-headline font-black uppercase text-[#213147] text-2xl leading-none truncate pr-8">{selectedSeller?.courseName}</DialogTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5">{selectedSeller?.type}</Badge>
                  <Badge className="bg-green-600 uppercase text-[8px] font-black tracking-tight h-5">Registry Active</Badge>
                </div>
              </div>
            </div>
            <DialogDescription className="sr-only">Comprehensive venue business management tools</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 bg-slate-50 border-b overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent h-12 gap-6 p-0 w-max min-w-full">
                <TabsTrigger value="profile" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none font-black uppercase text-[10px] tracking-widest px-0">Profile</TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none font-black uppercase text-[10px] tracking-widest px-0">Users</TabsTrigger>
                <TabsTrigger value="menu" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none font-black uppercase text-[10px] tracking-widest px-0">Menu</TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none font-black uppercase text-[10px] tracking-widest px-0">Billing</TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none font-black uppercase text-[10px] tracking-widest px-0">Activity</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-8">
                {/* TAB: PROFILE */}
                <TabsContent value="profile" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 pb-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#213147]">Operational Profile</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Display Name</Label>
                        <Input 
                          value={selectedSeller?.courseName || ''} 
                          onChange={(e) => handleUpdateSellerProfile(selectedSeller!.id, { courseName: e.target.value })}
                          className="h-11 border-2 font-bold" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Primary Contact Email</Label>
                        <Input 
                          value={selectedSeller?.contactEmail || ''} 
                          onChange={(e) => handleUpdateSellerProfile(selectedSeller!.id, { contactEmail: e.target.value })}
                          className="h-11 border-2 font-bold" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Venue Type</Label>
                        <Select value={selectedSeller?.type} onValueChange={(v: SellerType) => handleUpdateSellerProfile(selectedSeller!.id, { type: v })}>
                          <SelectTrigger className="h-11 border-2 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sellerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Operational Status</Label>
                        <Select value={selectedSeller?.status} onValueChange={(v: 'Active'|'Inactive') => handleUpdateSellerProfile(selectedSeller!.id, { status: v })}>
                          <SelectTrigger className="h-11 border-2 font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: USERS */}
                <TabsContent value="users" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b-2 pb-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#213147]">Authorized Administrators</h4>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Invitation Form */}
                        <Card className="border-2 border-dashed bg-slate-50/50 p-6 rounded-3xl">
                           <div className="flex items-center gap-3 mb-6">
                              <MailPlus className="h-5 w-5 text-indigo-600" />
                              <h5 className="font-headline font-black text-xs uppercase text-[#213147]">Authorize New User</h5>
                           </div>
                           <Form {...inviteForm}>
                             <form onSubmit={inviteForm.handleSubmit(handleInviteUser)} className="space-y-4">
                                <FormField control={inviteForm.control} name="userName" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Full Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="Jane Doe" className="h-11 border-2 font-bold" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <FormField control={inviteForm.control} name="email" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Work Email</FormLabel>
                                    <FormControl><Input {...field} type="email" placeholder="jane@venue.com" className="h-11 border-2 font-bold" /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                                <Button type="submit" disabled={isProcessingSave} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest gap-2">
                                  {isProcessingSave ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                  Authorize & Invite
                                </Button>
                             </form>
                           </Form>
                        </Card>

                        {/* List of Admins */}
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Venue Personnel Registry</p>
                           <div className="space-y-3">
                              {venueAdmins?.map(admin => (
                                <div key={admin.email} className="bg-white p-4 rounded-2xl border-2 flex items-center justify-between group">
                                   <div className="flex items-center gap-4">
                                      <div className="bg-indigo-50 p-2 rounded-xl">
                                         <UserCircle className="h-6 w-6 text-indigo-600" />
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-xs font-black uppercase text-[#213147] truncate">{admin.userName}</p>
                                         <p className="text-[10px] font-bold text-muted-foreground truncate">{admin.email}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" title="Resend Invite" onClick={async () => {
                                        try {
                                          await sendPasswordResetEmail(auth!, admin.email);
                                          toast({ title: "Setup Link Sent" });
                                        } catch (e) {
                                          toast({ variant: "destructive", title: "Invite Failed" });
                                        }
                                      }}>
                                        <Key className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Revoke Access" onClick={() => handleRevokeAdmin(admin.email)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                   </div>
                                </div>
                              ))}
                              {venueAdmins?.length === 0 && (
                                <div className="py-12 text-center bg-slate-50 border-2 border-dashed rounded-3xl">
                                   <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">No authorized users yet</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2rem] space-y-4">
                       <div className="flex items-center gap-3">
                          <ShieldAlert className="h-5 w-5 text-amber-600" />
                          <h5 className="font-headline font-black text-xs uppercase text-amber-800">Master Identity Policy</h5>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase text-amber-800/60">Primary Owner manager UID</Label>
                             <div className="flex gap-2">
                                <Input 
                                  value={selectedVenueData?.ownerUid || ''} 
                                  onChange={(e) => handleUpdateVenueBusiness(selectedSeller!.id, { ownerUid: e.target.value })}
                                  className="h-11 border-2 border-amber-200 font-mono text-[10px] bg-white" 
                                />
                                <Button variant="outline" size="icon" className="h-11 w-11 border-2 border-amber-200 bg-white" onClick={() => {
                                  if (selectedVenueData?.ownerUid) {
                                    navigator.clipboard.writeText(selectedVenueData.ownerUid);
                                    toast({ title: "UID Copied" });
                                  }
                                }}><Copy className="h-3.5 w-3.5" /></Button>
                             </div>
                          </div>
                          <p className="text-[10px] font-bold text-amber-700/60 uppercase leading-relaxed italic">
                             The Master Identity has bypass permissions for setup tools. Daily operations should use individual email accounts.
                          </p>
                       </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: MENU */}
                <TabsContent value="menu" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 pb-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#213147]">Terminal Provisioning (Staff Access)</h4>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 p-6 rounded-3xl border-2 border-dashed">
                      <div className="bg-white p-3 rounded-3xl border-2 shadow-xl shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/sellers/${selectedSeller?.id}/staff-login`)}`}
                          alt="Staff QR"
                          width={140}
                          height={140}
                          className="rounded-xl w-32 h-32"
                        />
                      </div>
                      <div className="flex-1 space-y-4 text-center sm:text-left">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#213147]">Secure Staff Entry URL</p>
                          <code className="block p-2 bg-white border rounded-lg text-[10px] break-all border-slate-200">
                            {baseUrl}/sellers/{selectedSeller?.id}/staff-login
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <Button size="sm" className="bg-[#213147] font-black uppercase text-[9px] tracking-widest h-9 gap-2">
                            <Download className="h-3.5 w-3.5" /> Download Asset
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="text-[10px] font-black uppercase h-9 gap-1.5">
                            <Link href={`/sellers/${selectedSeller?.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" /> Launch Venue Terminal
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: BILLING */}
                <TabsContent value="billing" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b-2 pb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#213147]">Revenue & Fee Protocol</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Patron Conv. Fee (Cents)</Label>
                          <input 
                            type="number" 
                            value={selectedVenueData?.patronConvenienceFee || ''} 
                            onChange={(e) => handleUpdateVenueBusiness(selectedSeller!.id, { patronConvenienceFee: parseInt(e.target.value, 10) || 0 })}
                            className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                          <p className="text-[8px] font-bold text-primary uppercase">Current: ${((selectedVenueData?.patronConvenienceFee || 0) / 100).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Koop Fixed Fee (Cents)</Label>
                          <input 
                            type="number" 
                            value={selectedVenueData?.platformFeeFixed || ''} 
                            onChange={(e) => handleUpdateVenueBusiness(selectedSeller!.id, { platformFeeFixed: parseInt(e.target.value, 10) || 0 })}
                            className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                          <p className="text-[8px] font-bold text-indigo-600 uppercase">Fixed platform cut</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Koop variable (%)</Label>
                          <input 
                            type="number" 
                            value={selectedVenueData?.platformFeePercent || ''} 
                            onChange={(e) => handleUpdateVenueBusiness(selectedSeller!.id, { platformFeePercent: parseFloat(e.target.value) || 0 })}
                            className="flex h-11 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                          />
                          <p className="text-[8px] font-bold text-indigo-600 uppercase">Optional percentage</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
                            <div>
                              <p className="text-[10px] font-black uppercase text-amber-800 leading-none mb-1">Founding Partner</p>
                              <p className="text-[8px] font-bold text-amber-600 uppercase">Special Platform Status</p>
                            </div>
                          </div>
                          <Switch 
                            checked={selectedVenueData?.isFoundingPartner} 
                            onCheckedChange={(v) => handleUpdateVenueBusiness(selectedSeller!.id, { isFoundingPartner: v })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl space-y-2">
                          <p className="text-[9px] font-black uppercase text-indigo-700 tracking-widest">Stripe Connect ID</p>
                          <code className="block text-[10px] font-mono text-indigo-600 bg-white p-2 rounded-lg border border-indigo-100 truncate">
                            {selectedVenueData?.stripeConnectId || selectedVenueData?.stripeAccountId || 'NOT CONNECTED'}
                          </code>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className={cn(
                          "p-4 rounded-2xl border-2 flex items-center justify-between",
                          selectedVenueData?.payoutsEnabled ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-100"
                        )}>
                          <div className="flex items-center gap-3">
                            <Coins className={cn("h-5 w-5", selectedVenueData?.payoutsEnabled ? "text-green-600" : "text-slate-400")} />
                            <div>
                              <p className={cn("text-[10px] font-black uppercase leading-none mb-1", selectedVenueData?.payoutsEnabled ? "text-green-800" : "text-slate-500")}>
                                {selectedVenueData?.payoutsEnabled ? 'Payouts Enabled' : 'Payouts Restricted'}
                              </p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase">Manual Admin Override</p>
                            </div>
                          </div>
                          <Switch 
                            checked={selectedVenueData?.payoutsEnabled} 
                            onCheckedChange={(v) => handleUpdateVenueBusiness(selectedSeller!.id, { payoutsEnabled: v })}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: ACTIVITY */}
                <TabsContent value="activity" className="mt-0 space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 pb-2">
                      <Activity className="h-4 w-4 text-red-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#213147]">Venue Activity Log</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Lifetime Orders</p>
                        <p className="text-2xl font-black font-headline text-[#213147]">{selectedVenueOrders.length}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Gross Revenue</p>
                        <p className="text-2xl font-black font-headline text-green-600">${selectedVenueOrders.reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="overflow-x-auto no-scrollbar">
                        <Table className="min-w-[600px]">
                          <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                              <TableHead className="text-[9px] font-black uppercase">Order ID</TableHead>
                              <TableHead className="text-[9px] font-black uppercase">Date</TableHead>
                              <TableHead className="text-[9px] font-black uppercase">Customer</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedVenueOrders.slice(0, 5).map((o) => (
                              <TableRow key={o.id}>
                                <TableCell className="font-mono text-[10px] font-black">#{getNumericOrderId(o.id)}</TableCell>
                                <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{o.createdAt && typeof o.createdAt.toDate === 'function' ? format(o.createdAt.toDate(), 'MMM d') : 'N/A'}</TableCell>
                                <TableCell className="text-[10px] font-black text-[#213147] uppercase truncate max-w-[100px]">{o.customerName}</TableCell>
                                <TableCell className="text-right font-mono text-[10px] font-black text-primary">${o.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                            {selectedVenueOrders.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4} className="h-20 text-center text-[10px] font-bold text-muted-foreground uppercase">No order activity recorded.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="p-8 bg-slate-50 border-t shrink-0">
            <Button onClick={() => setIsVenueDetailOpen(false)} className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest shadow-xl text-[11px]">
              Commit Changes & Exit Maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
