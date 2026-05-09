
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Loader2, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Activity,
  Search,
  Briefcase,
  Edit,
  MapPin,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  UserPlus,
  KeyRound,
  Trash2,
  Users,
  LogOut,
  ChevronDown,
  Truck,
  Banknote,
  Settings,
  Eye,
  EyeOff,
  Save,
  Globe,
  FlaskConical
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Seller, Order, Prospect, AdminUser } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name required'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant']),
  contactName: z.string().min(2, 'Contact name required'),
  contactEmail: z.string().email('Invalid email'),
  contactPhone: z.string().min(10, 'Valid phone required'),
  streetAddress: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  zip: z.string().min(5, 'ZIP required'),
  serviceFee: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0),
  koopFeeOffsetCents: z.coerce.number().min(0).default(0),
  launchFee: z.coerce.number().min(0),
  monthlyPlatformFee: z.coerce.number().min(0),
  status: z.enum(['Active', 'Inactive']),
  laneCount: z.coerce.number().min(0).optional(),
  menuTypes: z.array(z.string()).min(1, 'Select at least one menu type'),
});

type SellerFormData = z.infer<typeof sellerSchema>;

const systemSchema = z.object({
  stripePublishableKey: z.string().min(1, 'Required'),
  stripeSecretKey: z.string().min(1, 'Required'),
  stripeWebhookSecret: z.string().min(1, 'Required'),
});

type SystemFormData = z.infer<typeof systemSchema>;

function MetricCard({ title, value, icon: Icon, description, trend }: { title: string, value: string | number, icon: any, description?: string, trend?: string }) {
  return (
    <Card className="shadow-sm border-2">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</p>
            <p className="text-2xl font-black font-headline">{value}</p>
            {description && <p className="text-[9px] text-muted-foreground font-medium">{description}</p>}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-[9px] font-bold text-green-600 uppercase">{trend} vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function KOOPAdminPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Authorization Check
  const isHardcodedSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  
  const platformRoleRef = useMemoFirebase(() => {
    if (!firestore || !user || isHardcodedSuperAdmin) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user, isHardcodedSuperAdmin]);
  
  const { data: platformRoleMarker, isLoading: isRoleCheckLoading } = useDoc(platformRoleRef);

  const isVerifying = isUserLoading || (isRoleCheckLoading && !isHardcodedSuperAdmin);
  const isAuthorized = isHardcodedSuperAdmin || !!platformRoleMarker;

  // Platform Config (Split into Public and Private)
  const configRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'config', 'platform');
  }, [firestore]);
  const { data: config } = useDoc<any>(configRef);

  const privateConfigRef = useMemoFirebase(() => {
    // ONLY Super Admin can read the secrets doc
    if (!firestore || !isHardcodedSuperAdmin) return null;
    return doc(firestore, 'config', 'platform_private');
  }, [firestore, isHardcodedSuperAdmin]);
  const { data: privateConfig } = useDoc<any>(privateConfigRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: "Signed Out" });
    } catch (e) {
      toast({ variant: "destructive", title: "Logout Failed" });
    }
  };

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'sellers');
  }, [firestore, isAuthorized]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'orders');
  }, [firestore, isAuthorized]);

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'prospects');
  }, [firestore, isAuthorized]);

  const adminsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return collection(firestore, 'adminUsers');
  }, [firestore, isAuthorized]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders } = useCollection<Order>(ordersQuery);
  const { data: prospects } = useCollection<Prospect>(prospectsQuery);
  const { data: admins, isLoading: isAdminsLoading } = useCollection<AdminUser>(adminsQuery);

  const filteredSellers = useMemo(() => {
    if (!sellers) return [];
    if (!searchTerm) return sellers;
    const term = searchTerm.toLowerCase();
    return sellers.filter(s => 
      s.courseName.toLowerCase().includes(term) ||
      s.contactEmail.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  }, [sellers, searchTerm]);

  const isTestMode = config?.stripePublishableKey?.startsWith('pk_test_');

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      type: 'Public Golf Course',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      serviceFee: 2.50,
      taxRate: 6.0,
      koopFeeOffsetCents: 50,
      launchFee: 500,
      monthlyPlatformFee: 99,
      status: 'Active',
      laneCount: 0,
      menuTypes: [],
    },
  });

  const systemForm = useForm<SystemFormData>({
    resolver: zodResolver(systemSchema),
    defaultValues: {
      stripePublishableKey: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
    },
  });

  useEffect(() => {
    if (config || privateConfig) {
      systemForm.reset({
        stripePublishableKey: config?.stripePublishableKey || '',
        stripeSecretKey: privateConfig?.stripeSecretKey || '',
        stripeWebhookSecret: privateConfig?.stripeWebhookSecret || '',
      });
    }
  }, [config, privateConfig, systemForm]);

  const onSaveSystem = async (data: SystemFormData) => {
    if (!firestore || !isAuthorized) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      
      // 1. Save Public Key
      batch.set(doc(firestore, 'config', 'platform'), {
        stripePublishableKey: data.stripePublishableKey,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Save Secrets (Accessible ONLY by Super Admin)
      if (isHardcodedSuperAdmin) {
        batch.set(doc(firestore, 'config', 'platform_private'), {
          stripeSecretKey: data.stripeSecretKey,
          stripeWebhookSecret: data.stripeWebhookSecret,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      toast({ title: "System Config Updated", description: "API keys have been securely distributed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewSeller = () => {
    setEditingSeller(null);
    form.reset({
      courseName: '',
      type: 'Public Golf Course',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      serviceFee: 2.50,
      taxRate: 6.0,
      koopFeeOffsetCents: 50,
      launchFee: 500,
      monthlyPlatformFee: 99,
      status: 'Active',
      laneCount: 0,
      menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out'],
    });
    setIsFormOpen(true);
  };

  const handleEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
    form.reset({
      courseName: seller.courseName || '',
      type: seller.type || 'Public Golf Course',
      contactName: seller.contactName || '',
      contactEmail: seller.contactEmail || '',
      contactPhone: seller.contactPhone || '',
      streetAddress: seller.streetAddress || '',
      city: seller.city || '',
      state: seller.state || '',
      zip: seller.zip || '',
      serviceFee: seller.serviceFee || 0,
      taxRate: seller.taxRate || 0,
      koopFeeOffsetCents: seller.koopFeeOffsetCents || 0,
      launchFee: seller.launchFee || 0,
      monthlyPlatformFee: seller.monthlyPlatformFee || 0,
      status: seller.status || 'Active',
      laneCount: seller.laneCount || 0,
      menuTypes: seller.menuTypes || [],
    });
    setIsFormOpen(true);
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore || !isAuthorized) return;
    setIsSaving(true);
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    
    await setDoc(doc(firestore, 'sellers', sellerId), { 
      ...data, 
      id: sellerId,
      createdAt: editingSeller?.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      qrCodeUrl: editingSeller?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.origin}/sellers/${sellerId}/order`
    }, { merge: true });
    
    toast({ title: editingSeller ? 'Venue Updated' : 'Venue Registered' });
    setIsFormOpen(false);
    setEditingSeller(null);
    form.reset();
    setIsSaving(false);
  };

  const handleSendResetLink = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Link Sent", description: `Authorization email sent to ${email}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Request Failed", description: err.message });
    }
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verifying Authorization...</p>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] shadow-xl max-w-md w-full space-y-6">
          <div className="p-4 bg-red-100 rounded-full inline-block"><Lock className="h-12 w-12 text-red-600" /></div>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-[#213147]">ACCESS RESTRICTED</h2>
            <p className="text-sm text-muted-foreground font-medium">This interface requires Administrator authorization.</p>
          </div>
          <Button asChild className="w-full h-12 bg-[#213147] hover:bg-black font-bold uppercase tracking-widest"><Link href="/login">Authenticate</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-3xl font-bold text-[#213147] uppercase tracking-tight">KOOP ADMIN</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-black">Authorized Portal</Badge>
            {isTestMode && <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 uppercase text-[10px] font-black gap-1.5"><FlaskConical className="h-3 w-3" /> Test Mode Active</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">Platform oversight and system configuration.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={handleLogout} className="text-[10px] font-black uppercase h-10 px-4 tracking-widest text-muted-foreground hover:text-destructive"><LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out</Button>
          <Button onClick={handleAddNewSeller} className="h-10 px-6 font-black uppercase text-[10px] tracking-widest"><PlusCircle className="mr-2 h-4 w-4" /> Register Venue</Button>
        </div>
      </header>

      <Tabs defaultValue="operations" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 h-12">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase px-8 h-10"><Activity className="mr-2 h-3.5 w-3.5" /> Operations</TabsTrigger>
          <TabsTrigger value="staff" className="text-[10px] font-black uppercase px-8 h-10"><Users className="mr-2 h-3.5 w-3.5" /> User Registry</TabsTrigger>
          <TabsTrigger value="system" className="text-[10px] font-black uppercase px-8 h-10"><Settings className="mr-2 h-3.5 w-3.5" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Active Venues" value={sellers?.length || 0} icon={Building} />
            <MetricCard title="Total Orders" value={orders?.length || 0} icon={ShoppingBag} />
            <MetricCard title="Platform Gross" value={`$${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`} icon={DollarSign} />
            <MetricCard title="Pipeline Value" value={`$${(prospects?.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0) || 0).toLocaleString()}`} icon={Briefcase} />
          </div>

          <Card className="shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-black uppercase">Venue Network</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Filter..." className="pl-9 h-9 text-xs border-2 w-full rounded-md px-3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-[10px] uppercase font-black">Establishment</TableHead>
                    <TableHead className="text-[10px] uppercase font-black">Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSellersLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                  ) : filteredSellers.map((seller) => (
                    <TableRow key={seller.id} className="group hover:bg-muted/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{seller.courseName}</span>
                          <span className="text-[9px] text-muted-foreground uppercase">{seller.contactEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-xs">{seller.type}</span></TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] uppercase font-black", seller.status === 'Active' ? 'bg-green-600' : 'bg-slate-400')}>{seller.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSeller(seller)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase gap-1.5 px-3 bg-muted/20">Impersonate <ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 shadow-xl border-2">
                              <DropdownMenuItem asChild><Link href={`/sellers/${seller.id}`} className="flex items-center gap-3 cursor-pointer"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-xs font-bold uppercase">Seller Admin Portal</span></Link></DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild><Link href={`/sellers/${seller.id}/bevcart`} className="flex items-center gap-3 cursor-pointer"><Truck className="h-4 w-4 text-indigo-600" /><span className="text-xs font-bold uppercase">BevCart Driver</span></Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link href={`/sellers/${seller.id}/clubhouse`} className="flex items-center gap-3 cursor-pointer"><LayoutDashboard className="h-4 w-4 text-indigo-600" /><span className="text-xs font-bold uppercase">Clubhouse Staff</span></Link></DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <Card className="shadow-md border-2 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">User Profile</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Platform Role</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isAdminsLoading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-12 w-full" /></TableCell></TableRow>) : admins?.map((admin) => (
                  <TableRow key={admin.email} className="hover:bg-muted/5">
                    <TableCell><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></div><div className="flex flex-col"><span className="font-bold text-sm">{admin.email}</span><span className="text-[9px] text-muted-foreground font-mono">{admin.id}</span></div></div></TableCell>
                    <TableCell><Badge variant="default" className="text-[8px] font-black uppercase">{admin.role}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleSendResetLink(admin.email)} className="h-8 text-[9px] font-black uppercase border-indigo-200 text-indigo-600 hover:bg-indigo-50"><KeyRound className="mr-1.5 h-3 w-3" /> Reset Link</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-2 border-[#635BFF]/20">
              <CardHeader className="bg-[#635BFF]/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="bg-[#635BFF] p-2 rounded-lg"><Zap className="h-5 w-5 text-white" /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-black uppercase tracking-tight">Stripe Platform Credentials</CardTitle>
                      {isTestMode && <Badge className="bg-amber-500 text-white uppercase text-[8px] font-black">Test Mode</Badge>}
                    </div>
                    <CardDescription className="text-xs uppercase font-bold text-slate-500">Configure global API keys for payment routing.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit(onSaveSystem)} className="space-y-6">
                    <FormField control={systemForm.control} name="stripePublishableKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">Publishable Key</FormLabel>
                        <FormControl><Input {...field} placeholder="pk_live_..." className="font-mono text-xs border-2" /></FormControl>
                        <FormDescription className="text-[8px] uppercase">Public identifier for the Koop platform. Safe for public read access.</FormDescription>
                      </FormItem>
                    )} />
                    
                    <FormField control={systemForm.control} name="stripeSecretKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">Secret Key</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              {...field} 
                              type={showSecret ? "text" : "password"} 
                              placeholder={isHardcodedSuperAdmin ? "sk_live_..." : "••••••••••••••••"} 
                              className="font-mono text-xs border-2 pr-10" 
                              disabled={!isHardcodedSuperAdmin}
                            />
                          </FormControl>
                          {isHardcodedSuperAdmin && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="absolute right-0 top-0 h-full text-muted-foreground"
                              onClick={() => setShowSecret(!showSecret)}
                            >
                              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                        <FormDescription className="text-[8px] uppercase font-bold text-red-600">
                          {isHardcodedSuperAdmin ? 'Restricted: Critical platform secret. Stored in platform_private.' : 'Only Super Admins can manage secret keys.'}
                        </FormDescription>
                      </FormItem>
                    )} />

                    <FormField control={systemForm.control} name="stripeWebhookSecret" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">Webhook Signing Secret</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password" 
                            placeholder={isHardcodedSuperAdmin ? "whsec_..." : "••••••••••••••••"} 
                            className="font-mono text-xs border-2" 
                            disabled={!isHardcodedSuperAdmin}
                          />
                        </FormControl>
                        <FormDescription className="text-[8px] uppercase">Used to verify payment success notifications.</FormDescription>
                      </FormItem>
                    )} />

                    <Button type="submit" disabled={isSaving || !isHardcodedSuperAdmin} className="w-full h-12 bg-[#635BFF] hover:bg-[#4b45e0] font-black uppercase tracking-widest gap-2">
                      {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Update API Config
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-dashed flex flex-col justify-center items-center p-12 text-center bg-slate-50">
               <div className="bg-white p-6 rounded-full shadow-md mb-6"><Globe className="h-12 w-12 text-slate-400" /></div>
               <h3 className="font-headline text-xl font-black uppercase text-slate-700">Platform Infrastructure</h3>
               <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                 Manage system-wide DNS, SSL, and third-party integrations. Additional platform modules will appear here as the Koop ecosystem expands.
               </p>
               <Button variant="outline" className="mt-8 uppercase text-[10px] font-black tracking-widest border-2">View Server Logs</Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSeller(null); }}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/10 shrink-0"><CardTitle className="uppercase font-headline text-xl">{editingSeller ? 'Update Venue' : 'Register Venue'}</CardTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6">
              <Form {...form}>
                <form id="venue-form" onSubmit={form.handleSubmit(onSave)} className="space-y-10 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2"><Building className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">General Info</h3></div>
                    <FormField control={form.control} name="courseName" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><FormControl><select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background">{sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FormControl></FormItem>)} />
                      <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Status</FormLabel><FormControl><select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></FormControl></FormItem>)} />
                    </div>

                    {form.watch('type') === 'Bowling Alley' && (
                      <FormField
                        control={form.control}
                        name="laneCount"
                        render={({ field }) => (
                          <FormItem className="animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="text-[10px] font-black uppercase">Number of Lanes</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-11 border-2 font-bold" />
                            </FormControl>
                            <FormDescription className="text-[8px] uppercase">Required to enable per-lane ordering at checkout.</FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2"><MapPin className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Location</h3></div>
                    <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">Street</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">ST</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="zip" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase">ZIP</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2"><Banknote className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Financial Configuration</h3></div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="serviceFee" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Patron Convenience Fee ($)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} className="h-11 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[8px] uppercase font-bold">Total convenience fee paid by the customer.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="koopFeeOffsetCents" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Koop Fee Offset (Cents)</FormLabel>
                          <FormControl><Input type="number" {...field} className="h-11 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[8px] uppercase font-bold text-indigo-600">The portion Koop contributes to processing costs.</FormDescription>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0"><Button type="submit" form="venue-form" disabled={isSaving} className="w-full h-14 bg-[#213147] hover:bg-[#213147]/90 text-white font-headline font-black uppercase tracking-widest shadow-xl">{isSaving ? <Loader2 className="animate-spin" /> : (editingSeller ? "SAVE VENUE" : "PROVISION VENUE")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
