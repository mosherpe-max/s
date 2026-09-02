'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store, 
  ExternalLink,
  Edit,
  Loader2,
  Save,
  DollarSign,
  ShieldCheck,
  Zap,
  Info,
  Trash2,
  Plus,
  AlertTriangle,
  User,
  MapPin,
  Mail,
  CheckCircle2,
  FlaskConical,
  Copy,
  Sparkles,
  Power,
  Timer,
  QrCode,
  RefreshCcw,
  XCircle,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { collection, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { Seller, Venue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { cn, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';

const SERVICE_MODES = [
  { id: 'Beverage Cart', label: 'Beverage Cart' },
  { id: 'Clubhouse', label: 'Clubhouse' },
  { id: 'Lane Delivery', label: 'Lane Delivery' }
];

const venueRegistrySchema = z.object({
  name: z.string().min(2, 'Name required'),
  solutionFeeFixed: z.coerce.number().min(0),
  solutionFeePercent: z.coerce.number().min(0),
  patronConvenienceFee: z.coerce.number().min(0),
  monthlySolutionFee: z.coerce.number().min(0),
  isFoundingPartner: z.boolean().default(false),
  isDemo: z.boolean().default(false),
  stripeOnboardingComplete: z.boolean().default(false),
  payoutsEnabled: z.boolean().default(false),
  menuTypes: z.array(z.string()).min(1, 'At least one service mode required'),
  laneCount: z.coerce.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional()
});

type VenueRegistryData = z.infer<typeof venueRegistrySchema>;

const newVenueSchema = z.object({
  courseName: z.string().min(2, 'Course name required'),
  type: z.enum(['Golf Course', 'Bowling Center']),
  ownerUid: z.string().min(10, 'Valid Manager UID required'),
  contactName: z.string().min(2, 'Contact name required'),
  contactEmail: z.string().email('Valid email required'),
  contactPhone: z.string().min(10, 'Valid phone number required'),
  streetAddress: z.string().min(2, 'Street address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().length(2, 'State code (e.g. MI)'),
  zip: z.string().min(5, 'Valid zip code required'),
  menuTypes: z.array(z.string()).min(1, 'Select at least one mode'),
  laneCount: z.coerce.number().min(0).optional()
});

type NewVenueData = z.infer<typeof newVenueSchema>;

export default function AdminVenueRegistryPage() {
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isNewVenueOpen, setIsNewVenueOpen] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'venues') : null), [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: venuesRegistry } = useCollection<Venue>(venuesQuery);

  // Launch-readiness checks only for the venue currently open in the Manage dialog
  const staffQuery = useMemoFirebase(() => (
    firestore && selectedVenue ? collection(firestore, 'sellers', selectedVenue.venueId, 'staff') : null
  ), [firestore, selectedVenue]);
  const { data: venueStaff } = useCollection(staffQuery);

  const menuItemsQuery = useMemoFirebase(() => (
    firestore && selectedVenue ? collection(firestore, 'sellers', selectedVenue.venueId, 'menuItems') : null
  ), [firestore, selectedVenue]);
  const { data: venueMenuItems } = useCollection(menuItemsQuery);

  const registryForm = useForm<VenueRegistryData>({
    resolver: zodResolver(venueRegistrySchema),
    defaultValues: {
      name: '',
      solutionFeeFixed: 0,
      solutionFeePercent: 0,
      patronConvenienceFee: 0,
      monthlySolutionFee: 0,
      isFoundingPartner: false,
      isDemo: false,
      stripeOnboardingComplete: false,
      payoutsEnabled: false,
      menuTypes: [],
      laneCount: 0,
      status: 'Active',
      latitude: 0,
      longitude: 0,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      streetAddress: '',
      city: '',
      state: '',
      zip: ''
    }
  });

  const onboardingForm = useForm<NewVenueData>({
    resolver: zodResolver(newVenueSchema),
    defaultValues: {
      courseName: '',
      type: 'Golf Course',
      ownerUid: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      menuTypes: ['Beverage Cart', 'Clubhouse'],
      laneCount: 0
    }
  });

  const handleEditVenue = (venueId: string) => {
    const reg = venuesRegistry?.find(v => v.venueId === venueId);
    const seller = sellers?.find(s => s.id === venueId);
    
    if (reg) {
      setSelectedVenue(reg);
      registryForm.reset({
        name: reg.name,
        solutionFeeFixed: reg.solutionFeeFixed || 0,
        solutionFeePercent: reg.solutionFeePercent || 0,
        patronConvenienceFee: reg.patronConvenienceFee || 0,
        monthlySolutionFee: reg.monthlySolutionFee || 0,
        isFoundingPartner: !!reg.isFoundingPartner,
        isDemo: !!reg.isDemo,
        stripeOnboardingComplete: !!reg.stripeOnboardingComplete,
        payoutsEnabled: !!reg.payoutsEnabled,
        menuTypes: seller?.menuTypes || [],
        laneCount: seller?.laneCount || 0,
        status: seller?.status || 'Active',
        latitude: seller?.latitude || 0,
        longitude: seller?.longitude || 0,
        contactName: seller?.contactName || '',
        contactEmail: seller?.contactEmail || '',
        contactPhone: seller?.contactPhone || '',
        streetAddress: seller?.streetAddress || '',
        city: seller?.city || '',
        state: seller?.state || '',
        zip: seller?.zip || ''
      });
      setIsManagementOpen(true);
    } else {
      toast({ variant: "destructive", title: "Registry Missing", description: "Operational profile exists but financial registry not found." });
    }
  };

  const onSaveVenueRegistry = async (data: VenueRegistryData) => {
    if (!firestore || !selectedVenue) return;
    setIsProcessing(true);
    
    const batch = writeBatch(firestore);
    const venueRef = doc(firestore, 'venues', selectedVenue.venueId);
    const sellerRef = doc(firestore, 'sellers', selectedVenue.venueId);

    const {
      menuTypes, laneCount, status, latitude, longitude,
      contactName, contactEmail, contactPhone, streetAddress, city, state, zip,
      ...venueData
    } = data;

    batch.update(venueRef, { ...venueData, updatedAt: serverTimestamp() });
    batch.update(sellerRef, {
      menuTypes, laneCount, status, latitude, longitude,
      contactName, contactEmail, contactPhone, streetAddress, city, state, zip,
      updatedAt: serverTimestamp()
    });

    batch.commit()
      .then(() => {
        toast({ title: "Registry Synchronized" });
        setIsManagementOpen(false);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: venueRef.path,
          operation: 'update',
          requestResourceData: venueData,
        } satisfies SecurityRuleContext));
      })
      .finally(() => setIsProcessing(false));
  };

  const handleApplyTemplates = async (type: 'mods' | 'items') => {
    if (!selectedVenue || !firebaseApp) return;
    setIsCloning(true);
    const functions = getFunctions(firebaseApp, 'us-central1');
    const funcName = type === 'mods' ? 'applyStarterMenu' : 'applyStarterItems';
    const func = httpsCallable(functions, funcName);
    
    const seller = sellers?.find(s => s.id === selectedVenue.venueId);
    const venueType = seller?.type === 'Golf Course' ? 'golf' : 'bowling';

    try {
      const result = await func({ venueId: selectedVenue.venueId, venueType });
      const data = result.data as { totalCreated: number };
      toast({ title: "Cloning Complete", description: `Initialized ${data.totalCreated} records for this venue.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Cloning Failed", description: e.message });
    } finally {
      setIsCloning(false);
    }
  };

  const handleCreateVenue = async (data: NewVenueData) => {
    if (!firestore) return;
    setIsProcessing(true);
    const venueId = data.courseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
      const configSnap = await getDoc(doc(firestore, 'solution', 'config'));
      const masterDefaults = configSnap.exists() ? configSnap.data()?.orderThresholds : {};

      const batch = writeBatch(firestore);
      const sellerRef = doc(firestore, 'sellers', venueId);
      const sellerData: Partial<Seller> = {
        id: venueId, courseName: data.courseName, type: data.type, status: 'Active',
        contactName: data.contactName, contactEmail: data.contactEmail, contactPhone: data.contactPhone,
        streetAddress: data.streetAddress, city: data.city, state: data.state, zip: data.zip,
        menuTypes: data.menuTypes, taxRate: 6.0, serviceFee: 1.50, ownerId: data.ownerUid,
        laneCount: data.type === 'Bowling Center' ? data.laneCount : 0,
        latitude: 0,
        longitude: 0,
        orderThresholds: masterDefaults || {},
        qrActive: true,
        qrSecret: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      };

      const businessRef = doc(firestore, 'venues', venueId);
      const businessData: Venue = {
        venueId: venueId, name: data.courseName, ownerUid: data.ownerUid,
        solutionFeeFixed: 50, solutionFeePercent: 2.9, patronConvenienceFee: 150,
        monthlySolutionFee: 49, isDemo: false, stripeOnboardingComplete: false,
        payoutsEnabled: false, createdAt: serverTimestamp() as any, updatedAt: serverTimestamp() as any,
      };

      batch.set(sellerRef, { ...sellerData, updatedAt: serverTimestamp() });
      batch.set(businessRef, businessData);
      batch.commit().then(() => {
        toast({ title: "Venue Created" });
        setIsNewVenueOpen(false);
        onboardingForm.reset();
      }).catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'create',
          requestResourceData: sellerData,
        } satisfies SecurityRuleContext));
      }).finally(() => setIsProcessing(false));

    } catch (e: any) {
      toast({ variant: "destructive", title: "Onboarding Failed", description: e.message });
      setIsProcessing(false);
    }
  };

  const handleQrAction = async (action: 'regenerate' | 'revoke') => {
    if (!firestore || !selectedVenue) return;
    const sellerRef = doc(firestore, 'sellers', selectedVenue.venueId);
    
    const updateData: any = { updatedAt: serverTimestamp() };
    if (action === 'regenerate') {
      updateData.qrSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      updateData.qrActive = true;
    } else {
      updateData.qrActive = false;
    }

    updateDoc(sellerRef, updateData).then(() => {
      toast({ 
        title: action === 'regenerate' ? "QR Regenerated" : "QR Revoked",
        description: action === 'regenerate' ? "New security key assigned. Old QR codes are now invalid." : "QR access channel deactivated."
      });
    }).catch(async (error) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sellerRef.path,
        operation: 'update',
        requestResourceData: updateData,
      } satisfies SecurityRuleContext));
    });
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !venueToDelete) return;
    setIsProcessing(true);
    
    const sellerRef = doc(firestore, 'sellers', venueToDelete);
    const venueRef = doc(firestore, 'venues', venueToDelete);

    deleteDoc(sellerRef)
      .then(() => deleteDoc(venueRef))
      .then(() => {
        toast({ title: "Registry Terminated" });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext));
      })
      .finally(() => {
        setIsProcessing(false);
        setVenueToDelete(null);
      });
  };

  const currentSeller = sellers?.find(s => s.id === selectedVenue?.venueId);
  const qrUrl = currentSeller?.qrActive && currentSeller?.qrSecret
    ? `${baseUrl}/sellers/${currentSeller.id}/order?key=${currentSeller.qrSecret}`
    : '';

  // Launch readiness - everything a Koop admin needs to have set up before a
  // venue is ready to take real orders. Recomputed live as fields are edited
  // in the Manage dialog below, so an admin can see progress as they go.
  const launchChecklist = React.useMemo(() => {
    const seller = currentSeller;
    const venue = selectedVenue;
    const authorizedModes = (seller?.menuTypes || []).filter(m => AUTHORIZED_SERVICE_MODES.includes(m));
    const hasOpenMode = authorizedModes.some(mode => {
      if (mode === 'Beverage Cart') return !!seller?.bevcartActive;
      if (mode === 'Clubhouse') return !!seller?.clubhouseActive;
      if (mode === 'Lane Delivery') return !!seller?.lanedeliveryActive;
      return false;
    });

    return [
      {
        label: 'Manager Contact',
        done: !!(seller?.contactName && seller?.contactEmail && seller?.contactPhone),
        detail: 'Add the manager\'s name, email, and phone number.'
      },
      {
        label: 'Venue Address',
        done: !!(seller?.streetAddress && seller?.city && seller?.state && seller?.zip),
        detail: 'Add the street address, city, state, and zip.'
      },
      {
        label: 'Map Location',
        done: !!(seller?.latitude && seller?.longitude),
        detail: 'Set latitude/longitude so patrons see the venue correctly on the map.'
      },
      {
        label: 'Service Mode Selected',
        done: authorizedModes.length > 0,
        detail: 'Choose at least one service mode (Beverage Cart, Clubhouse, Lane Delivery).'
      },
      {
        label: 'A Service Mode Is Open',
        done: hasOpenMode,
        detail: 'Open at least one service mode so patrons can actually order.'
      },
      {
        label: 'Stripe Connected',
        done: !!(venue?.stripeAccountId && venue?.payoutsEnabled),
        detail: 'Complete Stripe Connect onboarding so the venue can receive payouts.'
      },
      {
        label: 'Payment Methods Enabled',
        done: (seller?.enabledPaymentMethods?.length || 0) > 0,
        detail: 'Enable at least one patron payment method.'
      },
      {
        label: 'Staff Added',
        done: (venueStaff?.length || 0) > 0,
        detail: 'Add at least one staff member so orders can be fulfilled.'
      },
      {
        label: 'Menu Items Added',
        done: (venueMenuItems?.length || 0) > 0,
        detail: 'Add menu items, or clone starter templates below.'
      },
      {
        label: 'QR Access Active',
        done: !!(seller?.qrActive && seller?.qrSecret),
        detail: 'Generate a QR code so patrons can reach the ordering page.'
      },
    ];
  }, [currentSeller, selectedVenue, venueStaff, venueMenuItems]);

  const launchReadyCount = launchChecklist.filter(i => i.done).length;

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black uppercase text-[#213147]">Venue Registry</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Partner Oversight</p>
          </div>
        </div>
        <Button onClick={() => setIsNewVenueOpen(true)} className="bg-[#213147] font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl gap-2 shadow-lg">
          <Plus className="h-4 w-4" /> Add Venue
        </Button>
      </div>

      <div className="max-w-7xl mx-auto w-full border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Venue</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Authorized Modes</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Operational Status</TableHead>
              <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSellersLoading ? (
              <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></TableCell></TableRow>
            ) : (sellers || []).map(v => {
              const registry = venuesRegistry?.find(r => r.venueId === v.id);
              return (
                <TableRow key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-4">
                    <p className="font-black text-sm uppercase">{v.courseName}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">{v.city || 'Location Pending'}, {v.state || '--'}</p>
                  </TableCell>
                  <TableCell><Badge className="bg-[#213147] text-white text-[8px] font-black uppercase border-0">{v.type}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(v.menuTypes || [])
                        .filter(mode => AUTHORIZED_SERVICE_MODES.includes(mode))
                        .map(mode => (
                        <Badge key={mode} variant="outline" className="text-[7px] font-black uppercase bg-white border-primary/20 text-primary">{mode}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1">
                        <Badge variant={v.status === 'Active' ? 'default' : 'outline'} className={cn("text-[8px] font-black uppercase w-fit", v.status === 'Active' ? "bg-green-500" : "text-slate-400")}>
                          {v.status}
                        </Badge>
                        {registry?.isDemo && <Badge variant="outline" className="text-[7px] font-black uppercase w-fit border-amber-500/50 text-amber-600 bg-amber-50 gap-1.5"><FlaskConical className="h-2 w-2" /> Demo Instance</Badge>}
                     </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
                       <Button variant="outline" size="sm" onClick={() => handleEditVenue(v.id)} className="h-8 text-[9px] font-black uppercase tracking-widest border-2 gap-1.5 rounded-lg">
                          <Edit className="h-3 w-3" /> Manage
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => setVenueToDelete(v.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isNewVenueOpen} onOpenChange={setIsNewVenueOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">Venue Onboarding</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8">
              <Form {...onboardingForm}>
                <form onSubmit={onboardingForm.handleSubmit(handleCreateVenue)} className="space-y-8">
                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Store className="h-3 w-3" /> Identity & Type</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <FormField control={onboardingForm.control} name="courseName" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={onboardingForm.control} name="type" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Venue Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></FormItem>
                      )} />
                      {onboardingForm.watch('type') === 'Bowling Center' && (
                        <FormField control={onboardingForm.control} name="laneCount" render={({ field }) => (
                          <FormItem className="text-left animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-[10px] font-black uppercase">Number of Lanes</FormLabel>
                            <FormControl><Input {...field} type="number" className="h-12 border-2 font-bold" /></FormControl>
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </div>
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Zap className="h-3 w-3" /> Authorized Modes</Label>
                    {SERVICE_MODES.map((mode) => (
                      <FormField key={mode.id} control={onboardingForm.control} name="menuTypes" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 rounded-xl border-2 bg-slate-50 border-slate-100">
                          <FormControl><Checkbox checked={field.value?.includes(mode.id)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, mode.id]) : field.onChange(field.value?.filter((value) => value !== mode.id))} /></FormControl>
                          <FormLabel className="text-[10px] font-black uppercase cursor-pointer">{mode.label}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><User className="h-3 w-3" /> Identity Mapping</Label>
                    <FormField control={onboardingForm.control} name="contactName" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Manager Name</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={onboardingForm.control} name="contactEmail" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Manager Email</FormLabel><FormControl><Input {...field} type="email" className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={onboardingForm.control} name="contactPhone" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Manager Phone</FormLabel><FormControl><Input {...field} type="tel" className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={onboardingForm.control} name="ownerUid" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Owner Firebase UID</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-mono font-bold text-xs" /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><MapPin className="h-3 w-3" /> Venue Address</Label>
                    <FormField control={onboardingForm.control} name="streetAddress" render={({ field }) => (
                      <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Street Address</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={onboardingForm.control} name="city" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={onboardingForm.control} name="state" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">State</FormLabel><FormControl><Input {...field} maxLength={2} className="h-12 border-2 font-bold uppercase" /></FormControl></FormItem>
                      )} />
                      <FormField control={onboardingForm.control} name="zip" render={({ field }) => (
                        <FormItem className="text-left"><FormLabel className="text-[10px] font-black uppercase">Zip</FormLabel><FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                  <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Authorize Venue
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagementOpen} onOpenChange={setIsManagementOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="font-headline font-black uppercase text-xl">Venue Controls</DialogTitle>
              <Badge className={cn("border-0 text-[9px] font-black uppercase tracking-widest h-6 px-3 shrink-0", launchReadyCount === launchChecklist.length ? "bg-green-500" : "bg-amber-500")}>
                {launchReadyCount}/{launchChecklist.length} Launch Ready
              </Badge>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8 space-y-10">
               {/* LAUNCH READINESS CHECKLIST */}
               <div className="space-y-6">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Launch Checklist
                  </Label>
                  <div className="grid gap-2">
                    {launchChecklist.map((item) => (
                      <div key={item.label} className={cn("flex items-start gap-3 p-3 rounded-xl border-2", item.done ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100")}>
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="text-left">
                          <p className={cn("text-[10px] font-black uppercase tracking-widest leading-none", item.done ? "text-green-700" : "text-amber-700")}>{item.label}</p>
                          {!item.done && <p className="text-[8px] font-bold text-amber-600/80 uppercase mt-1 leading-relaxed">{item.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* QR LOGISTICS SECTION */}
               <div className="space-y-6">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> QR Access Logistics
                  </Label>
                  
                  <Card className="border-2 border-slate-100 bg-slate-50 overflow-hidden rounded-2xl">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-6">
                      {qrUrl ? (
                        <div className="space-y-6 w-full">
                          <div className="bg-white p-4 rounded-[2rem] shadow-xl border-4 border-white inline-block">
                             <img 
                               src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`}
                               alt="Venue Menu QR"
                               className="w-48 h-48 rounded-2xl"
                             />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border-2 border-slate-100">
                               <Input value={qrUrl} readOnly className="h-8 border-0 bg-transparent font-mono text-[9px] font-bold text-muted-foreground" />
                               <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { navigator.clipboard.writeText(qrUrl); toast({ title: "Link Copied" }); }}>
                                  <Copy className="h-3.5 w-3.5" />
                               </Button>
                            </div>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                              This link contains a unique security secret. Revoking it will immediately disable all printed codes.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleQrAction('regenerate')}
                               className="h-10 text-[9px] font-black uppercase tracking-widest border-2 gap-1.5 hover:bg-primary/5 hover:text-primary transition-all"
                             >
                               <RefreshCcw className="h-3 w-3" /> Regenerate
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => handleQrAction('revoke')}
                               className="h-10 text-[9px] font-black uppercase tracking-widest border-2 gap-1.5 text-destructive hover:bg-destructive/5"
                             >
                               <XCircle className="h-3 w-3" /> Revoke Access
                             </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 space-y-4">
                           <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                           <div className="space-y-1">
                              <p className="text-sm font-black uppercase tracking-tight text-[#213147]">QR Access Inactive</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase max-w-[200px]">This venue currently has no secure access channel initialized.</p>
                           </div>
                           <Button onClick={() => handleQrAction('regenerate')} className="bg-primary font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl gap-2">
                              <Plus className="h-4 w-4" /> Create New QR Code
                           </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
               </div>

               <Form {...registryForm}>
                 <form onSubmit={registryForm.handleSubmit(onSaveVenueRegistry)} className="space-y-8 pt-10 border-t-4 border-slate-100">
                    <div className="space-y-6">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Zap className="h-3 w-3" /> Authorized Modes</Label>
                       <div className="grid gap-3">
                        {SERVICE_MODES.map((mode) => (
                          <FormField key={mode.id} control={registryForm.control} name="menuTypes" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 rounded-xl border-2 bg-slate-50 border-slate-100">
                              <FormControl><Checkbox checked={field.value?.includes(mode.id)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, mode.id]) : field.onChange(field.value?.filter((value) => value !== mode.id))} /></FormControl>
                              <FormLabel className="text-[10px] font-black uppercase cursor-pointer">{mode.label}</FormLabel>
                            </FormItem>
                          )} />
                        ))}
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><DollarSign className="h-3 w-3" /> Transaction Model</Label>
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={registryForm.control} name="solutionFeeFixed" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Koop Fixed Fee (Cents)</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="solutionFeePercent" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Koop % Fee</FormLabel><FormControl><Input {...field} type="number" step="0.1" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={registryForm.control} name="patronConvenienceFee" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Patron Conv. Fee (Cents)</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="monthlySolutionFee" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Monthly Fee ($)</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><User className="h-3 w-3" /> Manager Contact</Label>
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={registryForm.control} name="contactName" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="contactPhone" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Phone</FormLabel><FormControl><Input {...field} type="tel" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                       <FormField control={registryForm.control} name="contactEmail" render={({ field }) => (
                         <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Email</FormLabel><FormControl><Input {...field} type="email" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                       )} />
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><MapPin className="h-3 w-3" /> Venue Address</Label>
                       <FormField control={registryForm.control} name="streetAddress" render={({ field }) => (
                         <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Street Address</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                       )} />
                       <div className="grid grid-cols-3 gap-4">
                          <FormField control={registryForm.control} name="city" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="state" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">State</FormLabel><FormControl><Input {...field} maxLength={2} className="h-11 border-2 font-bold uppercase" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="zip" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Zip</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><MapPin className="h-3 w-3" /> Static Map Anchors</Label>
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={registryForm.control} name="latitude" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Latitude</FormLabel><FormControl><Input {...field} type="number" step="0.000001" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="longitude" render={({ field }) => (
                            <FormItem className="text-left"><FormLabel className="text-[9px] font-black uppercase">Longitude</FormLabel><FormControl><Input {...field} type="number" step="0.000001" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                       <p className="text-[8px] font-medium text-muted-foreground uppercase px-1">Coordinates used as default center for patrons.</p>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> Status & Verification</Label>
                       <div className="grid gap-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                             <div className="flex flex-col text-left">
                               <span className="text-[10px] font-black uppercase text-[#213147]">Operational Activation</span>
                               <span className="text-[8px] font-bold text-muted-foreground uppercase">Enable global solution access</span>
                             </div>
                             <FormField control={registryForm.control} name="status" render={({ field }) => (
                               <Switch 
                                 checked={field.value === 'Active'} 
                                 onCheckedChange={(checked) => field.onChange(checked ? 'Active' : 'Inactive')} 
                                 className="data-[state=checked]:bg-green-600" 
                               />
                             )} />
                          </div>
                          {sellers?.find(s => s.id === selectedVenue?.venueId)?.type === 'Bowling Center' && (
                            <FormField control={registryForm.control} name="laneCount" render={({ field }) => (
                              <FormItem className="text-left p-3 rounded-xl border-2 bg-slate-50 border-slate-100">
                                <FormLabel className="text-[10px] font-black uppercase">Lane Inventory</FormLabel>
                                <FormControl><Input {...field} type="number" className="h-10 border-2 font-bold bg-white" /></FormControl>
                              </FormItem>
                            )} />
                          )}
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                             <div className="flex flex-col text-left"><span className="text-[10px] font-black uppercase text-[#213147]">Demo Instance</span><span className="text-[8px] font-bold text-muted-foreground uppercase">Exclude from Global Results</span></div>
                             <FormField control={registryForm.control} name="isDemo" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-amber-500" />)} />
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                             <span className="text-[10px] font-black uppercase text-[#213147]">Stripe Verified</span>
                             <FormField control={registryForm.control} name="stripeOnboardingComplete" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" />)} />
                          </div>
                       </div>
                    </div>

                    <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Registry
                    </Button>
                 </form>
               </Form>

               <div className="space-y-6 pt-10 border-t-4 border-primary/10">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Template Cloning</Label>
                  <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase">Push global starter templates to this venue's local catalog.</p>
                  <div className="grid grid-cols-2 gap-4">
                     <Button variant="outline" disabled={isCloning} onClick={() => handleApplyTemplates('mods')} className="h-16 flex-col gap-1 border-2 rounded-2xl border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                        {isCloning ? <Loader2 className="animate-spin h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Clone Modifiers</span>
                     </Button>
                     <Button variant="outline" disabled={isCloning} onClick={() => handleApplyTemplates('items')} className="h-16 flex-col gap-1 border-2 rounded-2xl border-primary/10 text-primary hover:bg-primary/5">
                        {isCloning ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Clone Items</span>
                     </Button>
                  </div>
               </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-2 shadow-2xl p-8">
          <AlertDialogHeader className="text-left space-y-4">
            <div className="bg-destructive/10 p-3 rounded-2xl w-fit"><AlertTriangle className="h-8 w-8 text-destructive" /></div>
            <div className="space-y-1">
              <AlertDialogTitle className="font-headline font-black uppercase text-xl">Terminate Registry?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">Irreversible action. Scrubbing <strong className="text-destructive uppercase">{venueToDelete}</strong> from global databases.</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2 h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />} Terminate Venue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
