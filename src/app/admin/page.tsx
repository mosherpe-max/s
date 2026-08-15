
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  Store, 
  Plus,
  Loader2,
  Settings2,
  MapPin,
  Zap,
  LogOut,
  Search,
  Users,
  Save,
  LayoutDashboard,
  BarChart3,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Activity,
  Briefcase,
  Database,
  Image as LucideImage,
  Trash2,
  Menu,
  Smartphone,
  PlayCircle,
  Lock,
  Timer,
  Satellite,
  ShieldAlert,
  Settings,
  AlertTriangle,
  Sparkles,
  Library,
  Tags,
  X,
  Edit,
  UtensilsCrossed,
  LayoutList,
  Power,
  PanelLeft,
  ChevronRightSquare,
  Globe,
  BellRing,
  ShieldCheck,
  Mail,
  Clock,
  ExternalLink,
  CreditCard,
  HeartPulse,
  ClipboardList,
  User,
  Percent,
  CheckCircle2,
  Banknote,
  Phone,
  Home,
  Flame,
  UserX,
  QrCode,
  ArrowRight,
  Target,
  BarChart,
  ClipboardCheck,
  Building,
  Upload,
  FileSpreadsheet,
  Download,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Table as ShadcnTable,
  TableBody as ShadcnTableBody,
  TableCell as ShadcnTableCell,
  TableHead as ShadcnTableHead,
  TableHeader as ShadcnTableHeader,
  TableRow as ShadcnTableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth, useDoc, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import type { Seller, SolutionConfig, Order, Venue, StarterModifierGroup, StarterMenuItem, OrderFulfillmentThresholds, Lead, LeadStage, PaymentMethodType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { useIsMobile } from '@/hooks/use-mobile';
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
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

const leadSchema = z.object({
  venueName: z.string().min(2, 'Venue name required'),
  venueType: z.enum(['Golf Course', 'Bowling Center']),
  stage: z.enum(['Cold Lead', 'On-Site Meeting', 'Demo', 'Offer', 'Closed', 'Dead']),
  streetAddress: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  zip: z.string().default(''),
  county: z.string().default(''),
  contactName: z.string().min(2, 'Contact name required'),
  phone: z.string().default(''),
  email: z.string().email('Valid email required'),
  marketFitData: z.object({
    golf: z.object({
      hasBevCart: z.boolean().default(false),
      hasClubhouseKitchen: z.boolean().default(false),
      roundsAnnually: z.coerce.number().default(0),
      bevCartAnnualRevenue: z.coerce.number().default(0),
    }).optional(),
    bowling: z.object({
      hasBar: z.boolean().default(false),
      hasKitchen: z.boolean().default(false),
      lanesCount: z.coerce.number().default(0),
      fbAnnualRevenue: z.coerce.number().default(0),
    }).optional(),
  }).default({}),
});

type LeadFormData = z.infer<typeof leadSchema>;

const starterModifierSchema = z.object({
  name: z.string().min(2, 'Group name required'),
  venueType: z.array(z.string()).min(1, 'Select at least one venue type'),
  category: z.enum(['food', 'beverage', 'universal']),
  selectionType: z.enum(['single', 'multi']),
  required: z.boolean().default(false),
  sortOrder: z.coerce.number().default(0),
  options: z.array(z.object({
    label: z.string().min(1, 'Label required'),
    priceModifier: z.coerce.number().min(0)
  })).min(1, 'At least one option required')
});

type StarterModifierFormData = z.infer<typeof starterModifierSchema>;

const starterMenuItemSchema = z.object({
  name: z.string().min(2, 'Item name required'),
  description: z.string().default(''),
  price: z.coerce.number().min(0),
  category: z.string().min(1, 'Category required'),
  venueType: z.array(z.string()).min(1, 'Select at least one venue type'),
  serviceMode: z.enum(['beverageCart', 'clubhouse', 'laneService']),
  suggestedModifierGroups: z.array(z.string()).default([]),
  sortOrder: z.coerce.number().default(0),
  imageUrl: z.string().default(''),
});

type StarterMenuItemFormData = z.infer<typeof starterMenuItemSchema>;

const venueSettingsSchema = z.object({
  name: z.string().min(2, 'Venue name required'),
  ownerUid: z.string().min(1, 'Owner UID required'),
  type: z.enum(['Golf Course', 'Bowling Center']),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  streetAddress: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  state: z.string().min(1, 'State required'),
  zip: z.string().min(1, 'Zip required'),
  contactName: z.string().min(1, 'Contact name required'),
  contactPhone: z.string().min(1, 'Contact phone required'),
  contactEmail: z.string().email('Valid contact email required'),
  stripeAccountId: z.string().optional().nullable(),
  stripeConnectId: z.string().optional().nullable(),
  solutionFeeFixed: z.coerce.number().min(0),
  solutionFeePercent: z.coerce.number().min(0),
  patronConvenienceFee: z.coerce.number().min(0),
  monthlySolutionFee: z.coerce.number().min(0),
  stripeOnboardingComplete: z.boolean().default(false),
  payoutsEnabled: z.boolean().default(false),
  isFoundingPartner: z.boolean().default(false),
  enabledPaymentMethods: z.array(z.string()).min(1, 'Select at least one payment method'),
});

type VenueSettingsFormData = z.infer<typeof venueSettingsSchema>;

const NAV_ITEMS = [
  { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
  { id: "sales", label: "Sales CRM", icon: Target },
  { id: "venues", label: "Venue Management", icon: Store },
  { id: "library", label: "Global Library", icon: Library },
  { id: "system", label: "System Control", icon: Settings2 },
  { id: "demos", label: "Sales Demos", icon: Zap },
];

const DEMO_VENUES = [
  {
    id: 'demo-course',
    title: 'Public Golf Menu',
    sub: 'The Koop National (Public)',
    type: 'Golf',
    menuUrl: '/sellers/demo-course/order?menuType=Beverage Cart',
    staffUrl: '/sellers/demo-course/staff-login',
    adminUrl: '/sellers/demo-course',
    gradient: 'from-indigo-600 to-blue-500'
  },
  {
    id: 'demo-private-course',
    title: 'Private Golf Menu',
    sub: 'Orchard Lake CC (Private)',
    type: 'Golf',
    menuUrl: '/sellers/demo-private-course/order?menuType=Clubhouse',
    staffUrl: '/sellers/demo-private-course/staff-login',
    adminUrl: '/sellers/demo-private-course',
    gradient: 'from-[#213147] to-slate-700'
  },
  {
    id: 'demo-bowling-alley',
    title: 'Bowling Center',
    sub: 'Strike City Lanes',
    type: 'Bowling',
    menuUrl: '/sellers/demo-bowling-alley/order?menuType=Lane Delivery',
    staffUrl: '/sellers/demo-bowling-alley/staff-login',
    adminUrl: '/sellers/demo-bowling-alley',
    gradient: 'from-pink-600 to-rose-500'
  }
];

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

export default function SolutionAdminPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [libraryTab, setLibraryTab] = useState<'modifiers' | 'items'>('modifiers');
  const [isLibraryFormOpen, setIsLibraryFormOpen] = useState(false);
  const [isItemLibraryFormOpen, setIsItemLibraryFormOpen] = useState(false);
  const [editingLibraryItem, setEditingLibraryItem] = useState<StarterModifierGroup | null>(null);
  const [editingItemTemplate, setEditingItemTemplate] = useState<StarterMenuItem | null>(null);

  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isVenueSettingsOpen, setIsVenueSettingsOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);

  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isInitializingLibrary, setIsInitializingLibrary] = useState(false);
  const [isReseedingDemos, setIsReseedingDemos] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);
  const [isWipingPatrons, setIsWipingPatrons] = useState(false);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  // System Config State
  const [configData, setConfigData] = useState<Partial<SolutionConfig>>({
    supportEmail: '',
    logoUrl: '',
    dailyResetHour: 4,
    smsNotificationsEnabled: true,
    gpsFreshnessThresholds: { hot: 60, warm: 300, cold: 600 },
    venueHealthSettings: {
      warningManagerInactivityDays: 3,
      warningVenueInactivityDays: 7
    },
    orderThresholds: {
      'Beverage Cart': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 },
      'Clubhouse': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 20, maxOrderProcessingMinutes: 30 },
      'Lane Delivery': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 10, maxOrderProcessingMinutes: 15 }
    },
    enabledModes: ['Beverage Cart', 'Clubhouse', 'Lane Delivery']
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: remoteConfig } = useDoc<SolutionConfig>(configRef);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (remoteConfig) {
      setConfigData({
        ...remoteConfig,
        gpsFreshnessThresholds: remoteConfig.gpsFreshnessThresholds || { hot: 60, warm: 300, cold: 600 },
        venueHealthSettings: remoteConfig.venueHealthSettings || {
          warningManagerInactivityDays: 3,
          warningVenueInactivityDays: 7
        },
        orderThresholds: remoteConfig.orderThresholds || {
          'Beverage Cart': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 },
          'Clubhouse': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 20, maxOrderProcessingMinutes: 30 },
          'Lane Delivery': { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 10, maxOrderProcessingMinutes: 15 }
        },
        enabledModes: remoteConfig.enabledModes || ['Beverage Cart', 'Clubhouse', 'Lane Delivery']
      });
    }
  }, [remoteConfig]);

  const handleSaveConfig = async () => {
    if (!firestore) return;
    setIsSavingConfig(true);
    try {
      await updateDoc(doc(firestore, 'solution', 'config'), {
        ...configData,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Configuration Saved", description: "Global system settings updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save Failed", description: e.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const updateThreshold = (mode: string, field: keyof OrderFulfillmentThresholds, value: number) => {
    setConfigData(prev => ({
      ...prev,
      orderThresholds: {
        ...prev.orderThresholds,
        [mode]: {
          ...(prev.orderThresholds?.[mode] || { maxOrderAcknowledgeSeconds: 120, warningOrderProcessingMinutes: 15, maxOrderProcessingMinutes: 25 }),
          [field]: value
        }
      }
    }));
  };

  const libraryQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_modifier_library') : null), [firestore]);
  const itemLibQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_menu_item_library') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const leadsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'leads') : null), [firestore]);

  const { data: libraryItems } = useCollection<StarterModifierGroup>(libraryQuery);
  const { data: itemLibrary } = useCollection<StarterMenuItem>(itemLibQuery);
  const { data: venues } = useCollection<Seller>(venuesQuery);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const libraryForm = useForm<StarterModifierFormData>({
    resolver: zodResolver(starterModifierSchema),
    defaultValues: { name: '', venueType: ['golf', 'bowling'], category: 'food', selectionType: 'single', required: false, sortOrder: 0, options: [{ label: '', priceModifier: 0 }] }
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: libraryForm.control, name: "options" });

  const itemLibraryForm = useForm<StarterMenuItemFormData>({
    resolver: zodResolver(starterMenuItemSchema),
    defaultValues: { name: '', description: '', price: 0, category: 'food', venueType: ['golf'], serviceMode: 'beverageCart', suggestedModifierGroups: [], sortOrder: 0, imageUrl: '' }
  });

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      venueName: '',
      venueType: 'Golf Course',
      stage: 'Cold Lead',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      county: '',
      contactName: '',
      phone: '',
      email: '',
      marketFitData: {
        golf: { hasBevCart: false, hasClubhouseKitchen: false, roundsAnnually: 0, bevCartAnnualRevenue: 0 },
        bowling: { hasBar: false, hasKitchen: false, lanesCount: 0, fbAnnualRevenue: 0 }
      }
    }
  });

  const venueSettingsForm = useForm<VenueSettingsFormData>({
    resolver: zodResolver(venueSettingsSchema),
    defaultValues: { 
      name: '', 
      ownerUid: '', 
      type: 'Golf Course',
      status: 'Active',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      stripeAccountId: '', 
      stripeConnectId: '', 
      solutionFeeFixed: 0, 
      solutionFeePercent: 0, 
      patronConvenienceFee: 150, 
      monthlySolutionFee: 0, 
      stripeOnboardingComplete: false, 
      payoutsEnabled: false, 
      isFoundingPartner: false,
      enabledPaymentMethods: ['Pay at Delivery', 'Digital Payment']
    }
  });

  const handleSaveLead = async (data: LeadFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingLead?.id || Math.random().toString(36).substr(2, 9);
    
    const finalData = {
      ...data,
      id,
      updatedAt: serverTimestamp(),
      createdAt: editingLead?.createdAt || serverTimestamp()
    };

    setDoc(doc(firestore, 'leads', id), finalData, { merge: true })
      .then(() => {
        toast({ title: editingLead ? "Lead Updated" : "Lead Created" });
        setIsLeadFormOpen(false);
        setEditingLead(null);
      })
      .finally(() => setIsProcessingSave(false));
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore) return;

    setIsProcessingSave(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) throw new Error("Spreadsheet is empty");

        const batch = writeBatch(firestore);
        let count = 0;

        data.forEach((row: any) => {
          const id = Math.random().toString(36).substr(2, 9);
          const leadRef = doc(firestore, 'leads', id);
          
          const leadType = row.venueType || row.Type || 'Golf Course';
          const stage = row.stage || row.Stage || 'Cold Lead';

          const leadData = {
            id,
            venueName: row.venueName || row['Venue Name'] || 'Unknown Venue',
            venueType: leadType,
            stage,
            streetAddress: row.streetAddress || row['Street Address'] || '',
            city: row.city || row['City'] || '',
            state: row.state || row['State'] || '',
            zip: row.zip || row['Zip'] || '',
            county: row.county || row['County'] || '',
            contactName: row.contactName || row['Contact Name'] || 'Main Contact',
            phone: row.phone || row['Phone'] || '',
            email: row.email || row['Email'] || '',
            marketFitData: {
              golf: {
                hasBevCart: row.golf_hasBevCart === 'Yes' || row.golf_hasBevCart === true,
                hasClubhouseKitchen: row.golf_hasClubhouseKitchen === 'Yes' || row.golf_hasClubhouseKitchen === true,
                roundsAnnually: Number(row.golf_roundsAnnually) || 0,
                bevCartAnnualRevenue: Number(row.golf_bevCartAnnualRevenue) || 0,
              },
              bowling: {
                hasBar: row.bowling_hasBar === 'Yes' || row.bowling_hasBar === true,
                hasKitchen: row.bowling_hasKitchen === 'Yes' || row.bowling_hasKitchen === true,
                lanesCount: Number(row.bowling_lanesCount) || 0,
                fbAnnualRevenue: Number(row.bowling_fbAnnualRevenue) || 0,
              }
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(leadRef, leadData);
          count++;
        });

        await batch.commit();
        toast({ title: "Batch Import Complete", description: `Successfully added ${count} leads to the database.` });
        setIsImportDialogOpen(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Import Failed", description: err.message });
      } finally {
        setIsProcessingSave(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        'Venue Name': 'Example Golf Club',
        'Type': 'Golf Course',
        'Stage': 'Cold Lead',
        'Street Address': '123 Fairway Ln',
        'City': 'Bloomfield',
        'State': 'MI',
        'Zip': '48301',
        'County': 'Oakland',
        'Contact Name': 'John Doe',
        'Phone': '555-0123',
        'Email': 'john@example.com',
        'golf_hasBevCart': 'Yes',
        'golf_hasClubhouseKitchen': 'Yes',
        'golf_roundsAnnually': 32000,
        'golf_bevCartAnnualRevenue': 450000,
        'bowling_hasBar': '',
        'bowling_hasKitchen': '',
        'bowling_lanesCount': '',
        'bowling_fbAnnualRevenue': ''
      },
      {
        'Venue Name': 'Strike City Lanes',
        'Type': 'Bowling Center',
        'Stage': 'Demo',
        'Street Address': '888 Spare Ave',
        'City': 'Rochester',
        'State': 'NY',
        'Zip': '14604',
        'County': 'Monroe',
        'Contact Name': 'Jane Smith',
        'Phone': '555-9999',
        'Email': 'jane@strikecity.com',
        'golf_hasBevCart': '',
        'golf_hasClubhouseKitchen': '',
        'golf_roundsAnnually': '',
        'golf_bevCartAnnualRevenue': '',
        'bowling_hasBar': 'Yes',
        'bowling_hasKitchen': 'Yes',
        'bowling_lanesCount': 24,
        'bowling_fbAnnualRevenue': 800000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lead Template");
    XLSX.writeFile(workbook, "KOOP_Lead_Import_Template.xlsx");
    toast({ title: "Template Downloaded", description: "Follow the format in the file for best results." });
  };

  const handleDeleteLead = async (id: string) => {
    if (!firestore) return;
    if (!confirm('Are you sure you want to delete this lead?')) return;
    deleteDoc(doc(firestore, 'leads', id)).then(() => {
      toast({ title: "Lead Deleted" });
    });
  };

  const handleEditVenueSettings = async (s: Seller) => {
    if (!firestore) return;
    setSelectedVenue(s);
    
    const venueSnap = await getDoc(doc(firestore, 'venues', s.id));
    const vData = venueSnap.exists() ? venueSnap.data() as Venue : null;

    venueSettingsForm.reset({
      name: vData?.name || s.courseName,
      ownerUid: vData?.ownerUid || '',
      type: (s.type?.includes('Golf') ? 'Golf Course' : 'Bowling Center') as any,
      status: s.status || 'Active',
      streetAddress: s.streetAddress || '',
      city: s.city || '',
      state: s.state || '',
      zip: s.zip || '',
      contactName: s.contactName || '',
      contactPhone: s.contactPhone || '',
      contactEmail: vData?.contactEmail || s.contactEmail || '',
      stripeAccountId: vData?.stripeAccountId || s.stripeAccountId || '',
      stripeConnectId: vData?.stripeConnectId || '',
      solutionFeeFixed: vData?.solutionFeeFixed || 0,
      solutionFeePercent: vData?.solutionFeePercent || 0,
      patronConvenienceFee: vData?.patronConvenienceFee || (s.serviceFee ? s.serviceFee * 100 : 150),
      monthlySolutionFee: vData?.monthlySolutionFee || 0,
      stripeOnboardingComplete: vData?.stripeOnboardingComplete || s.stripeOnboardingComplete || false,
      payoutsEnabled: vData?.payoutsEnabled || false,
      isFoundingPartner: vData?.isFoundingPartner || s.isFoundingPartner || false,
      enabledPaymentMethods: vData?.enabledPaymentMethods || s.enabledPaymentMethods || ['Pay at Delivery', 'Digital Payment']
    });
    setIsVenueSettingsOpen(true);
  };

  const handleSaveVenueSettings = async (data: VenueSettingsFormData) => {
    if (!firestore || !selectedVenue) return;
    setIsProcessingSave(true);
    try {
      await setDoc(doc(firestore, 'venues', selectedVenue.id), {
        venueId: selectedVenue.id,
        name: data.name,
        ownerUid: data.ownerUid,
        stripeAccountId: data.stripeAccountId,
        stripeConnectId: data.stripeConnectId,
        solutionFeeFixed: data.solutionFeeFixed,
        solutionFeePercent: data.solutionFeePercent,
        patronConvenienceFee: data.patronConvenienceFee,
        monthlySolutionFee: data.monthlySolutionFee,
        stripeOnboardingComplete: data.stripeOnboardingComplete,
        payoutsEnabled: data.payoutsEnabled,
        isFoundingPartner: data.isFoundingPartner,
        enabledPaymentMethods: data.enabledPaymentMethods,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await updateDoc(doc(firestore, 'sellers', selectedVenue.id), {
        courseName: data.name,
        type: data.type as any,
        status: data.status,
        streetAddress: data.streetAddress,
        city: data.city,
        state: data.state,
        zip: data.zip,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        serviceFee: data.patronConvenienceFee / 100,
        isFoundingPartner: data.isFoundingPartner,
        stripeAccountId: data.stripeAccountId,
        stripeOnboardingComplete: data.stripeOnboardingComplete,
        enabledPaymentMethods: data.enabledPaymentMethods,
        updatedAt: serverTimestamp()
      });

      toast({ title: "Venue Data Synchronized", description: "Business and operational records updated." });
      setIsVenueSettingsOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsProcessingSave(false);
    }
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!firestore) return;
    if (!confirm(`ARE YOU ABSOLUTELY SURE? This will permanently delete the establishment "${venueName}" and all associated data records.`)) return;

    setIsProcessingSave(true);
    
    const sellerRef = doc(firestore, 'sellers', venueId);
    const venueRef = doc(firestore, 'venues', venueId);

    deleteDoc(sellerRef)
      .then(() => deleteDoc(venueRef))
      .then(() => {
        toast({ 
          title: "Establishment Terminated", 
          description: `Record for ${venueName} has been purged from registry.` 
        });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setIsProcessingSave(false);
      });
  };

  const handleToggleVenueStatus = async (v: Seller) => {
    if (!firestore) return;
    const newStatus = v.status === 'Active' ? 'Inactive' : 'Active';
    const sellerRef = doc(firestore, 'sellers', v.id);
    
    setIsProcessingSave(true);
    updateDoc(sellerRef, { status: newStatus, updatedAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Status Updated", description: `${v.courseName} is now ${newStatus}.` });
      })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'update',
          requestResourceData: { status: newStatus }
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setIsProcessingSave(false);
      });
  };

  const handleSaveLibraryItem = async (data: StarterModifierFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingLibraryItem?.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setDoc(doc(firestore, 'starter_modifier_library', id), data, { merge: true })
      .then(() => { 
        toast({ title: "Template Saved" }); 
        setIsLibraryFormOpen(false); 
      })
      .finally(() => setIsProcessingSave(false));
  };

  const handleSaveMenuItemTemplate = async (data: StarterMenuItemFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingItemTemplate?.id || `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${data.serviceMode}`;
    setDoc(doc(firestore, 'starter_menu_item_library', id), data, { merge: true })
      .then(() => { 
        toast({ title: "Menu Template Saved" }); 
        setIsItemLibraryFormOpen(false); 
      })
      .finally(() => setIsProcessingSave(false));
  };

  const handleInitializeLibrary = async () => {
    if (!firestore) return;
    setIsInitializingLibrary(true);
    try {
      const { seedGlobalStarterLibrary, seedGlobalStarterMenuLibrary } = await import('@/lib/seed-data');
      await seedGlobalStarterLibrary(firestore);
      await seedGlobalStarterMenuLibrary(firestore);
      toast({ title: "Libraries Initialized", description: "All templates provisioned." });
    } catch (e: any) { 
      console.error("Initialization Failed:", e);
      toast({ variant: "destructive", title: "Setup Failed", description: e.message }); 
    } finally { setIsInitializingLibrary(false); }
  };

  const handleReseedDemos = async () => {
    if (!firestore) return;
    setIsReseedingDemos(true);
    try {
      const { seedAllDemoData } = await import('@/lib/seed-data');
      await seedAllDemoData(firestore);
      toast({ title: "Reseed Complete", description: "All demo environments have been refreshed with the latest library data." });
    } catch (e: any) {
      console.error("Reseed Failed:", e);
      toast({ variant: "destructive", title: "Reseed Failed", description: e.message });
    } finally {
      setIsReseedingDemos(false);
    }
  };

  const handleSystemReset = async () => {
    if (!firestore) return;
    setIsResettingSystem(true);
    try {
      const { resetAllVenueOperationalStatus } = await import('@/lib/seed-data');
      await resetAllVenueOperationalStatus(firestore);
      toast({ title: "System Reset Complete", description: "All operational statuses and staff locations cleared." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reset Failed" });
    } finally { setIsResettingSystem(false); }
  };

  const handleWipePatrons = async () => {
    if (!firestore) return;
    setIsWipingPatrons(true);
    try {
      const { wipeAllPatronData } = await import('@/lib/seed-data');
      await wipeAllPatronData(firestore);
      toast({ title: "Patron Cache Purged", description: "All global patron profiles have been deleted." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Wipe Failed" });
    } finally { setIsWipingPatrons(false); }
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  
  if (isUserLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user || !isSuperAdmin) return null;

  const filteredLibraryItems = (libraryItems || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredItemTemplates = (itemLibrary || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredLeads = (leads || []).filter(l => l.venueName.toLowerCase().includes(leadSearchTerm.toLowerCase())).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

  const NavContent = () => (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <NavButton 
          key={item.id} 
          id={item.id} 
          label={item.label} 
          icon={item.icon} 
          active={activeNav === item.id} 
          onClick={(id) => { setActiveNav(id); setMobileMenuOpen(false); }} 
          sidebarOpen={sidebarOpen || isMobile} 
        />
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] text-left overflow-x-auto">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative text-left">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6 text-[#213147]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#213147] border-0 p-0 text-white">
              <SheetHeader className="p-6 border-b border-white/5 text-left">
                <StylizedKoopLogo size="md" />
                <SheetTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-2">Platform Control</SheetTitle>
              </SheetHeader>
              <div className="p-4 text-left"><NavContent /></div>
            </SheetContent>
          </Sheet>
          <StylizedKoopLogo size="sm" colorClass="text-[#213147]" />
          <div className="flex flex-col text-left">
            <h2 className="text-sm font-black font-headline uppercase tracking-tight text-[#213147] leading-none">{NAV_ITEMS.find(n => n.id === activeNav)?.label}</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Solution Operations</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Release Device</span>
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            {sidebarOpen && <StylizedKoopLogo size="md" />}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">
              {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
             <NavContent />
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto relative">
          <div className="p-8">
            <div className="max-w-7xl mx-auto space-y-8 text-left pb-20 min-w-0">
              {activeNav === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard label="Total Venues" value={venues?.length || 0} sub="Onboarded Partners" icon={Store} colorClass="bg-indigo-600" />
                    <KPICard label="Active Markets" value={2} sub="Regional Clusters" icon={MapPin} colorClass="bg-green-600" />
                    <KPICard label="Master Templates" value={(libraryItems?.length || 0) + (itemLibrary?.length || 0)} sub="Library Entities" icon={Library} colorClass="bg-primary" />
                    <KPICard label="System Health" value="100%" sub="All Feeds Live" icon={Activity} colorClass="bg-emerald-500" />
                  </div>
                </div>
              )}

              {activeNav === 'sales' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border-b-2 pb-6">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Sales CRM</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manage leads and track sales funnel progression</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="bg-white border-2 border-slate-100 font-black uppercase text-[10px] tracking-widest gap-2 h-11 px-6">
                        <Upload className="h-4 w-4 text-primary" /> Batch Import
                      </Button>
                      <Button onClick={() => { 
                        setEditingLead(null); 
                        leadForm.reset({
                          venueName: '',
                          venueType: 'Golf Course',
                          stage: 'Cold Lead',
                          streetAddress: '',
                          city: '',
                          state: '',
                          zip: '',
                          county: '',
                          contactName: '',
                          phone: '',
                          email: '',
                          marketFitData: {
                            golf: { hasBevCart: false, hasClubhouseKitchen: false, roundsAnnually: 0, bevCartAnnualRevenue: 0 },
                            bowling: { hasBar: false, hasKitchen: false, lanesCount: 0, fbAnnualRevenue: 0 }
                          }
                        }); 
                        setIsLeadFormOpen(true); 
                      }} className="bg-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl h-11 px-6">
                        <Plus className="h-4 w-4" /> Add New Lead
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="list" className="space-y-6">
                    <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
                      <TabsTrigger value="list" className="text-[10px] font-black uppercase tracking-widest px-8">Manage Leads</TabsTrigger>
                      <TabsTrigger value="funnel" className="text-[10px] font-black uppercase tracking-widest px-8">Sales Funnel</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4">
                      <div className="flex bg-white p-2 px-3 rounded-xl border-2 shadow-sm gap-3 items-center w-full max-w-md">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input placeholder="Search leads..." value={leadSearchTerm} onChange={(e) => setLeadSearchTerm(e.target.value)} className="border-0 shadow-none text-xs font-medium p-0 h-auto" />
                      </div>

                      <div className="border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                        <ShadcnTable>
                          <ShadcnTableHeader className="bg-slate-50">
                            <ShadcnTableRow>
                              <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12">Venue</ShadcnTableHead>
                              <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12">Contact</ShadcnTableHead>
                              <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12">Stage</ShadcnTableHead>
                              <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12 text-right">Actions</ShadcnTableHead>
                            </ShadcnTableRow>
                          </ShadcnTableHeader>
                          <ShadcnTableBody>
                            {filteredLeads.length === 0 ? (
                              <ShadcnTableRow>
                                <ShadcnTableCell colSpan={4} className="h-40 text-center text-muted-foreground uppercase text-[10px] font-black opacity-30">No leads in database</ShadcnTableCell>
                              </ShadcnTableRow>
                            ) : filteredLeads.map(lead => (
                              <ShadcnTableRow key={lead.id} className="group">
                                <ShadcnTableCell className="px-6 py-4">
                                  <p className="font-black text-sm text-[#213147]">{lead.venueName}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{lead.city}, {lead.state} {lead.county && `(${lead.county} Co)`}</p>
                                </ShadcnTableCell>
                                <ShadcnTableCell className="px-6 py-4">
                                  <p className="font-bold text-xs">{lead.contactName}</p>
                                  <p className="text-[9px] text-muted-foreground">{lead.email}</p>
                                </ShadcnTableCell>
                                <ShadcnTableCell className="px-6 py-4">
                                  <Badge className={cn(
                                    "text-[8px] font-black uppercase",
                                    lead.stage === 'Closed' ? "bg-green-100 text-green-700" :
                                    lead.stage === 'Dead' ? "bg-slate-100 text-slate-400" :
                                    "bg-indigo-100 text-indigo-700"
                                  )}>
                                    {lead.stage}
                                  </Badge>
                                </ShadcnTableCell>
                                <ShadcnTableCell className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button onClick={() => { setEditingLead(lead); leadForm.reset(lead); setIsLeadFormOpen(true); }} className="h-8 w-8 text-indigo-600 flex items-center justify-center rounded-md hover:bg-indigo-50">
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteLead(lead.id)} className="h-8 w-8 text-destructive flex items-center justify-center rounded-md hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </ShadcnTableCell>
                              </ShadcnTableRow>
                            ))}
                          </ShadcnTableBody>
                        </ShadcnTable>
                      </div>
                    </TabsContent>

                    <TabsContent value="funnel" className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                         {['Cold Lead', 'On-Site Meeting', 'Demo', 'Offer', 'Closed', 'Dead'].map(stage => (
                           <div key={stage} className="space-y-4">
                             <div className="flex items-center justify-between px-2">
                               <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest">{stage}</Badge>
                               <span className="text-[10px] font-black text-muted-foreground">{(leads || []).filter(l => l.stage === stage).length}</span>
                             </div>
                             <div className="space-y-2">
                               {(leads || []).filter(l => l.stage === stage).map(lead => (
                                 <Card key={lead.id} className="p-3 border-2 shadow-sm hover:border-primary transition-all cursor-pointer" onClick={() => { setEditingLead(lead); leadForm.reset(lead); setIsLeadFormOpen(true); }}>
                                   <p className="text-[10px] font-black uppercase truncate text-[#213147]">{lead.venueName}</p>
                                   <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">{lead.city}, {lead.state}</p>
                                 </Card>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeNav === 'venues' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                     <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Establishment Registry</h3>
                  </div>
                  <div className="border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                    <ShadcnTable>
                      <ShadcnTableHeader className="bg-slate-50">
                        <ShadcnTableRow>
                          <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12">Establishment</ShadcnTableHead>
                          <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12">Type</ShadcnTableHead>
                          <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12 text-center">Status</ShadcnTableHead>
                          <ShadcnTableHead className="text-[10px] font-black uppercase px-6 h-12 text-right">Actions</ShadcnTableHead>
                        </ShadcnTableRow>
                      </ShadcnTableHeader>
                      <ShadcnTableBody>
                        {venues?.length === 0 ? (
                          <ShadcnTableRow>
                            <ShadcnTableCell colSpan={4} className="h-40 text-center text-muted-foreground uppercase text-[10px] font-black opacity-30">No venues onboarded</ShadcnTableCell>
                          </ShadcnTableRow>
                        ) : venues?.map(v => (
                          <ShadcnTableRow key={v.id} className="group">
                            <ShadcnTableCell className="px-6 py-4">
                              <p className="font-black text-sm text-[#213147]">{v.courseName}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">{v.city}, {v.state}</p>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="px-6 py-4">
                              <Badge variant="outline" className="text-[8px] font-black uppercase">{v.type}</Badge>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Switch 
                                  checked={v.status === 'Active'} 
                                  onCheckedChange={() => handleToggleVenueStatus(v)}
                                />
                                <span className={cn("text-[8px] font-black uppercase", v.status === 'Active' ? "text-green-600" : "text-slate-400")}>
                                  {v.status}
                                </span>
                              </div>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleEditVenueSettings(v)} className="h-8 w-8 text-indigo-600 flex items-center justify-center rounded-md hover:bg-indigo-50">
                                  <Settings className="h-4 w-4" />
                                </button>
                                <Link href={`/sellers/${v.id}`} className="h-8 w-8 text-slate-400 flex items-center justify-center rounded-md hover:text-indigo-600 hover:bg-indigo-50">
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                                <button onClick={() => handleDeleteVenue(v.id, v.courseName)} className="h-8 w-8 text-destructive flex items-center justify-center rounded-md hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </ShadcnTableCell>
                          </ShadcnTableRow>
                        ))}
                      </SubTableBody>
                    </ShadcnTable>
                  </div>
                </div>
              )}

              {activeNav === 'library' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b-2 pb-6">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Global Onboarding Libraries</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Master templates for rapid industry-standard provisioning</p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleInitializeLibrary} disabled={isInitializingLibrary} variant="outline" className="bg-white border-2 border-indigo-100 font-black uppercase text-[10px] tracking-widest gap-2">
                        {isInitializingLibrary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4 text-indigo-600" />} Initialize All
                      </Button>
                      <Button onClick={() => { 
                        if (libraryTab === 'modifiers') { 
                          setEditingLibraryItem(null); 
                          libraryForm.reset({ name: '', venueType: ['golf', 'bowling'], category: 'food', selectionType: 'single', required: false, sortOrder: 0, options: [{ label: '', priceModifier: 0 }] }); 
                          setIsLibraryFormOpen(true); 
                        } else {
                          setEditingItemTemplate(null);
                          itemLibraryForm.reset({ name: '', description: '', price: 0, category: 'food', venueType: ['golf'], serviceMode: 'beverageCart', suggestedModifierGroups: [], sortOrder: 0, imageUrl: '' });
                          setIsItemLibraryFormOpen(true);
                        }
                      }} className="bg-indigo-600 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl h-11 px-6">
                        <Plus className="h-4 w-4" /> Add New {libraryTab === 'modifiers' ? 'Modifier' : 'Item'}
                      </Button>
                    </div>
                  </div>

                  <Tabs value={libraryTab} onValueChange={(v: any) => setLibraryTab(v)} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
                        <TabsTrigger value="modifiers" className="text-[10px] font-black uppercase tracking-widest px-8">Modifier Sets</TabsTrigger>
                        <TabsTrigger value="items" className="text-[10px] font-black uppercase tracking-widest px-8">Menu Items</TabsTrigger>
                      </TabsList>
                      <div className="flex bg-white p-2 px-3 rounded-xl border-2 shadow-sm gap-3 items-center w-full max-sm:max-w-none max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input placeholder="Search library..." value={librarySearchTerm} onChange={(e) => setLibrarySearchTerm(e.target.value)} className="border-0 shadow-none text-xs font-medium p-0 h-auto" />
                      </div>
                    </div>

                    <TabsContent value="modifiers" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredLibraryItems.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 bg-slate-50"><Library className="h-10 w-10 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Library Empty. Click Initialize All above.</p></div>
                      ) : filteredLibraryItems.map(item => (
                        <Card key={item.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left">
                          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-0.5 text-left"><p className="font-black text-xs uppercase text-[#213147]">{item.name}</p><div className="flex gap-1">{item.venueType.map(v => <Badge key={v} className="text-[6px] font-black uppercase h-3 px-1 border-0 bg-slate-200 text-slate-600">{v}</Badge>)}<Badge className="text-[6px] font-black uppercase h-3 px-1 border-0 bg-indigo-100 text-indigo-700">{item.category}</Badge></div></div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingLibraryItem(item); libraryForm.reset(item); setIsLibraryFormOpen(true); }}><Edit className="h-4 w-4" /></Button></div>
                          </CardHeader>
                          <CardContent className="p-4 flex flex-wrap gap-1.5 text-left">{item.options.map((opt, idx) => (<Badge key={idx} variant="outline" className="text-[8px] font-bold uppercase">{opt.label} {opt.priceModifier > 0 && `(+$${opt.priceModifier.toFixed(2)})`}</Badge>))}</CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="items" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                       {filteredItemTemplates.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 bg-slate-50"><UtensilsCrossed className="h-10 w-10 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Library Empty. Click Initialize All above.</p></div>
                      ) : filteredItemTemplates.map(item => (
                        <Card key={item.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left relative overflow-hidden">
                          <div className="relative aspect-video w-full bg-slate-100 border-b overflow-hidden">
                            {item.imageUrl ? (
                              <Image 
                                src={item.imageUrl} 
                                alt={item.name} 
                                fill 
                                className="object-cover transition-transform group-hover:scale-105"
                                data-ai-hint={item.name}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-300">
                                <LucideImage className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          
                          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1 text-left"><Badge className="h-4 px-1 text-[8px] font-black uppercase bg-[#213147] text-white border-0">{item.serviceMode}</Badge><p className="font-black text-xs uppercase text-[#213147] truncate">{item.name}</p></div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingItemTemplate(item); itemLibraryForm.reset(item); setIsItemLibraryFormOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-4 space-y-2 text-left">
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{item.description || "No description provided."}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-primary">${item.price.toFixed(2)}</span>
                              <div className="flex gap-1">
                                {item.venueType.map(v => <Badge key={v} className="text-[6px] font-black uppercase h-3 px-1 border-0 bg-slate-100 text-slate-500">{v}</Badge>)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeNav === 'demos' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center border-b-2 pb-6">
                     <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Sales Demos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {DEMO_VENUES.map((venue) => (
                      <Card key={venue.id} className="border-2 shadow-md overflow-hidden flex flex-col group hover:border-indigo-500 transition-all bg-white">
                        <div className={cn("h-3 w-full", venue.gradient)} />
                        <CardHeader className="p-6 pb-2 text-left">
                          <div className="flex items-center justify-between mb-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase px-2">{venue.type}</Badge>
                             <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity">
                               <Zap className="h-4 w-4" />
                             </div>
                          </div>
                          <CardTitle className="font-headline font-black text-lg uppercase text-[#213147]">{venue.title}</CardTitle>
                          <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">{venue.sub}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-6 flex-1 space-y-8">
                          <div className="flex flex-col items-center gap-3 p-5 bg-slate-50 rounded-[2rem] border-2 border-dashed group-hover:border-indigo-200 transition-colors">
                            <div className="bg-white p-2 rounded-2xl border-2 shadow-sm">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${baseUrl}${venue.menuUrl}`}
                                alt="Patron QR"
                                className="w-24 h-24"
                              />
                            </div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-1.5">
                              <QrCode className="h-3 w-3" /> Scan for Menu
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between h-11 text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 group-hover:border-indigo-100 hover:bg-indigo-50">
                              <Link href={venue.menuUrl}>
                                Launch Menu <PlayCircle className="h-4 w-4 text-indigo-600" />
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between h-11 text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 group-hover:border-indigo-100 hover:bg-indigo-50">
                              <Link href={venue.staffUrl}>
                                Staff Portal <Smartphone className="h-4 w-4 text-indigo-600" />
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between h-11 text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 group-hover:border-indigo-100 hover:bg-indigo-50">
                              <Link href={venue.adminUrl}>
                                Venue Admin <LayoutDashboard className="h-4 w-4 text-indigo-600" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeNav === 'system' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                    <div className="space-y-1">
                      <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Global System Config</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Master switches and thresholds for the platform</p>
                    </div>
                    <Button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl h-12 px-6">
                      {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Configuration
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-red-600 flex items-center gap-2">
                       <Flame className="h-4 w-4" /> Emergency Operations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <Card className="border-2 border-red-100 bg-red-50/30 p-6 flex flex-col gap-4 text-left">
                         <div className="flex items-center gap-3">
                           <div className="bg-red-100 p-2 rounded-xl text-red-600"><Power className="h-5 w-5" /></div>
                           <div className="text-left">
                             <p className="text-xs font-black uppercase text-red-700">Force System-Wide Staff Logout</p>
                             <p className="text-[9px] font-bold text-red-600/70 uppercase">Immediately terminates all active staff shifts and clears locations</p>
                           </div>
                         </div>
                         <Button onClick={handleSystemReset} disabled={isResettingSystem} variant="destructive" className="h-12 font-black uppercase text-[10px] tracking-widest gap-2">
                           {isResettingSystem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />} Clear Platform Activity Now
                         </Button>
                       </Card>

                       <Card className="border-2 border-amber-100 bg-amber-50/30 p-6 flex flex-col gap-4 text-left">
                         <div className="flex items-center gap-3">
                           <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><UserX className="h-5 w-5" /></div>
                           <div className="text-left">
                             <p className="text-xs font-black uppercase text-amber-700">Reset Global Patron Identity</p>
                             <p className="text-[9px] font-bold text-amber-600/70 uppercase">Purges all saved patron profiles to start checkout flows fresh</p>
                           </div>
                         </div>
                         <Button onClick={handleWipePatrons} disabled={isWipingPatrons} className="h-12 border-2 border-amber-200 bg-white text-amber-700 hover:bg-amber-50 font-black uppercase text-[10px] tracking-widest gap-2">
                           {isWipingPatrons ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />} Wipe Patron Cache
                         </Button>
                       </Card>

                       <Card className="border-2 border-indigo-100 bg-indigo-50/30 p-6 flex flex-col gap-4 text-left">
                         <div className="flex items-center gap-3">
                           <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Database className="h-5 w-5" /></div>
                           <div className="text-left">
                             <p className="text-xs font-black uppercase text-indigo-700">Full Demo Reseed</p>
                             <p className="text-[9px] font-bold text-indigo-600/70 uppercase">Wipes and recreates all demo venues with latest defaults</p>
                           </div>
                         </div>
                         <Button onClick={handleReseedDemos} disabled={isReseedingDemos} className="h-12 border-2 border-indigo-200 bg-white text-indigo-700 hover:bg-amber-50 font-black uppercase text-[10px] tracking-widest gap-2">
                           {isReseedingDemos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Reseed Demo Venues
                         </Button>
                       </Card>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                      <Card className="border-2 p-8 space-y-8 text-left">
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                               <ShieldCheck className="h-3 w-3" /> Support & Identity
                            </Label>
                            <div className="grid gap-5">
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="supportEmail" className="text-xs font-bold uppercase">Global Support Email</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input id="supportEmail" placeholder="support@kooporders.com" value={configData.supportEmail} onChange={(e) => setConfigData({...configData, supportEmail: e.target.value})} className="pl-10 h-12 border-2 font-bold focus-visible:ring-primary" />
                                </div>
                              </div>
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="logoUrl" className="text-xs font-bold uppercase">Master Platform Logo URL</Label>
                                <div className="relative">
                                  <LucideImage className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input id="logoUrl" placeholder="https://..." value={configData.logoUrl} onChange={(e) => setConfigData({...configData, logoUrl: e.target.value})} className="pl-10 h-12 border-2 font-bold focus-visible:ring-primary" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator className="opacity-50" />

                          <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                               <Timer className="h-3 w-3" /> Operational Logic
                            </Label>
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2">
                              <div className="max-w-[200px] text-left">
                                <p className="font-bold text-sm">Daily Operational Reset</p>
                                <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">Hour (0-23) to clear driver sessions automatically</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Clock className="h-5 w-5 text-indigo-600" />
                                 <Input type="number" min="0" max="23" value={configData.dailyResetHour} onChange={(e) => setConfigData({...configData, dailyResetHour: parseInt(e.target.value)})} className="w-16 h-12 text-center font-black border-2 focus-visible:ring-indigo-600" />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2">
                              <div className="max-w-[200px] text-left">
                                <p className="font-bold text-sm">SMS Global Switch</p>
                                <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">Enable Twilio notifications for patrons platform-wide</p>
                              </div>
                              <div className="flex items-center gap-4">
                                 <BellRing className={cn("h-5 w-5 transition-colors", configData.smsNotificationsEnabled ? "text-green-600" : "text-slate-300")} />
                                 <Switch checked={configData.smsNotificationsEnabled} onCheckedChange={(val) => setConfigData({...configData, smsNotificationsEnabled: val})} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="border-2 p-8 space-y-6 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Activity className="h-3 w-3 text-primary" /> Platform Inactivity Alerts
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border-2">
                          <div className="space-y-1.5 text-left">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Mgr Inactivity (Days)</Label>
                            <Input 
                              type="number" 
                              value={configData.venueHealthSettings?.warningManagerInactivityDays} 
                              onChange={(e) => setConfigData({...configData, venueHealthSettings: {...configData.venueHealthSettings!, warningManagerInactivityDays: parseInt(e.target.value)}})} 
                              className="h-10 border-2 font-black bg-white" 
                            />
                          </div>
                          <div className="space-y-1.5 text-left">
                            <Label className="text-[9px] font-black uppercase text-muted-foreground">Venue Inactivity (Days)</Label>
                            <Input 
                              type="number" 
                              value={configData.venueHealthSettings?.warningVenueInactivityDays} 
                              onChange={(e) => setConfigData({...configData, venueHealthSettings: {...configData.venueHealthSettings!, warningVenueInactivityDays: parseInt(e.target.value)}})} 
                              className="h-10 border-2 font-black bg-white" 
                            />
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-8">
                      <Card className="border-2 p-8 space-y-8 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <HeartPulse className="h-3 w-3 text-primary" /> Default Fulfillment Thresholds
                        </Label>
                        
                        {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].map((mode) => (
                          <div key={mode} className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                              <Badge className="bg-[#213147] text-white text-[8px] font-black uppercase h-5">{mode}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border-2">
                              <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Ack (Sec)</Label>
                                <Input 
                                  type="number" 
                                  value={configData.orderThresholds?.[mode]?.maxOrderAcknowledgeSeconds} 
                                  onChange={(e) => updateThreshold(mode, 'maxOrderAcknowledgeSeconds', parseInt(e.target.value))} 
                                  className="h-10 border-2 font-black bg-white focus-visible:ring-primary" 
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Warn (min)</Label>
                                <Input 
                                  type="number" 
                                  value={configData.orderThresholds?.[mode]?.warningOrderProcessingMinutes} 
                                  onChange={(e) => updateThreshold(mode, 'warningOrderProcessingMinutes', parseInt(e.target.value))} 
                                  className="h-10 border-2 font-black bg-white focus-visible:ring-primary" 
                                />
                              </div>
                              <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground">Max (min)</Label>
                                <Input 
                                  type="number" 
                                  value={configData.orderThresholds?.[mode]?.maxOrderProcessingMinutes} 
                                  onChange={(e) => updateThreshold(mode, 'maxOrderProcessingMinutes', parseInt(e.target.value))} 
                                  className="h-10 border-2 font-black bg-white focus-visible:ring-primary" 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </Card>

                      <Card className="border-2 p-8 space-y-6 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Satellite className="h-3 w-3" /> Signal Health Thresholds (Seconds)
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2 p-4 bg-green-50 rounded-2xl border-2 border-green-100 flex flex-col items-center">
                            <Label className="text-[9px] font-black uppercase text-green-700">Hot (Green)</Label>
                            <Input type="number" value={configData.gpsFreshnessThresholds?.hot} onChange={(e) => setConfigData({...configData, gpsFreshnessThresholds: {...configData.gpsFreshnessThresholds!, hot: parseInt(e.target.value)}})} className="font-black border-0 bg-transparent text-xl p-0 h-auto text-center focus-visible:ring-0" />
                          </div>
                          <div className="space-y-2 p-4 bg-amber-50 rounded-2xl border-2 border-amber-100 flex flex-col items-center">
                            <Label className="text-[9px] font-black uppercase text-amber-700">Warm (Amber)</Label>
                            <Input type="number" value={configData.gpsFreshnessThresholds?.warm} onChange={(e) => setConfigData({...configData, gpsFreshnessThresholds: {...configData.gpsFreshnessThresholds!, warm: parseInt(e.target.value)}})} className="font-black border-0 bg-transparent text-xl p-0 h-auto text-center focus-visible:ring-0" />
                          </div>
                          <div className="space-y-2 p-4 bg-red-50 rounded-2xl border-2 border-red-100 flex flex-col items-center">
                            <Label className="text-[9px] font-black uppercase text-red-700">Cold (Red)</Label>
                            <Input type="number" value={configData.gpsFreshnessThresholds?.cold} onChange={(e) => setConfigData({...configData, gpsFreshnessThresholds: {...configData.gpsFreshnessThresholds!, cold: parseInt(e.target.value)}})} className="font-black border-0 bg-transparent text-xl p-0 h-auto text-center focus-visible:ring-0" />
                          </div>
                        </div>
                      </Card>

                      <Card className="border-2 p-8 space-y-6 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Power className="h-3 w-3" /> Global Mode Authorization
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {['Beverage Cart', 'Clubhouse', 'Lane Delivery'].map(mode => (
                            <div key={mode} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border-2">
                              <span className="text-[11px] font-black uppercase">{mode}</span>
                              <Switch 
                                checked={configData.enabledModes?.includes(mode)} 
                                onCheckedChange={(val) => {
                                  const next = val 
                                    ? [...(configData.enabledModes || []), mode]
                                    : (configData.enabledModes || []).filter(m => m !== mode);
                                  setConfigData({...configData, enabledModes: next});
                                }} 
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <div className="bg-white/50 backdrop-blur-sm border border-slate-200 p-6 rounded-[2rem] flex items-start gap-4">
                     <Info className="h-6 w-6 text-slate-400 shrink-0 mt-0.5" />
                     <div className="space-y-2">
                       <p className="text-[11px] font-black uppercase text-[#213147] tracking-widest">Analytics Scope Disclosure</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase leading-relaxed">
                         {(() => {
                           const modes = seller?.menuTypes || ['Beverage Cart', 'Clubhouse', 'Lane Delivery'];
                           return `Reporting based on orders where acknowledgment exceeded ${seller?.orderThresholds?.[modes[0]]?.maxOrderAcknowledgeSeconds || solutionConfig?.orderThresholds?.[modes[0]]?.maxOrderAcknowledgeSeconds || 120}s or fulfillment exceeded ${seller?.orderThresholds?.[modes[0]]?.maxOrderProcessingMinutes || solutionConfig?.orderThresholds?.[modes[0]]?.maxOrderProcessingMinutes || 25}m.`;
                         })()}
                       </p>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl"><FileSpreadsheet className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Batch Lead Import</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Upload Excel/CSV Database</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-4 text-center group hover:border-primary transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="bg-white p-4 rounded-2xl shadow-sm border-2 group-hover:scale-105 transition-transform"><Upload className="h-8 w-8 text-primary" /></div>
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase text-[#213147]">Click to select spreadsheet</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Supported formats: .xlsx, .xls, .csv</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls, .csv" />
              </div>
              
              <div className="bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 flex items-start gap-4">
                <Info className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">Import Instructions</p>
                  <p className="text-[9px] font-bold text-indigo-600/70 uppercase leading-relaxed">Ensure your columns match our master schema. Use the template provided below for best results.</p>
                  <Button onClick={downloadExcelTemplate} variant="link" className="h-auto p-0 text-[10px] font-black uppercase tracking-widest text-indigo-600 gap-1.5"><Download className="h-3 w-3" /> Get Standard Template</Button>
                </div>
              </div>
            </div>

            {isProcessingSave && (
              <div className="flex items-center justify-center gap-3 py-2 animate-in fade-in">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Parsing Terminal Data...</span>
              </div>
            )}
          </div>
          <DialogFooter className="px-8 pb-8">
            <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
        <DialogContent className="sm:max-w-[750px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/10 p-3 rounded-2xl shrink-0"><Target className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">{editingLead ? 'Modify Prospect' : 'New CRM Prospect'}</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Lead & Market Fit Data Registry</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8 text-left">
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(handleSaveLead)} className="space-y-10">
                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <Store className="h-3 w-3" /> Core Lead Info
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={leadForm.control} name="venueName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="venueType" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField control={leadForm.control} name="streetAddress" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel className="text-[9px] font-black uppercase">Street Address</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="county" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">County</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={leadForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">State</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="Select State" /></SelectTrigger></FormControl><SelectContent>{US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Zip</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <User className="h-3 w-3" /> Contact Details
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={leadForm.control} name="contactName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Prime Contact</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Phone</FormLabel><FormControl><Input {...field} type="tel" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Email</FormLabel><FormControl><Input {...field} type="email" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <ClipboardList className="h-3 w-3" /> Sales Funnel State
                    </Label>
                    <FormField control={leadForm.control} name="stage" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[9px] font-black uppercase">Current Pipeline Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Cold Lead">Cold Lead</SelectItem>
                            <SelectItem value="On-Site Meeting">On-Site Meeting</SelectItem>
                            <SelectItem value="Demo">Demo</SelectItem>
                            <SelectItem value="Offer">Offer</SelectItem>
                            <SelectItem value="Closed">Closed</SelectItem>
                            <SelectItem value="Dead">Dead</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <BarChart className="h-3 w-3" /> Critical Market Fit Data
                    </Label>
                    
                    {leadForm.watch('venueType') === 'Golf Course' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border-2">
                        <div className="space-y-4">
                          <FormField control={leadForm.control} name="marketFitData.golf.hasBevCart" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl border bg-white space-y-0 h-11"><FormLabel className="text-[10px] font-black uppercase">Beverage Cart</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={leadForm.control} name="marketFitData.golf.hasClubhouseKitchen" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl border bg-white space-y-0 h-11"><FormLabel className="text-[10px] font-black uppercase">Clubhouse Kitchen</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="space-y-4">
                          <FormField control={leadForm.control} name="marketFitData.golf.roundsAnnually" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">Rounds Annually</FormLabel><FormControl><Input type="number" {...field} className="h-10 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={leadForm.control} name="marketFitData.golf.bevCartAnnualRevenue" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">Bev Cart Annual Rev ($)</FormLabel><FormControl><Input type="number" {...field} className="h-10 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                        </div>
                      </div>
                    )}

                    {leadForm.watch('venueType') === 'Bowling Center' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border-2">
                        <div className="space-y-4">
                          <FormField control={leadForm.control} name="marketFitData.bowling.hasBar" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl border bg-white space-y-0 h-11"><FormLabel className="text-[10px] font-black uppercase">Full Bar</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                          )} />
                          <FormField control={leadForm.control} name="marketFitData.bowling.hasKitchen" render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 rounded-xl border bg-white space-y-0 h-11"><FormLabel className="text-[10px] font-black uppercase">Full Kitchen</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="space-y-4">
                          <FormField control={leadForm.control} name="marketFitData.bowling.lanesCount" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">Number of Lanes</FormLabel><FormControl><Input type="number" {...field} className="h-10 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={leadForm.control} name="marketFitData.bowling.fbAnnualRevenue" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">F&B Annual Revenue ($)</FormLabel><FormControl><Input type="number" {...field} className="h-10 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize CRM Record
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibraryFormOpen} onOpenChange={setIsLibraryFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/20 p-3 rounded-2xl shrink-0"><Tags className="h-6 w-6 text-white" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Modifier Set Template</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 text-left">
              <Form {...libraryForm}>
                <form onSubmit={libraryForm.handleSubmit(handleSaveLibraryItem)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField 
                      control={libraryForm.control} 
                      name="name" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Template Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12 border-2 font-bold" />
                          </FormControl>
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={libraryForm.control} 
                      name="category" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="food">Food</SelectItem>
                              <SelectItem value="beverage">Beverage</SelectItem>
                              <SelectItem value="universal">Universal</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField 
                      control={libraryForm.control} 
                      name="selectionType" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Selection Logic</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single (Radio)</SelectItem>
                              <SelectItem value="multi">Multiple (Checkbox)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={libraryForm.control} 
                      name="required" 
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 p-3 space-y-0 h-12">
                          <div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase">Required</FormLabel></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} 
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1"><Label className="text-[10px] font-black uppercase text-indigo-600">Template Options</Label><Button type="button" variant="ghost" size="sm" onClick={() => appendOption({ label: '', priceModifier: 0 })} className="text-[9px] font-black uppercase gap-1.5"><Plus className="h-3 w-3" /> Add Option</Button></div>
                    {optionFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border-2">
                        <FormField 
                          control={libraryForm.control} 
                          name={`options.${index}.label`} 
                          render={({ field }) => (
                            <FormItem className="flex-1 text-left">
                              <FormControl>
                                <Input {...field} placeholder="Label" className="h-10 border-2 font-bold bg-white" />
                              </FormControl>
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={libraryForm.control} 
                          name={`options.${index}.priceModifier`} 
                          render={({ field }) => (
                            <FormItem className="w-24 text-left">
                              <FormControl>
                                <Input {...field} type="number" step="0.01" placeholder="$0.00" className="h-10 border-2 font-bold bg-white" />
                              </FormControl>
                            </FormItem>
                          )} 
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-10 w-10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Master Template</Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemLibraryFormOpen} onOpenChange={setIsItemLibraryFormOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/20 p-3 rounded-2xl shrink-0"><UtensilsCrossed className="h-6 w-6 text-white" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Menu Item Template</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Master product definition for provisioning</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8 text-left">
              <Form {...itemLibraryForm}>
                <form onSubmit={itemLibraryForm.handleSubmit(handleSaveMenuItemTemplate)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField 
                      control={itemLibraryForm.control} 
                      name="name" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Template Name</FormLabel>
                          <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={itemLibraryForm.control} 
                      name="price" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Base Price ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} className="h-12 border-2 font-bold" /></FormControl>
                        </FormItem>
                      )} 
                    />
                  </div>

                  <FormField 
                    control={itemLibraryForm.control} 
                    name="description" 
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-[10px] font-black uppercase">Description</FormLabel>
                        <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                      </FormItem>
                    )} 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField 
                      control={itemLibraryForm.control} 
                      name="category" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Library Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="food">Food</SelectItem>
                              <SelectItem value="beverage">Beverage</SelectItem>
                              <SelectItem value="alcohol">Alcohol</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                    <FormField 
                      control={itemLibraryForm.control} 
                      name="serviceMode" 
                      render={({ field }) => (
                        <FormItem className="text-left">
                          <FormLabel className="text-[10px] font-black uppercase">Primary Service Mode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 border-2 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beverageCart">Beverage Cart</SelectItem>
                              <SelectItem value="clubhouse">Clubhouse</SelectItem>
                              <SelectItem value="laneService">Lane Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} 
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized Venue Types</Label>
                    <div className="flex gap-6 p-4 bg-slate-50 rounded-2xl border-2">
                      {['golf', 'bowling'].map((type) => (
                        <FormField
                          key={type}
                          control={itemLibraryForm.control}
                          name="venueType"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, type])
                                      : field.onChange(field.value?.filter((value) => value !== type));
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-[11px] font-black uppercase cursor-pointer">{type}</FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField 
                    control={itemLibraryForm.control} 
                    name="imageUrl" 
                    render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-[10px] font-black uppercase">Image URL</FormLabel>
                        <FormControl><Input {...field} placeholder="https://..." className="h-12 border-2 font-bold" /></FormControl>
                      </FormItem>
                    )} 
                  />

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Menu Template
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isVenueSettingsOpen} onOpenChange={setIsVenueSettingsOpen}>
        <DialogContent className="sm:max-w-[750px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/10 p-3 rounded-2xl shrink-0"><Settings className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Establishment Master Control</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">{selectedVenue?.courseName}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8 text-left">
              <Form {...venueSettingsForm}>
                <form onSubmit={venueSettingsForm.handleSubmit(handleSaveVenueSettings)} className="space-y-10">
                  
                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <User className="h-3 w-3" /> Identity & Ownership
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="name" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Establishment Name</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="ownerUid" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Primary Owner (Auth UID)</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold font-mono text-xs" /></FormControl>
                          </FormItem>
                        )} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="type" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Venue Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Golf Course">Golf Course</SelectItem>
                                <SelectItem value="Bowling Center">Bowling Center</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="status" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Operational Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <MapPin className="h-3 w-3" /> Establishment Logistics & Contact
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="streetAddress" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Street Address</FormLabel>
                            <div className="relative">
                              <Home className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                              <FormControl><Input {...field} className="pl-10 h-11 border-2 font-bold" /></FormControl>
                            </div>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="city" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">City</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl>
                          </FormItem>
                        )} 
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="state" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">State</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 font-bold">
                                  <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state.code} value={state.code}>
                                    {state.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="zip" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Zip Code</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl>
                          </FormItem>
                        )} 
                      />
                    </div>
                    <Separator className="opacity-50" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="contactName" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Contact Name</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="contactPhone" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Contact Phone</FormLabel>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                              <FormControl><Input {...field} type="tel" className="pl-10 h-11 border-2 font-bold" /></FormControl>
                            </div>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="contactEmail" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Contact Email</FormLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <FormControl><Input {...field} type="email" className="pl-11 h-11 border-2 font-bold" /></FormControl>
                            </div>
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <CreditCard className="h-3 w-3" /> Payment & Commercial Terminal
                    </Label>
                    
                    <div className="space-y-4">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground">Authorized Payment Methods</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {['Pay at Delivery', 'Digital Payment', 'Member Account'].map((method) => {
                          const isGolf = venueSettingsForm.watch('type').toLowerCase().includes('golf');
                          const isDisabled = method === 'Member Account' && !isGolf;
                          
                          return (
                            <FormField
                              key={method}
                              control={venueSettingsForm.control}
                              name="enabledPaymentMethods"
                              render={({ field }) => (
                                <FormItem 
                                  className={cn(
                                    "flex items-center space-x-3 space-y-0 p-3 rounded-xl border-2 bg-slate-50 transition-opacity",
                                    isDisabled && "opacity-40 grayscale pointer-events-none"
                                  )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, method])
                                          : field.onChange(field.value?.filter((value: string) => value !== method));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-10px font-black uppercase cursor-pointer">
                                    {method}
                                    {method === 'Member Account' && <span className="block text-[7px] text-muted-foreground">Golf Exclusive</span>}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="stripeAccountId" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Express Account ID</FormLabel>
                            <FormControl><Input {...field} placeholder="acct_..." className="h-11 border-2 font-bold font-mono text-xs" /></FormControl>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="stripeConnectId" 
                        render={({ field }) => (
                          <FormItem className="text-left">
                            <FormLabel className="text-[9px] font-black uppercase">Connect ID</FormLabel>
                            <FormControl><Input {...field} className="h-11 border-2 font-bold font-mono text-xs" /></FormControl>
                          </FormItem>
                        )} 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="stripeOnboardingComplete" 
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-xl border-2 bg-slate-50 space-y-0 h-12">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={cn("h-4 w-4", field.value ? "text-green-600" : "text-slate-300")} />
                              <FormLabel className="text-[9px] font-black uppercase">Onboarding</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={venueSettingsForm.control} 
                        name="payoutsEnabled" 
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-xl border-2 bg-slate-50 space-y-0 h-12">
                            <div className="flex items-center gap-2">
                              <DollarSign className={cn("h-4 w-4", field.value ? "text-green-600" : "text-slate-300")} />
                              <FormLabel className="text-[9px] font-black uppercase">Payouts</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )} 
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                       <Banknote className="h-3 w-3" /> Commercial Terms
                    </Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <p className="text-[9px] font-black uppercase text-indigo-600 px-1 border-b border-indigo-100 pb-1">Platform Revenue</p>
                         <div className="grid grid-cols-1 gap-4">
                            <FormField 
                              control={venueSettingsForm.control} 
                              name="patronConvenienceFee" 
                              render={({ field }) => (
                                <FormItem className="text-left">
                                  <FormLabel className="text-[9px] font-black uppercase">Convenience Fee (Cents)</FormLabel>
                                  <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                                  <FormDescription className="text-[8px] uppercase">Paid by patron per order.</FormDescription>
                                </FormItem>
                              )} 
                            />
                            <FormField 
                              control={venueSettingsForm.control} 
                              name="monthlySolutionFee" 
                              render={({ field }) => (
                                <FormItem className="text-left">
                                  <FormLabel className="text-[9px] font-black uppercase">SaaS Subscription ($)</FormLabel>
                                  <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                                  <FormDescription className="text-[8px] uppercase">Monthly recurring venue cost.</FormDescription>
                                </FormItem>
                              )} 
                            />
                         </div>
                       </div>

                       <div className="space-y-4">
                         <p className="text-[9px] font-black uppercase text-slate-400 px-1 border-b border-slate-100 pb-1">Solution Fee (Split)</p>
                         <div className="grid grid-cols-1 gap-4">
                            <FormField 
                              control={venueSettingsForm.control} 
                              name="solutionFeeFixed" 
                              render={({ field }) => (
                                <FormItem className="text-left">
                                  <FormLabel className="text-[9px] font-black uppercase">Fixed Fee (Cents)</FormLabel>
                                  <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                                </FormItem>
                              )} 
                            />
                            <FormField 
                              control={venueSettingsForm.control} 
                              name="solutionFeePercent" 
                              render={({ field }) => (
                                <FormItem className="text-left">
                                  <FormLabel className="text-[9px] font-black uppercase">Percentage Fee (%)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Percent className="absolute right-3 top-3 h-4 w-4 text-slate-300" />
                                      <Input {...field} type="number" step="0.1" className="h-11 border-2 font-bold pr-10" />
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )} 
                            />
                         </div>
                       </div>
                    </div>

                    <FormField 
                      control={venueSettingsForm.control} 
                      name="isFoundingPartner" 
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-0">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary fill-primary/20" />
                              <FormLabel className="text-[10px] font-black uppercase text-primary">Founding Partner Status</FormLabel>
                            </div>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Grants lifetime badge and marketing benefits</p>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} 
                    />
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                      Changes to these parameters take effect immediately across all active delivery channels. Ensure Stripe metadata is synced before modifying Account IDs.
                    </p>
                  </div>

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Master Registry
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
