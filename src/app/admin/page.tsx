'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, writeBatch, serverTimestamp, query, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Loader2, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  RefreshCw, 
  Target, 
  ShieldAlert, 
  ArrowRight,
  ChevronRight,
  Activity,
  TrendingUp,
  Search,
  Clock,
  Briefcase,
  Edit,
  MapPin,
  Mail,
  Zap,
  Fingerprint,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  Lock,
  UserPlus,
  KeyRound,
  Trash2,
  Users,
  Copy,
  Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  launchFee: z.coerce.number().min(0),
  monthlyPlatformFee: z.coerce.number().min(0),
  status: z.enum(['Active', 'Inactive']),
  laneCount: z.coerce.number().min(0).optional(),
  menuTypes: z.array(z.string()).min(1, 'Select at least one menu type'),
});

type SellerFormData = z.infer<typeof sellerSchema>;

const staffSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  sellerId: z.string().min(1, 'Please select a venue'),
  role: z.enum(['Seller Admin']),
});

type StaffFormData = z.infer<typeof staffSchema>;

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
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [isProvisionResultOpen, setIsProvisionResultOpen] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ email: string, key: string } | null>(null);
  
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'sellers');
  }, [firestore, isSuperAdmin]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'orders');
  }, [firestore, isSuperAdmin]);

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'prospects');
  }, [firestore, isSuperAdmin]);

  const adminsQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'adminUsers');
  }, [firestore, isSuperAdmin]);

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

  const activeOrders = useMemo(() => {
    return orders?.filter(o => ['Placed', 'Preparing', 'Out for Delivery'].includes(o.status)) || [];
  }, [orders]);

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
      launchFee: 500,
      monthlyPlatformFee: 99,
      status: 'Active',
      laneCount: 0,
      menuTypes: [],
    },
  });

  const staffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: '',
      password: '',
      sellerId: '',
      role: 'Seller Admin',
    },
  });

  const selectedType = form.watch('type');

  const availableMenuOptions = useMemo(() => {
    if (selectedType.includes('Golf')) {
      return [
        { id: 'Beverage Cart', label: 'Beverage Cart' },
        { id: 'Clubhouse', label: 'Clubhouse' },
        { id: 'Pool', label: 'Pool Side' },
        { id: 'Take Out', label: 'Take Out' }
      ];
    } else if (selectedType === 'Bowling Alley') {
      return [
        { id: 'Lane Delivery', label: 'Lane Side' },
        { id: 'Take Out', label: 'Take Out' }
      ];
    } else {
      return [
        { id: 'Dine-In', label: 'Dine-In' },
        { id: 'Take Out', label: 'Take Out' }
      ];
    }
  }, [selectedType]);

  const handleSystemReset = async () => {
    if (!firestore || !isSuperAdmin) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(firestore);
      const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
      ordersSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "Transaction Logs Purged" });
    } catch (e) {
      toast({ variant: "destructive", title: "Reset Failed" });
    } finally {
      setIsResetting(false);
    }
  };

  const handleBootstrapNetwork = async () => {
    if (!firestore || !isSuperAdmin) return;
    setIsBootstrapping(true);
    try {
      const demoSellers = [
        {
          id: 'demo-course',
          courseName: 'Public Golf Club',
          type: 'Public Golf Course',
          contactName: 'Demo Manager',
          contactEmail: 'public@koop.com',
          contactPhone: '555-0101',
          streetAddress: '123 Fairway Drive',
          city: 'Golf City',
          state: 'MI',
          zip: '48326',
          serviceFee: 2.50,
          taxRate: 6.0,
          status: 'Active',
          menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out'],
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://koop.app/sellers/demo-course/order'
        },
        {
          id: 'demo-golf-course-private',
          courseName: 'The Private Club',
          type: 'Private Golf Course',
          contactName: 'Membership Director',
          contactEmail: 'private@koop.com',
          contactPhone: '555-0102',
          streetAddress: '456 Elite Lane',
          city: 'Private Hills',
          state: 'FL',
          zip: '33101',
          serviceFee: 0,
          taxRate: 7.5,
          status: 'Active',
          menuTypes: ['Beverage Cart', 'Clubhouse', 'Pool', 'Take Out'],
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://koop.app/sellers/demo-golf-course-private/order'
        },
        {
          id: 'demo-bowling-alley',
          courseName: 'Strike & Spare Lanes',
          type: 'Bowling Alley',
          contactName: 'Laneside Supervisor',
          contactEmail: 'bowling@koop.com',
          contactPhone: '555-0103',
          streetAddress: '789 Pin Alley',
          city: 'Rolling Meadows',
          state: 'IL',
          zip: '60008',
          serviceFee: 1.50,
          taxRate: 8.0,
          status: 'Active',
          menuTypes: ['Lane Delivery', 'Take Out'],
          laneCount: 24,
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://koop.app/sellers/demo-bowling-alley/order'
        }
      ];

      for (const s of demoSellers) {
        await setDoc(doc(firestore, 'sellers', s.id), {
          ...s,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ title: "Demo Network Bootstrapped", description: "Standard demo venues have been initialized." });
    } catch (e) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleEditSeller = (seller: Seller) => {
    setEditingSeller(seller);
    form.reset({
      courseName: seller.courseName,
      type: seller.type,
      contactName: seller.contactName || '',
      contactEmail: seller.contactEmail,
      contactPhone: seller.contactPhone || '',
      streetAddress: seller.streetAddress || '',
      city: seller.city || '',
      state: seller.state || '',
      zip: seller.zip || '',
      serviceFee: seller.serviceFee,
      taxRate: seller.taxRate || 6.0,
      launchFee: seller.launchFee || 0,
      monthlyPlatformFee: seller.monthlyPlatformFee || 0,
      status: seller.status,
      laneCount: seller.laneCount || 0,
      menuTypes: seller.menuTypes || [],
    });
    setIsFormOpen(true);
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
      launchFee: 500,
      monthlyPlatformFee: 99,
      status: 'Active',
      laneCount: 0,
      menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out'],
    });
    setIsFormOpen(true);
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore || !isSuperAdmin) return;
    setIsSaving(true);
    
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    const sellerRef = doc(firestore, 'sellers', sellerId);
    
    setDoc(sellerRef, { 
      ...data, 
      id: sellerId,
      createdAt: editingSeller?.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true })
      .then(() => {
        toast({ title: editingSeller ? 'Venue Updated' : 'Venue Registered' });
        setIsFormOpen(false);
        setEditingSeller(null);
        form.reset();
      })
      .finally(() => setIsSaving(false));
  };

  const onProvisionStaff = async (data: StaffFormData) => {
    if (!firestore || !isSuperAdmin) return;
    setIsSaving(true);
    
    try {
      // 1. Create Real Auth Account via REST API
      const signupResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          returnSecureToken: true
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const authResult = await signupResp.json();
      
      if (authResult.error) {
        // If user already exists, we proceed to ensure their Firestore record is correct
        if (authResult.error.message !== 'EMAIL_EXISTS') {
          throw new Error(authResult.error.message);
        }
      }

      const uid = authResult.localId || 'existing-user';
      const selectedSeller = sellers?.find(s => s.id === data.sellerId);

      // 2. Create/Update Profile
      await setDoc(doc(firestore, 'adminUsers', uid), {
        id: uid,
        email: data.email,
        role: data.role,
        sellerId: data.sellerId,
        courseName: selectedSeller?.courseName || 'Unassigned Venue',
        createdAt: serverTimestamp()
      }, { merge: true });

      // 3. Create Security Role Marker
      await setDoc(doc(firestore, 'roles_seller_admin', uid), {
        grantedAt: serverTimestamp(),
        sellerId: data.sellerId
      }, { merge: true });

      setProvisionResult({ email: data.email, key: data.password });
      setIsStaffFormOpen(false);
      setIsProvisionResultOpen(true);
      staffForm.reset();
      
      toast({ 
        title: "Staff Member Provisioned", 
        description: `Account for ${data.email} is active.` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: e.message || "Unknown Error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    if (!auth) return;
    try {
      // Basic check: we don't await the void return, but we want to know if it throws
      await sendPasswordResetEmail(auth, email);
      toast({ 
        title: "Reset Request Queued", 
        description: `Firebase has been instructed to send a security link to ${email}. Check junk folder if not received within 5 minutes.` 
      });
    } catch (e: any) {
      console.warn("Reset error:", e);
      toast({ 
        variant: "destructive", 
        title: "Dispatch Failed", 
        description: e.message === "auth/user-not-found" ? "Account not found in identity provider." : "Platform email limits reached or domain not authorized." 
      });
    }
  };

  const handleRemoveStaff = async (id: string) => {
    if (!firestore || !isSuperAdmin) return;
    try {
      await deleteDoc(doc(firestore, 'adminUsers', id));
      await deleteDoc(doc(firestore, 'roles_seller_admin', id));
      toast({ title: "Access Revoked" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to Remove" });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verifying Super Admin Session...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] shadow-xl max-w-md w-full space-y-6">
          <div className="p-4 bg-red-100 rounded-full inline-block">
            <Lock className="h-12 w-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-black uppercase tracking-tight text-[#213147]">ACCESS RESTRICTED</h2>
            <p className="text-sm text-muted-foreground font-medium">This interface requires Super Admin authorization. Your current identity does not have permission to view this page.</p>
          </div>
          <Button asChild className="w-full h-12 bg-[#213147] hover:bg-black font-bold uppercase tracking-widest">
            <Link href="/login">Authenticate as Super Admin</Link>
          </Button>
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
            <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-black">Super Admin Only</Badge>
          </div>
          <p className="text-muted-foreground text-sm">God-mode platform oversight and venue network management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleBootstrapNetwork} disabled={isBootstrapping} className="text-[10px] font-black uppercase h-10 px-4 tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Zap className={cn("mr-2 h-3.5 w-3.5", isBootstrapping && "animate-spin")} /> Bootstrap Network
          </Button>
          <Button variant="outline" onClick={handleSystemReset} disabled={isResetting} className="border-destructive text-destructive hover:bg-destructive/5 text-[10px) font-black uppercase h-10 px-4 tracking-widest">
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isResetting && "animate-spin")} /> Reset Logs
          </Button>
          <Button onClick={handleAddNewSeller} className="h-10 px-6 font-black uppercase text-[10px] tracking-widest">
            <PlusCircle className="mr-2 h-4 w-4" /> Register Venue
          </Button>
        </div>
      </header>

      <Tabs defaultValue="operations" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 h-12">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase px-8 h-10">
            <Activity className="mr-2 h-3.5 w-3.5" /> Operations
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-[10px] font-black uppercase px-8 h-10">
            <Users className="mr-2 h-3.5 w-3.5" /> Staff Access
          </TabsTrigger>
          <TabsTrigger value="growth" className="text-[10px] font-black uppercase px-8 h-10">
            <Target className="mr-2 h-3.5 w-3.5" /> Growth
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-[10px] font-black uppercase px-8 h-10">
            <ShieldAlert className="mr-2 h-3.5 w-3.5" /> Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Active Venues" 
              value={sellers?.length || 0} 
              icon={Building} 
              description="Live establishments" 
            />
            <MetricCard 
              title="Active Volume" 
              value={activeOrders.length} 
              icon={ShoppingBag} 
              description="Orders in progress"
            />
            <MetricCard 
              title="Platform Gross" 
              value={`$${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`} 
              icon={DollarSign} 
              description="Lifetime volume"
            />
            <MetricCard 
              title="Pipeline Value" 
              value={`$${(prospects?.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0) || 0).toLocaleString()}`} 
              icon={Briefcase} 
              description="Est. launch revenue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-sm font-black uppercase">Venue Network</CardTitle>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Filter by name or ID..." 
                      className="pl-9 h-9 text-xs border-2" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-[10px] uppercase font-black">Establishment</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Seller ID</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Type</TableHead>
                        <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
                        <TableHead className="text-[10px] uppercase font-black text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isSellersLoading ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                        ))
                      ) : filteredSellers.map((seller) => (
                        <TableRow key={seller.id} className="group hover:bg-muted/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{seller.courseName}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{seller.contactEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Fingerprint className="h-3 w-3 text-muted-foreground/50" />
                              <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{seller.id}</code>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs">{seller.type}</span></TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("text-[8px] uppercase font-black", seller.status === 'Active' ? 'bg-green-600' : 'bg-slate-400')}>
                              {seller.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditSeller(seller)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-black uppercase">
                                <Link href={`/sellers/${seller.id}`}>Impersonate <ChevronRight className="ml-1 h-3 w-3" /></Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-md border-2">
              <CardHeader className="bg-primary/5 border-b py-4">
                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-4">
                    {activeOrders.length === 0 ? (
                      <div className="text-center py-20 opacity-30">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase">No active orders</p>
                      </div>
                    ) : (
                      activeOrders.map((order) => (
                        <div key={order.id} className="p-3 rounded-xl border-2 bg-white flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase truncate max-w-[140px]">{order.customerName}</span>
                            <Badge variant="outline" className="text-[7px] uppercase font-black">{order.status}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                            <span>{order.menuType}</span>
                            <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {order.createdAt ? `${Math.floor((Date.now() - order.createdAt.toDate().getTime()) / 60000)}m` : 'now'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Administrator Registry</h2>
              <p className="text-xs text-muted-foreground font-medium">Manage permissions and venue access for seller staff.</p>
            </div>
            <Button onClick={() => setIsStaffFormOpen(true)} className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-6">
              <UserPlus className="h-4 w-4" /> Provision Admin
            </Button>
          </div>

          <Card className="shadow-md border-2 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Staff Member</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Role</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Assigned Venue</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdminsLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                  ) : admins?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-medium italic">No delegated admins found.</TableCell></TableRow>
                  ) : admins?.map((admin) => (
                    <TableRow key={admin.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{admin.email}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">{admin.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.role.includes('Platform') ? 'default' : 'secondary'} className="text-[8px] font-black uppercase">
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{admin.courseName || 'Global Access'}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{admin.sellerId || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSendResetLink(admin.email)}
                            className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          >
                            <KeyRound className="mr-1.5 h-3 w-3" /> Send Reset Link
                          </Button>
                          {admin.id !== user.uid && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveStaff(admin.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed rounded-3xl text-center px-6">
            <Target className="h-16 w-16 text-indigo-600 mb-6" />
            <h2 className="font-headline text-2xl font-black uppercase mb-2">Growth CRM</h2>
            <p className="text-muted-foreground max-w-lg mb-8">Manage the sales pipeline and launch quotes in the Sales Portal.</p>
            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 font-black uppercase tracking-widest">
              <Link href="/sales">Open Sales Portal <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2">
              <CardHeader className="bg-muted/20 border-b"><CardTitle className="text-sm font-black uppercase">System Maintenance</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Button variant="outline" onClick={handleSystemReset} className="w-full h-12 border-2 border-destructive text-destructive font-black uppercase text-[10px]">
                  Purge Global Transaction Logs
                </Button>
                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold">WARNING: Permanently deletes all orders across the network.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingSeller(null);
      }}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
            <DialogTitle className="uppercase font-headline text-xl">{editingSeller ? 'Update Venue Profile' : 'Register New Venue'}</DialogTitle>
            <DialogDescription>
              {editingSeller ? `Modifying profile for ${editingSeller.courseName}.` : 'Register a new establishment on the KOOP global network.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6">
              <Form {...form}>
                <form id="venue-form" onSubmit={form.handleSubmit(onSave)} className="space-y-10 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <Building className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">General Information</h3>
                    </div>
                    <FormField control={form.control} name="courseName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">Venue Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Pine Valley Golf Club" className="h-11 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Service Category</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background">
                              {sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Platform Status</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background">
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 mb-2 border-b pb-2">
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Service Menus</h3>
                      </div>
                      <FormField
                        control={form.control}
                        name="menuTypes"
                        render={() => (
                          <FormItem className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                              {availableMenuOptions.map((item) => (
                                <FormField
                                  key={item.id}
                                  control={form.control}
                                  name="menuTypes"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item.id}
                                        className="flex flex-row items-center space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...field.value, item.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== item.id
                                                    )
                                                  )
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-[11px] font-bold uppercase cursor-pointer">
                                          {item.label}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {selectedType === 'Bowling Alley' && (
                      <FormField control={form.control} name="laneCount" render={({ field }) => (
                        <FormItem className="animate-in slide-in-from-top-2 pt-2">
                          <FormLabel className="text-[10px] font-black uppercase flex items-center gap-2">
                            <Layers className="h-3 w-3 text-primary" /> Lane Configuration
                          </FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="Number of lanes" className="h-11 border-2 font-bold" />
                          </FormControl>
                          <FormDescription className="text-[9px] uppercase font-bold text-muted-foreground">This defines the available lane selections for customers.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Location Details</h3>
                    </div>
                    <FormField control={form.control} name="streetAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase">Street Address</FormLabel>
                        <FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">State</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">ZIP Code</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Decision Maker</h3>
                    </div>
                    <FormField control={form.control} name="contactName" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase">Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="contactEmail" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contactPhone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Phone</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Financial Settings</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="serviceFee" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Conv. Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Tax Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button 
              type="submit" 
              form="venue-form"
              disabled={isSaving} 
              className="w-full h-14 bg-[#213147] hover:bg-[#213147]/90 text-white font-headline font-black uppercase tracking-widest shadow-xl"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : (editingSeller ? "SAVE VENUE CHANGES" : "PROVISION ESTABLISHMENT")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-headline">Provision Seller Admin</DialogTitle>
            <DialogDescription>Create a new administrator account and link it to a specific venue.</DialogDescription>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onProvisionStaff)} className="space-y-6 pt-4">
              <FormField control={staffForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Admin Email Address</FormLabel>
                  <FormControl><Input {...field} placeholder="admin@venue.com" className="h-11 border-2 font-bold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={staffForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Initial Security Key (Password)</FormLabel>
                  <FormControl><Input {...field} type="password" placeholder="••••••••" className="h-11 border-2 font-bold" /></FormControl>
                  <FormDescription className="text-[9px] uppercase font-bold text-muted-foreground">Required to create the identity. They can change this later.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={staffForm.control} name="sellerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Assigned Venue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 border-2 font-bold">
                        <SelectValue placeholder="Select a venue..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sellers?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.courseName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-800 font-medium leading-relaxed">
                  Provisioning will create a real identity in the platform database. Once created, use the **Send Reset Link** tool to verify their inbox.
                </p>
              </div>
              <DialogFooter className="px-0">
                <Button type="submit" disabled={isSaving} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest">
                  {isSaving ? <Loader2 className="animate-spin" /> : "Create Staff Account"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProvisionResultOpen} onOpenChange={setIsProvisionResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-headline text-green-600 flex items-center gap-2">
              <Check className="h-5 w-5" /> Account Provisioned
            </DialogTitle>
            <DialogDescription>The administrator account has been successfully created in the identity provider.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground">User Email</p>
                <p className="font-bold">{provisionResult?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Initial Security Key</p>
                <code className="bg-background px-2 py-1 rounded border font-mono font-bold text-sm block w-full text-center tracking-widest">
                  {provisionResult?.key}
                </code>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
              <div className="flex items-center gap-2 text-blue-700">
                <Mail className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-wider">Email Fallback</p>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                If the automated reset link fails to arrive, please provide these credentials to the user manually. They can sign in at **koop.app/login**.
              </p>
            </div>
            <Button 
              className="w-full h-12 gap-2 font-bold uppercase tracking-widest"
              onClick={() => {
                navigator.clipboard.writeText(`KOOP Staff Access\nEmail: ${provisionResult?.email}\nTemporary Key: ${provisionResult?.key}\nLogin: ${window.location.origin}/login`);
                toast({ title: "Copied to clipboard" });
              }}
            >
              <Copy className="h-4 w-4" /> Copy Access Memo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
