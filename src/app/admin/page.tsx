
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
  DollarSign,
  ShoppingBag,
  Activity,
  Trash2,
  Menu,
  Smartphone,
  PlayCircle,
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
  Power,
  PanelLeft,
  ChevronRightSquare,
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
  Target,
  BarChart,
  ClipboardCheck,
  Building,
  Upload,
  FileSpreadsheet,
  Download,
  Info,
  Database,
  Image as LucideImage
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
import { collection, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import type { Seller, SolutionConfig, Venue, StarterModifierGroup, StarterMenuItem, OrderFulfillmentThresholds, Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
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
    const finalData = { ...data, id, updatedAt: serverTimestamp(), createdAt: editingLead?.createdAt || serverTimestamp() };
    setDoc(doc(firestore, 'leads', id), finalData, { merge: true })
      .then(() => { toast({ title: editingLead ? "Lead Updated" : "Lead Created" }); setIsLeadFormOpen(false); setEditingLead(null); })
      .finally(() => setIsProcessingSave(false));
  };

  const handleInitializeLibrary = async () => {
    if (!firestore) return;
    setIsInitializingLibrary(true);
    try {
      const { seedGlobalStarterLibrary, seedGlobalStarterMenuLibrary } = await import('@/lib/seed-data');
      await seedGlobalStarterLibrary(firestore);
      await seedGlobalStarterMenuLibrary(firestore);
      toast({ title: "Libraries Initialized" });
    } finally { setIsInitializingLibrary(false); }
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!user || !isSuperAdmin) return null;

  const filteredLibraryItems = (libraryItems || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredItemTemplates = (itemLibrary || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredLeads = (leads || []).filter(l => l.venueName.toLowerCase().includes(leadSearchTerm.toLowerCase())).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

  const NAV_ITEMS = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "sales", label: "Sales CRM", icon: Target },
    { id: "venues", label: "Venues", icon: Store },
    { id: "library", label: "Library", icon: Library },
    { id: "system", label: "System", icon: Settings2 }
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
       <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            {sidebarOpen && <StylizedKoopLogo size="md" />}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">
              {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
             <nav className="space-y-1">
               {NAV_ITEMS.map((item) => (
                 <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen} />
               ))}
             </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8">
             <div className="max-w-7xl mx-auto space-y-8">
               {activeNav === 'dashboard' && (
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard label="Total Venues" value={venues?.length || 0} sub="Onboarded Partners" icon={Store} colorClass="bg-indigo-600" />
                    <KPICard label="Active Markets" value={2} sub="Regional Clusters" icon={MapPin} colorClass="bg-green-600" />
                    <KPICard label="Templates" value={(libraryItems?.length || 0) + (itemLibrary?.length || 0)} sub="Library Entities" icon={Library} colorClass="bg-primary" />
                    <KPICard label="System Health" value="100%" sub="All Feeds Live" icon={Activity} colorClass="bg-emerald-500" />
                 </div>
               )}

               {activeNav === 'sales' && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black uppercase text-[#213147]">Sales CRM</h2>
                      <Button onClick={() => { setEditingLead(null); leadForm.reset(); setIsLeadFormOpen(true); }} className="bg-primary uppercase font-black text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> New Lead</Button>
                    </div>
                    <div className="border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader><TableRow><TableHead className="px-6">Venue</TableHead><TableHead>Contact</TableHead><TableHead>Stage</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredLeads.map(lead => (
                            <TableRow key={lead.id}>
                              <TableCell className="px-6 py-4"><p className="font-black text-sm">{lead.venueName}</p><p className="text-[9px] uppercase text-muted-foreground">{lead.city}, {lead.state}</p></TableCell>
                              <TableCell><p className="font-bold text-xs">{lead.contactName}</p><p className="text-[9px] text-muted-foreground">{lead.email}</p></TableCell>
                              <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">{lead.stage}</Badge></TableCell>
                              <TableCell className="text-right px-6"><Button variant="ghost" size="icon" onClick={() => { setEditingLead(lead); leadForm.reset(lead); setIsLeadFormOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                 </div>
               )}
             </div>
          </div>
        </main>

        <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
          <DialogContent className="sm:max-w-[750px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl">
            <DialogHeader className="p-8 bg-[#213147] text-white">
              <DialogTitle className="font-headline font-black uppercase text-xl">{editingLead ? 'Modify Prospect' : 'New CRM Prospect'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
              <div className="p-8">
                <Form {...leadForm}>
                  <form onSubmit={leadForm.handleSubmit(handleSaveLead)} className="space-y-10">
                    <div className="space-y-6">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Store className="h-3 w-3" /> Core Lead Info</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={leadForm.control} name="venueName" render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                        )} />
                        <FormField control={leadForm.control} name="venueType" render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField control={leadForm.control} name="city" render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                        )} />
                        <FormField control={leadForm.control} name="state" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[9px] font-black uppercase">State</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="Select State" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={leadForm.control} name="zip" render={({ field }) => (
                          <FormItem><FormLabel className="text-[9px] font-black uppercase">Zip</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><User className="h-3 w-3" /> Identity & Ownership</Label>
                       <div className="grid grid-cols-2 gap-4">
                         <FormField control={leadForm.control} name="contactName" render={({ field }) => (
                           <FormItem><FormLabel className="text-[9px] font-black uppercase">Primary Contact</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                         )} />
                         <FormField control={leadForm.control} name="email" render={({ field }) => (
                           <FormItem><FormLabel className="text-[9px] font-black uppercase">Email Address</FormLabel><FormControl><Input {...field} type="email" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                         )} />
                       </div>
                    </div>

                    <FormField control={leadForm.control} name="stage" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[9px] font-black uppercase">Lead Stage</FormLabel>
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

                    <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                      {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize CRM Record
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
