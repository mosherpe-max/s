'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, writeBatch, serverTimestamp, query, deleteDoc, getDoc } from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
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
  Check,
  AlertTriangle,
  ExternalLink,
  LogOut,
  CreditCard,
  Phone,
  User as UserIcon,
  Percent,
  ListChecks,
  CheckCircle2,
  Trophy,
  PieChart
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
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
  authorizeNetLoginId: z.string().optional(),
  authorizeNetTransactionKey: z.string().optional(),
});

type SellerFormData = z.infer<typeof sellerSchema>;

const staffSchema = z.object({
  email: z.string().email('Valid email required').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  sellerId: z.string().optional(),
  role: z.enum(['Seller Admin', 'Sales Rep']),
}).refine((data) => {
  if (data.role === 'Seller Admin' && !data.sellerId) return false;
  return true;
}, {
  message: "Venue selection required for Seller Admins",
  path: ["sellerId"]
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
  const [provisionResult, setProvisionResult] = useState<{ email: string, key: string, status: 'created' | 'existing' } | null>(null);
  
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Deletion States
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isStaffDeleteDialogOpen, setIsStaffDeleteDialogOpen] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<Seller | null>(null);
  const [isVenueDeleteDialogOpen, setIsVenueDeleteDialogOpen] = useState(false);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;

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

  // SALES CRM ANALYTICS
  const globalPipelineStats = useMemo(() => {
    if (!prospects) return null;
    
    const byStage = prospects.reduce((acc, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRep = prospects.reduce((acc, p) => {
      const rep = p.assignedRepName || 'Unassigned';
      if (!acc[rep]) acc[rep] = { count: 0, value: 0 };
      acc[rep].count += 1;
      acc[rep].value += (p.launchFeeQuoted || 0);
      return acc;
    }, {} as Record<string, { count: number, value: number }>);

    return { byStage, byRep };
  }, [prospects]);

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
      authorizeNetLoginId: '',
      authorizeNetTransactionKey: '',
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

  const selectedStaffRole = staffForm.watch('role');

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
        }
      ];

      for (const s of demoSellers) {
        await setDoc(doc(firestore, 'sellers', s.id), {
          ...s,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }

      toast({ title: "Demo Network Bootstrapped" });
    } catch (e) {
      toast({ variant: "destructive", title: "Bootstrap Failed" });
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleEditSeller = async (seller: Seller) => {
    setEditingSeller(seller);
    
    // Fetch private vault data
    let privateData = { authorizeNetLoginId: '', authorizeNetTransactionKey: '' };
    if (firestore) {
      const vaultDoc = await getDoc(doc(firestore, 'sellers_private', seller.id));
      if (vaultDoc.exists()) {
        privateData = vaultDoc.data() as any;
      }
    }

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
      authorizeNetLoginId: privateData.authorizeNetLoginId || '',
      authorizeNetTransactionKey: privateData.authorizeNetTransactionKey || '',
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
      authorizeNetLoginId: '',
      authorizeNetTransactionKey: '',
    });
    setIsFormOpen(true);
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore || !isSuperAdmin) return;
    setIsSaving(true);
    
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    
    // Split the data: Public vs Private Vault
    const { authorizeNetLoginId, authorizeNetTransactionKey, ...publicData } = data;
    
    const batch = writeBatch(firestore);
    
    // 1. Save Public Profile
    batch.set(doc(firestore, 'sellers', sellerId), { 
      ...publicData, 
      id: sellerId,
      createdAt: editingSeller?.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      qrCodeUrl: editingSeller?.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.origin}/sellers/${sellerId}/order`
    }, { merge: true });

    // 2. Save Private Vault (Secrets)
    batch.set(doc(firestore, 'sellers_private', sellerId), {
      id: sellerId,
      authorizeNetLoginId: authorizeNetLoginId || '',
      authorizeNetTransactionKey: authorizeNetTransactionKey || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    batch.commit()
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
      
      if (!signupResp.ok && authResult.error?.message !== 'EMAIL_EXISTS') {
        throw new Error(authResult.error?.message || "Failed to contact Identity Provider");
      }

      let accountStatus: 'created' | 'existing' = signupResp.ok ? 'created' : 'existing';
      const uid = authResult.localId || 'existing-user-lookup-required';
      const selectedSeller = sellers?.find(s => s.id === data.sellerId);

      // 1. Core Profile
      await setDoc(doc(firestore, 'adminUsers', data.email), {
        id: uid,
        email: data.email,
        role: data.role,
        sellerId: data.role === 'Seller Admin' ? data.sellerId : null,
        courseName: data.role === 'Seller Admin' ? (selectedSeller?.courseName || 'Unassigned Venue') : 'Platform Global',
        createdAt: serverTimestamp()
      }, { merge: true });

      // 2. Role Marker for Rules
      const roleCollection = data.role === 'Seller Admin' ? 'roles_seller_admin' : 'roles_sales_rep';
      await setDoc(doc(firestore, roleCollection, data.email), {
        grantedAt: serverTimestamp(),
        sellerId: data.role === 'Seller Admin' ? data.sellerId : null
      }, { merge: true });

      setProvisionResult({ email: data.email, key: data.password, status: accountStatus });
      setIsStaffFormOpen(false);
      setIsProvisionResultOpen(true);
      staffForm.reset();
      
      toast({ title: "Account Provisioned" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Reset Link Dispatched", description: `Success for ${email}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Dispatch Failed", description: e.message });
    }
  };

  const handleRemoveStaff = async () => {
    if (!firestore || !isSuperAdmin || !adminToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'adminUsers', adminToDelete.email));
      const roleCollection = adminToDelete.role === 'Seller Admin' ? 'roles_seller_admin' : 'roles_sales_rep';
      await deleteDoc(doc(firestore, roleCollection, adminToDelete.email));
      toast({ title: "Access Revoked" });
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to Remove" });
    } finally {
      setIsStaffDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  };

  const handleRemoveVenue = async () => {
    if (!firestore || !isSuperAdmin || !venueToDelete) return;
    try {
      await deleteDoc(doc(firestore, 'sellers', venueToDelete.id));
      await deleteDoc(doc(firestore, 'sellers_private', venueToDelete.id));
      toast({ title: "Venue Decommissioned" });
    } catch (e) {
      toast({ variant: "destructive", title: "Deletion Failed" });
    } finally {
      setIsVenueDeleteDialogOpen(false);
      setVenueToDelete(null);
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
            <p className="text-sm text-muted-foreground font-medium">This interface requires Super Admin authorization.</p>
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
          <p className="text-muted-foreground text-sm">Platform oversight and venue network management.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={handleLogout} className="text-[10px] font-black uppercase h-10 px-4 tracking-widest text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
          </Button>
          <Button variant="outline" asChild className="text-[10px] font-black uppercase h-10 px-4 tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Link href="/sales">
              <Target className="mr-2 h-3.5 w-3.5" /> My Sales Pipeline
            </Link>
          </Button>
          <Button variant="outline" onClick={handleBootstrapNetwork} disabled={isBootstrapping} className="text-[10px] font-black uppercase h-10 px-4 tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Zap className={cn("mr-2 h-3.5 w-3.5", isBootstrapping && "animate-spin")} /> Bootstrap Network
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
            <Users className="mr-2 h-3.5 w-3.5" /> User Registry
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
            <MetricCard title="Active Venues" value={sellers?.length || 0} icon={Building} />
            <MetricCard title="Active Volume" value={activeOrders.length} icon={ShoppingBag} />
            <MetricCard title="Platform Gross" value={`$${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}`} icon={DollarSign} />
            <MetricCard title="Pipeline Value" value={`$${(prospects?.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0) || 0).toLocaleString()}`} icon={Briefcase} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-md overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-sm font-black uppercase">Venue Network</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Filter..." className="pl-9 h-9 text-xs border-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                        [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                      ) : filteredSellers.map((seller) => (
                        <TableRow key={seller.id} className="group hover:bg-muted/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{seller.courseName}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{seller.contactEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell><code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{seller.id}</code></TableCell>
                          <TableCell><span className="text-xs">{seller.type}</span></TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("text-[8px] uppercase font-black", seller.status === 'Active' ? 'bg-green-600' : 'bg-slate-400')}>{seller.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditSeller(seller)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setVenueToDelete(seller); setIsVenueDeleteDialogOpen(true); }} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-black uppercase"><Link href={`/sellers/${seller.id}`}>Manage</Link></Button>
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
                      <div className="text-center py-20 opacity-30"><ShoppingBag className="h-8 w-8 mx-auto mb-2" /><p className="text-[10px] font-black uppercase">No active orders</p></div>
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
              <h2 className="font-headline text-xl font-black uppercase text-[#213147]">User Registry</h2>
              <p className="text-xs text-muted-foreground">Manage permissions and venue access for all platform members.</p>
            </div>
            <Button onClick={() => setIsStaffFormOpen(true)} className="gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-6">
              <UserPlus className="h-4 w-4" /> Add Platform User
            </Button>
          </div>

          <Card className="shadow-md border-2 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">User Profile</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Platform Role</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Assignment Context</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdminsLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                  ) : admins?.map((admin) => (
                    <TableRow key={admin.email} className="hover:bg-muted/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", admin.role === 'Sales Rep' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600')}>
                            {admin.role === 'Sales Rep' ? <Target className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          </div>
                          <div className="flex flex-col"><span className="font-bold text-sm">{admin.email}</span><span className="text-[9px] text-muted-foreground font-mono">{admin.id}</span></div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={admin.role.includes('Platform') ? 'default' : 'secondary'} className="text-[8px] font-black uppercase">{admin.role}</Badge></TableCell>
                      <TableCell><div className="flex flex-col"><span className="text-xs font-bold">{admin.courseName || 'Global Access'}</span><span className="text-[9px] text-muted-foreground font-mono">{admin.sellerId || 'N/A'}</span></div></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleSendResetLink(admin.email)} className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50"><KeyRound className="mr-1.5 h-3 w-3" /> Send Reset Link</Button>
                          {admin.id !== user.uid && <Button variant="ghost" size="icon" onClick={() => { setAdminToDelete(admin); setIsStaffDeleteDialogOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-md border-2 overflow-hidden">
              <CardHeader className="bg-indigo-50 border-b">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-indigo-700">
                  <PieChart className="h-4 w-4" /> Pipeline Health
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Deal distribution across all reps.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {globalPipelineStats ? Object.entries(globalPipelineStats.byStage).map(([stage, count]) => (
                    <div key={stage} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span>{stage}</span>
                        <span className="text-indigo-600">{count} Deals</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(count / (prospects?.length || 1)) * 100}%` }} 
                        />
                      </div>
                    </div>
                  )) : <p className="text-xs text-muted-foreground italic">No pipeline data available.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-2 overflow-hidden">
              <CardHeader className="bg-green-50 border-b">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-green-700">
                  <Trophy className="h-4 w-4" /> Rep Performance
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold">Active deals and pipeline value by user.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="text-[9px] uppercase font-black">Sales Professional</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-center">Deals</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-right">Est. Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalPipelineStats && Object.entries(globalPipelineStats.byRep).map(([repName, stats]) => (
                      <TableRow key={repName} className="hover:bg-muted/5">
                        <TableCell className="text-xs font-bold">{repName}</TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className="text-[10px] font-black">{stats.count}</Badge></TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-green-600">${stats.value.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-center justify-center py-12 bg-white border-2 border-dashed rounded-3xl text-center px-6">
            <Target className="h-12 w-12 text-indigo-600 mb-4" />
            <h2 className="font-headline text-xl font-black uppercase mb-2">Detailed CRM Access</h2>
            <p className="text-muted-foreground max-w-lg mb-8 text-sm">Open the full Sales Portal to manage specific prospects, log interactions, and generate proposals.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild variant="outline" className="h-12 px-8 font-black uppercase tracking-widest text-xs border-indigo-200 text-indigo-600">
                <Link href="/sales/dashboard">Open Sales Hub</Link>
              </Button>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-black uppercase tracking-widest text-xs">
                <Link href="/sales">Launch CRM Portal <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="border-2 max-w-md mx-auto">
            <CardHeader className="bg-muted/20 border-b"><CardTitle className="text-sm font-black uppercase text-center">System Maintenance</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Button variant="outline" onClick={handleSystemReset} className="w-full h-12 border-2 border-destructive text-destructive font-black uppercase text-[10px]">
                Purge Global Transaction Logs
              </Button>
              <p className="text-[9px] text-center text-muted-foreground uppercase font-bold">WARNING: This is irreversible.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSeller(null); }}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
            <DialogTitle className="uppercase font-headline text-xl">{editingSeller ? 'Update Venue' : 'Register Venue'}</DialogTitle>
            <DialogDescription>Establishment configuration and payment vault settings.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-6">
              <Form {...form}>
                <form id="venue-form" onSubmit={form.handleSubmit(onSave)} className="space-y-10 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <Building className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">General Info</h3>
                    </div>
                    <FormField control={form.control} name="courseName" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} placeholder="e.g. Whispering Pines GC" className="h-11 border-2 font-bold" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Category</FormLabel><FormControl><select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background">{sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Status</FormLabel><FormControl><select {...field} className="w-full h-11 border-2 rounded-md px-3 text-sm font-bold bg-background"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <UserIcon className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contact Intelligence</h3>
                    </div>
                    <FormField control={form.control} name="contactName" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase">Decision Maker</FormLabel><FormControl><Input {...field} placeholder="John Doe" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="contactEmail" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Official Email</FormLabel><FormControl><Input {...field} type="email" placeholder="manager@venue.com" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="contactPhone" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Primary Phone</FormLabel><FormControl><Input {...field} placeholder="555-0123" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Financial Configuration</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <FormField control={form.control} name="serviceFee" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Convenience Fee</FormLabel><FormControl><Input {...field} type="number" step="0.01" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Tax Rate %</FormLabel><FormControl><Input {...field} type="number" step="0.1" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="launchFee" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Launch Fee</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="monthlyPlatformFee" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Monthly Fee</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Operational Profile</h3>
                    </div>
                    
                    {selectedType === 'Bowling Alley' && (
                      <FormField control={form.control} name="laneCount" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">Number of Lanes</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    )}

                    <FormField control={form.control} name="menuTypes" render={() => (
                      <FormItem>
                        <div className="mb-2"><FormLabel className="text-[10px] font-black uppercase">Active Service Menus</FormLabel></div>
                        <div className="grid grid-cols-2 gap-3">
                          {availableMenuOptions.map((item) => (
                            <FormField key={item.id} control={form.control} name="menuTypes" render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 bg-muted/20 border-2 rounded-xl">
                                <FormControl>
                                  <Checkbox 
                                    checked={field.value?.includes(item.id)} 
                                    onCheckedChange={(checked) => {
                                      return checked 
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(field.value?.filter((value) => value !== item.id));
                                    }} 
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-bold uppercase cursor-pointer">{item.label}</FormLabel>
                              </FormItem>
                            )} />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Payment Private Vault</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="authorizeNetLoginId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">API Login ID</FormLabel>
                          <FormControl><Input {...field} placeholder="Vaulted ID" className="h-11 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[9px] uppercase font-bold">Stored in restricted collection.</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="authorizeNetTransactionKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">Transaction Key</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="Vaulted Key" className="h-11 border-2 font-bold" /></FormControl>
                          <FormDescription className="text-[9px] uppercase font-bold">Accessed only by secure Cloud Functions.</FormDescription>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Location</h3>
                    </div>
                    <FormField control={form.control} name="streetAddress" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-black uppercase">Street</FormLabel><FormControl><Input {...field} placeholder="123 Main St" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">City</FormLabel><FormControl><Input {...field} placeholder="Detroit" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">ST</FormLabel><FormControl><Input {...field} placeholder="MI" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase">ZIP</FormLabel><FormControl><Input {...field} placeholder="48201" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button type="submit" form="venue-form" disabled={isSaving} className="w-full h-14 bg-[#213147] hover:bg-[#213147]/90 text-white font-headline font-black uppercase tracking-widest shadow-xl">
              {isSaving ? <Loader2 className="animate-spin" /> : (editingSeller ? "SAVE VENUE & SECRETS" : "PROVISION VENUE")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStaffFormOpen} onOpenChange={setIsStaffFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="uppercase font-headline">Add Platform User</DialogTitle></DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onProvisionStaff)} className="space-y-6 pt-4">
              <FormField control={staffForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Account Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="Select role..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Seller Admin">Seller Admin (Venue Staff)</SelectItem>
                      <SelectItem value="Sales Rep">Sales Rep (Platform Growth)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              
              <FormField control={staffForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">User Email</FormLabel><FormControl><Input {...field} placeholder="user@company.com" className="h-11 border-2 font-bold" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={staffForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel className="text-[10px] font-black uppercase">Initial Password</FormLabel><FormControl><Input {...field} type="password" placeholder="••••••••" className="h-11 border-2 font-bold" /></FormControl><FormMessage /></FormItem>
              )} />
              
              {selectedStaffRole === 'Seller Admin' && (
                <FormField control={staffForm.control} name="sellerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Assigned Venue</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="Select venue..." /></SelectTrigger></FormControl>
                      <SelectContent>{sellers?.map(s => (<SelectItem key={s.id} value={s.id}>{s.courseName}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <Button type="submit" disabled={isSaving} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest">
                {isSaving ? <Loader2 className="animate-spin" /> : "Authorize User"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProvisionResultOpen} onOpenChange={setIsProvisionResultOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="uppercase font-headline">Identity Synchronized</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-xl border-2 border-dashed space-y-3">
              <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">User Email</p><p className="font-bold">{provisionResult?.email}</p></div>
              <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">Initial Key</p><code className="bg-background px-2 py-1 rounded border font-mono font-bold text-sm block w-full text-center tracking-widest">{provisionResult?.key}</code></div>
            </div>
            <Button className="w-full h-12 gap-2 font-bold uppercase tracking-widest" onClick={() => { navigator.clipboard.writeText(`Email: ${provisionResult?.email}\nKey: ${provisionResult?.key}\nLogin: ${window.location.origin}/login`); toast({ title: "Copied" }); }}><Copy className="h-4 w-4" /> Copy Access Memo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isStaffDeleteDialogOpen} onOpenChange={setIsStaffDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="uppercase font-headline text-destructive">Revoke Access?</AlertDialogTitle><AlertDialogDescription>This removes administrative records for <strong>{adminToDelete?.email}</strong>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRemoveStaff} className="bg-destructive hover:bg-destructive/90">Confirm Removal</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isVenueDeleteDialogOpen} onOpenChange={setIsVenueDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="uppercase font-headline text-destructive">Decommission Venue?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove <strong>{venueToDelete?.courseName}</strong>? This includes vault keys.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleRemoveVenue} className="bg-destructive hover:bg-destructive/90">Confirm Deletion</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
