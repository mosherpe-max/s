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
  Wand2,
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
  CreditCard
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
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth, useDoc, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Seller, SolutionConfig, Order, Venue, StarterModifierGroup, StarterMenuItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { seedAllDemoData, seedGlobalStarterLibrary, seedGlobalStarterMenuLibrary, resetAllVenueOperationalStatus } from '@/lib/seed-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const venueSettingsSchema = z.object({
  patronConvenienceFee: z.coerce.number().min(0),
  monthlySolutionFee: z.coerce.number().min(0),
  name: z.string().min(2, 'Venue name required'),
});

type VenueSettingsFormData = z.infer<typeof venueSettingsSchema>;

const NAV_ITEMS = [
  { id: "dashboard", label: "Global Overview", icon: LayoutDashboard },
  { id: "venues", label: "Venue Management", icon: Store },
  { id: "library", label: "Global Library", icon: Library },
  { id: "demos", label: "Sales Demos", icon: Zap },
  { id: "system", label: "System Control", icon: Settings2 },
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
  const [editingLibraryItem, setEditingLibraryItem] = useState<StarterModifierGroup | null>(null);

  const [isVenueSettingsOpen, setIsVenueSettingsOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);

  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [isInitializingLibrary, setIsInitializingLibrary] = useState(false);
  const [isResettingSystem, setIsResettingSystem] = useState(false);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  // System Config State
  const [configData, setConfigData] = useState<Partial<SolutionConfig>>({
    supportEmail: '',
    logoUrl: '',
    dailyResetHour: 4,
    smsNotificationsEnabled: true,
    gpsFreshnessThresholds: { hot: 60, warm: 300, cold: 600 },
    enabledModes: ['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out']
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: remoteConfig } = useDoc<SolutionConfig>(configRef);

  useEffect(() => {
    if (remoteConfig) {
      setConfigData({
        ...remoteConfig,
        gpsFreshnessThresholds: remoteConfig.gpsFreshnessThresholds || { hot: 60, warm: 300, cold: 600 },
        enabledModes: remoteConfig.enabledModes || ['Beverage Cart', 'Clubhouse', 'Lane Delivery', 'Take Out']
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

  const libraryQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_modifier_library') : null), [firestore]);
  const itemLibQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_menu_item_library') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);

  const { data: libraryItems } = useCollection<StarterModifierGroup>(libraryQuery);
  const { data: itemLibrary } = useCollection<StarterMenuItem>(itemLibQuery);
  const { data: venues } = useCollection<Seller>(venuesQuery);

  const libraryForm = useForm<StarterModifierFormData>({
    resolver: zodResolver(starterModifierSchema),
    defaultValues: { name: '', venueType: ['golf', 'bowling'], category: 'food', selectionType: 'single', required: false, sortOrder: 0, options: [{ label: '', priceModifier: 0 }] }
  });

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: libraryForm.control, name: "options" });

  const venueSettingsForm = useForm<VenueSettingsFormData>({
    resolver: zodResolver(venueSettingsSchema),
    defaultValues: { patronConvenienceFee: 150, monthlySolutionFee: 0, name: '' }
  });

  useEffect(() => {
    if (editingLibraryItem && isLibraryFormOpen) {
      libraryForm.reset({ name: editingLibraryItem.name, venueType: editingLibraryItem.venueType, category: editingLibraryItem.category as any, selectionType: editingLibraryItem.selectionType, required: editingLibraryItem.required, sortOrder: editingLibraryItem.sortOrder, options: editingLibraryItem.options });
    }
  }, [editingLibraryItem, isLibraryFormOpen, libraryForm]);

  const handleEditVenueSettings = async (v: Seller) => {
    if (!firestore) return;
    setSelectedVenue(v);
    const venueDoc = await doc(firestore, 'venues', v.id);
    // Note: We might need to fetch the Venue doc specifically for fees
    venueSettingsForm.reset({
      name: v.courseName,
      patronConvenienceFee: 150, // Default if not found
      monthlySolutionFee: 0
    });
    setIsVenueSettingsOpen(true);
  };

  const handleSaveVenueSettings = async (data: VenueSettingsFormData) => {
    if (!firestore || !selectedVenue) return;
    setIsProcessingSave(true);
    try {
      await updateDoc(doc(firestore, 'venues', selectedVenue.id), {
        patronConvenienceFee: data.patronConvenienceFee,
        monthlySolutionFee: data.monthlySolutionFee,
        updatedAt: serverTimestamp()
      });
      // Also update seller doc if serviceFee is mirrored there
      await updateDoc(doc(firestore, 'sellers', selectedVenue.id), {
        serviceFee: data.patronConvenienceFee / 100,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Venue Settings Saved" });
      setIsVenueSettingsOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsProcessingSave(false);
    }
  };

  const handleSaveLibraryItem = async (data: StarterModifierFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingLibraryItem?.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setDoc(doc(firestore, 'starter_modifier_library', id), data, { merge: true }).then(() => { toast({ title: "Template Saved" }); setIsLibraryFormOpen(false); }).finally(() => setIsProcessingSave(false));
  };

  const handleInitializeLibrary = async () => {
    if (!firestore) return;
    setIsInitializingLibrary(true);
    try {
      await seedGlobalStarterLibrary(firestore);
      await seedGlobalStarterMenuLibrary(firestore);
      toast({ title: "Libraries Initialized", description: "All templates provisioned." });
    } catch (e: any) { 
      console.error("Initialization Failed:", e);
      toast({ variant: "destructive", title: "Setup Failed", description: e.message }); 
    } finally { setIsInitializingLibrary(false); }
  };

  const handleSystemReset = async () => {
    if (!firestore) return;
    setIsResettingSystem(true);
    try {
      await resetAllVenueOperationalStatus(firestore);
      toast({ title: "System Reset Complete", description: "All operational statuses cleared." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Reset Failed" });
    } finally { setIsResettingSystem(false); }
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  
  if (isUserLoading) return <div className="flex flex-col items-center justify-center min-h-screen bg-[#213147] text-white"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user || !isSuperAdmin) return null;

  const filteredLibraryItems = (libraryItems || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const filteredItemTemplates = (itemLibrary || []).filter(item => item.name.toLowerCase().includes(librarySearchTerm.toLowerCase())).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

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
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-x-auto text-left">
      <header className="h-16 bg-white border-b-2 flex items-center justify-between px-8 shrink-0 z-30 shadow-sm relative">
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

      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
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

        <main className="flex-1 flex flex-col overflow-x-auto overflow-y-hidden relative">
          <ScrollArea className="flex-1 p-8">
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

              {activeNav === 'venues' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center border-b-2 pb-6">
                     <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Establishment Registry</h3>
                     <Button className="bg-indigo-600 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl">
                       <Plus className="h-4 w-4" /> Add Venue
                     </Button>
                  </div>
                  <div className="border-2 rounded-[2rem] overflow-x-auto bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase px-6 h-12">Establishment</TableHead>
                          <TableHead className="text-[10px] font-black uppercase px-6 h-12">Type</TableHead>
                          <TableHead className="text-[10px] font-black uppercase px-6 h-12">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase px-6 h-12 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {venues?.map(v => (
                          <TableRow key={v.id} className="group cursor-pointer">
                            <TableCell className="px-6 py-4" onClick={() => router.push(`/sellers/${v.id}`)}>
                              <p className="font-black text-sm text-[#213147]">{v.courseName}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">{v.city}, {v.state}</p>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge variant="outline" className="text-[8px] font-black uppercase">{v.type}</Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge className={cn("text-[8px] font-black uppercase", v.status === 'Active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>
                                {v.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditVenueSettings(v)} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50">
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => router.push(`/sellers/${v.id}`)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                      <Button onClick={() => { if (libraryTab === 'modifiers') { setEditingLibraryItem(null); libraryForm.reset(); setIsLibraryFormOpen(true); } }} className="bg-indigo-600 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl">
                        <Plus className="h-4 w-4" /> Add New {libraryTab === 'modifiers' ? 'Modifier' : 'Item'}
                      </Button>
                    </div>
                  </div>

                  <Tabs value={libraryTab} onValueChange={(v: any) => setLibraryTab(v)} className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <TabsList className="bg-slate-100 p-1 rounded-xl h-11"><TabsTrigger value="modifiers" className="text-[10px] font-black uppercase tracking-widest px-8">Modifier Sets</TabsTrigger><TabsTrigger value="items" className="text-[10px] font-black uppercase tracking-widest px-8">Menu Items</TabsTrigger></TabsList>
                      <div className="flex bg-white p-2 px-3 rounded-xl border-2 shadow-sm gap-3 items-center w-full max-sm:max-w-none max-w-sm"><Search className="h-4 w-4 text-muted-foreground shrink-0" /><Input placeholder="Search library..." value={librarySearchTerm} onChange={(e) => setLibrarySearchTerm(e.target.value)} className="border-0 shadow-none text-xs font-medium p-0 h-auto" /></div>
                    </div>

                    <TabsContent value="modifiers" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredLibraryItems.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 bg-slate-50"><Library className="h-10 w-10 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Library Empty. Click Initialize All above.</p></div>
                      ) : filteredLibraryItems.map(item => (
                        <Card key={item.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left">
                          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-0.5 text-left"><p className="font-black text-xs uppercase text-[#213147]">{item.name}</p><div className="flex gap-1">{item.venueType.map(v => <Badge key={v} className="text-[6px] font-black uppercase h-3 px-1 border-0 bg-slate-200 text-slate-600">{v}</Badge>)}<Badge className="text-[6px] font-black uppercase h-3 px-1 border-0 bg-indigo-100 text-indigo-700">{item.category}</Badge></div></div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setEditingLibraryItem(item); setIsLibraryFormOpen(true); }}><Edit className="h-4 w-4" /></Button></div>
                          </CardHeader>
                          <CardContent className="p-4 flex flex-wrap gap-1.5 text-left">{item.options.map((opt, idx) => (<Badge key={idx} variant="outline" className="text-[8px] font-bold uppercase">{opt.label} {opt.priceModifier > 0 && `(+$${opt.priceModifier.toFixed(2)})`}</Badge>))}</CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="items" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                       {filteredItemTemplates.length === 0 ? (
                        <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50 bg-slate-50"><UtensilsCrossed className="h-10 w-10 mx-auto mb-4 text-slate-300" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Library Empty. Click Initialize All above.</p></div>
                      ) : filteredItemTemplates.map(item => (
                        <Card key={item.id} className="border-2 shadow-sm group hover:border-indigo-200 transition-all bg-white text-left">
                          <CardHeader className="p-4 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1 text-left"><Badge className="h-4 px-1 text-[8px] font-black uppercase bg-[#213147] text-white border-0">{item.serviceMode}</Badge><p className="font-black text-xs uppercase text-[#213147] truncate">{item.name}</p></div>
                          </CardHeader>
                          <CardContent className="p-4 space-y-2 text-left"><p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p><div className="flex justify-between items-center"><span className="text-xs font-black text-primary">${item.price.toFixed(2)}</span><div className="flex gap-1">{item.suggestedModifierGroups?.slice(0, 2).map(m => (<Badge key={m} className="text-[6px] uppercase px-1 h-3">{m}</Badge>))}</div></div></CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeNav === 'demos' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center border-b-2 pb-6">
                     <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Sales Demo Control</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 p-8 space-y-6 text-left">
                      <div className="bg-amber-100 p-4 rounded-3xl w-fit text-amber-700"><AlertTriangle className="h-10 w-10" /></div>
                      <div className="space-y-2">
                        <h4 className="font-headline font-black text-xl uppercase">Full Demo Reseed</h4>
                        <p className="text-xs text-muted-foreground">Wipes and recreates all demo venues (demo-course, etc.) with factory-default items and modifiers.</p>
                      </div>
                      <Button onClick={async () => { if(confirm('Wipe and reseed all demos?')){ await seedAllDemoData(firestore!); toast({ title: "Seed Complete" }); } }} variant="destructive" className="w-full h-14 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                        <Zap className="h-4 w-4" /> Reseed All Demo Venues
                      </Button>
                    </Card>

                    <Card className="border-2 p-8 space-y-6 text-left">
                      <div className="bg-indigo-100 p-4 rounded-3xl w-fit text-indigo-700"><Timer className="h-10 w-10" /></div>
                      <div className="space-y-2">
                        <h4 className="font-headline font-black text-xl uppercase">Global Operational Reset</h4>
                        <p className="text-xs text-muted-foreground">Deactivates all service modes and clears driver locations across the platform.</p>
                      </div>
                      <Button onClick={handleSystemReset} disabled={isResettingSystem} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                        {isResettingSystem ? <Loader2 className="animate-spin" /> : <Power className="h-4 w-4" />} Clear Platform Activity
                      </Button>
                    </Card>
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* CORE IDENTITY & SUPPORT */}
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

                    {/* SIGNAL HEALTH & MODE AUTH */}
                    <Card className="border-2 p-8 space-y-8 text-left">
                       <div className="space-y-6">
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
                         <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed px-1">
                           Controls how markers age on map views. Markers past Cold threshold will turn gray (Lost Signal).
                         </p>
                       </div>

                       <Separator className="opacity-50" />

                       <div className="space-y-6">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Power className="h-3 w-3" /> Global Mode Authorization
                         </Label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {['Beverage Cart', 'Clubhouse', 'Pool', 'Lane Delivery', 'Take Out'].map(mode => (
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
                         <p className="text-[10px] text-muted-foreground uppercase font-bold leading-relaxed px-1">
                           Restricts available service channels platform-wide, even if configured at venue level.
                         </p>
                       </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Modifier Template Form */}
      <Dialog open={isLibraryFormOpen} onOpenChange={setIsLibraryFormOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left"><div className="flex items-center gap-4 text-left"><div className="bg-white/20 p-3 rounded-2xl shrink-0"><Tags className="h-6 w-6 text-white" /></div><div className="text-left"><DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Modifier Set Template</DialogTitle></div></div></DialogHeader>
          <ScrollArea className="max-h-[70vh]"><div className="p-8 text-left"><Form {...libraryForm}><form onSubmit={libraryForm.handleSubmit(handleSaveLibraryItem)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={libraryForm.control} name="name" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Template Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>)} />
              <FormField control={libraryForm.control} name="category" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="food">Food</SelectItem><SelectItem value="beverage">Beverage</SelectItem><SelectItem value="universal">Universal</SelectItem></SelectContent></Select></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField control={libraryForm.control} name="selectionType" render={({ field }) => (<FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Selection Logic</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="single">Single (Radio)</SelectItem><SelectItem value="multi">Multiple (Checkbox)</SelectItem></SelectContent></Select></FormItem>)} />
               <FormField control={libraryForm.control} name="required" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-xl border-2 p-3 space-y-0 h-12"><div className="space-y-0.5"><FormLabel className="text-[10px] font-black uppercase">Required</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1"><Label className="text-[10px] font-black uppercase text-indigo-600">Template Options</Label><Button type="button" variant="ghost" size="sm" onClick={() => appendOption({ label: '', priceModifier: 0 })} className="text-[9px] font-black uppercase gap-1.5"><Plus className="h-3 w-3" /> Add Option</Button></div>
              {optionFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border-2">
                  <FormField control={libraryForm.control} name={`options.${index}.label`} render={({ field }) => (<FormItem className="flex-1 text-left"><FormControl><Input {...field} placeholder="Label" className="h-10 border-2 font-bold bg-white" /></FormControl></FormItem>)} />
                  <FormField control={libraryForm.control} name={`options.${index}.priceModifier`} render={({ field }) => (<FormItem className="w-24 text-left"><FormControl><Input {...field} type="number" step="0.01" placeholder="$0.00" className="h-10 border-2 font-bold bg-white" /></FormControl></FormItem>)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)} className="h-10 w-10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">{isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Master Template</Button>
          </form></Form></div></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Venue Settings Dialog (Koop Admin Only) */}
      <Dialog open={isVenueSettingsOpen} onOpenChange={setIsVenueSettingsOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/10 p-3 rounded-2xl shrink-0"><Settings className="h-6 w-6 text-primary" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">Venue Controls</DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">{selectedVenue?.courseName}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 text-left">
            <Form {...venueSettingsForm}>
              <form onSubmit={venueSettingsForm.handleSubmit(handleSaveVenueSettings)} className="space-y-6">
                <div className="space-y-4">
                  <FormField control={venueSettingsForm.control} name="patronConvenienceFee" render={({ field }) => (
                    <FormItem className="text-left">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="text-[10px] font-black uppercase">Convenience Fee (Cents)</FormLabel>
                        <Badge variant="outline" className="text-[8px] font-black border-primary/20 bg-primary/5 text-primary">KOOP REVENUE</Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="number" placeholder="150" className="pl-10 h-12 border-2 font-bold" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[9px] uppercase font-bold">This is the per-order fee paid by the patron.</FormDescription>
                    </FormItem>
                  )} />

                  <FormField control={venueSettingsForm.control} name="monthlySolutionFee" render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel className="text-[10px] font-black uppercase">Monthly Subscription ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="number" placeholder="0" className="pl-10 h-12 border-2 font-bold" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                    These settings are restricted to Koop Administrators. Venue managers cannot view or modify these financial terms.
                  </p>
                </div>

                <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                  {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Apply Financial Terms
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
