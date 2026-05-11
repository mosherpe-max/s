
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc, useFirebaseApp } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Loader2, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  Activity,
  Search,
  Edit,
  ShieldCheck,
  Lock,
  Users,
  LogOut,
  ChevronDown,
  Settings,
  Zap,
  Globe,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  FlaskConical,
  ShieldAlert,
  CreditCard,
  History,
  Terminal,
  RefreshCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import type { Seller, Order } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name required'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant']),
  contactEmail: z.string().email('Invalid email'),
  status: z.enum(['Active', 'Inactive']),
  serviceFee: z.coerce.number().min(0),
  laneCount: z.coerce.number().min(0).optional(),
});

type SellerFormData = z.infer<typeof sellerSchema>;

export default function KOOPAdminPage() {
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Diagnostic State
  const [testAccountId, setTestAccountId] = useState('');
  const [attemptCharge, setAttemptCharge] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Platform Credential State
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const isAuthorized = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

  const publicConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'config', 'platform') : null), [firestore]);
  const privateConfigRef = useMemoFirebase(() => (firestore && isAuthorized ? doc(firestore, 'config', 'platform_private') : null), [firestore, isAuthorized]);

  const { data: publicConfig } = useDoc(publicConfigRef);
  const { data: privateConfig } = useDoc(privateConfigRef);

  useEffect(() => {
    if (publicConfig) setPublishableKey(publicConfig.stripePublishableKey || '');
    if (privateConfig) setSecretKey(privateConfig.stripeSecretKey || '');
  }, [publicConfig, privateConfig]);

  const handleUpdateCredentials = async () => {
    if (!firestore || !isAuthorized) return;
    setIsUpdatingCreds(true);
    try {
      await setDoc(doc(firestore, 'config', 'platform'), { 
        stripePublishableKey: publishableKey.trim(), 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
      await setDoc(doc(firestore, 'config', 'platform_private'), { 
        stripeSecretKey: secretKey.trim(), 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      
      toast({ title: "Credentials Updated in Vault" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const runConnectionTest = async () => {
    if (!testAccountId || !firebaseApp) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      // Explicitly target the us-central1 region
      const functions = getFunctions(firebaseApp, 'us-central1');
      const testFn = httpsCallable(functions, 'testStripeConnection');
      
      const result = await testFn({ 
        connectedAccountId: testAccountId.trim(),
        attemptTestCharge: attemptCharge 
      });
      
      const data = result.data as any;
      if (data.success === false) {
        setTestResult({ error: data.error, isTestMode: data.isTestMode });
        toast({ variant: "destructive", title: "Test Failed", description: "Handshake refused by Stripe." });
      } else {
        setTestResult(data);
        toast({ title: "Diagnostics Complete" });
      }
    } catch (e: any) {
      console.error('Diagnostic Test Failed:', e);
      let errorMessage = e.message || 'Network Timeout';
      
      // Check for specific Firebase SDK error codes
      if (e.code === 'not-found') {
        errorMessage = 'Function Not Found: Ensure the "testStripeConnection" function is deployed in us-central1.';
      } else if (e.code === 'internal') {
        errorMessage = 'Server Crash: The backend module crashed. This usually indicates an invalid API key in the vault or a missing dependency.';
      } else if (e.code === 'unauthenticated') {
        errorMessage = 'Session Expired: Please log out and log back in to refresh your admin session.';
      }

      setTestResult({ error: errorMessage });
      toast({ variant: "destructive", title: "Endpoint Unreachable" });
    } finally {
      setIsTesting(false);
    }
  };

  const sellersQuery = useMemoFirebase(() => (firestore && isAuthorized ? collection(firestore, 'sellers') : null), [firestore, isAuthorized]);
  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);

  const filteredSellers = useMemo(() => {
    if (!sellers) return [];
    if (!searchTerm) return sellers;
    const term = searchTerm.toLowerCase();
    return sellers.filter(s => s.courseName.toLowerCase().includes(term) || s.id.toLowerCase().includes(term));
  }, [sellers, searchTerm]);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: { courseName: '', type: 'Public Golf Course', contactEmail: '', status: 'Active', serviceFee: 2.50, laneCount: 0 },
  });

  const onSave = async (data: SellerFormData) => {
    if (!firestore || !isAuthorized) return;
    setIsSaving(true);
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(firestore, 'sellers', sellerId), { ...data, id: sellerId, updatedAt: serverTimestamp() }, { merge: true });
    toast({ title: editingSeller ? 'Venue Updated' : 'Venue Registered' });
    setIsFormOpen(false); setEditingSeller(null); form.reset(); setIsSaving(false);
  };

  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-6">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-black uppercase tracking-widest">Access Restricted</h2>
          <Button asChild className="w-full"><Link href="/login">Authenticate</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-[#213147] uppercase tracking-tight">KOOP ADMIN</h1>
          <p className="text-muted-foreground text-sm">Platform oversight and system configuration.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => signOut(auth!)} className="text-[10px] font-black uppercase"><LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out</Button>
          <Button onClick={() => setIsFormOpen(true)} className="text-[10px] font-black uppercase"><PlusCircle className="mr-2 h-4 w-4" /> Register Venue</Button>
        </div>
      </header>

      <Tabs defaultValue="operations" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 h-12">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase px-8 h-10"><Activity className="mr-2 h-3.5 w-3.5" /> Operations</TabsTrigger>
          <TabsTrigger value="system" className="text-[10px] font-black uppercase px-8 h-10"><Settings className="mr-2 h-3.5 w-3.5" /> System & Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-8">
          <Card className="shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-black uppercase">Venue Network</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Filter..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
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
                  <TableRow key={seller.id}>
                    <TableCell><div className="flex flex-col"><span className="font-bold text-sm">{seller.courseName}</span><span className="text-[9px] text-muted-foreground uppercase">{seller.contactEmail}</span></div></TableCell>
                    <TableCell><span className="text-xs">{seller.type}</span></TableCell>
                    <TableCell className="text-center"><Badge className="text-[8px] uppercase">{seller.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingSeller(seller); form.reset(seller); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PLATFORM CREDENTIALS */}
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-indigo-50 border-b">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-indigo-700">
                  <ShieldCheck className="h-4 w-4" /> Platform Credentials
                </CardTitle>
                <CardDescription className="text-indigo-600/60 font-bold uppercase text-[9px]">Secure Stripe Vault</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Stripe Publishable Key (Public)</Label>
                  <Input value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} placeholder="pk_test_..." className="font-mono text-xs border-2" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Stripe Secret Key (Private)</Label>
                  <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="sk_test_..." className="font-mono text-xs border-2" />
                </div>
                <Button onClick={handleUpdateCredentials} disabled={isUpdatingCreds} className="w-full bg-[#213147] hover:bg-black font-black uppercase tracking-widest">
                  {isUpdatingCreds ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} Update Vault
                </Button>
              </CardContent>
            </Card>

            {/* CONNECTION DIAGNOSTICS */}
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-amber-50 border-b">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-amber-700">
                  <Zap className="h-4 w-4" /> Connectivity Diagnostics
                </CardTitle>
                <CardDescription className="text-amber-600/60 font-bold uppercase text-[9px]">Validate Connected Accounts</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Connected Account ID</Label>
                    <Input value={testAccountId} onChange={(e) => setTestAccountId(e.target.value)} placeholder="acct_..." className="font-mono text-xs border-2" />
                  </div>
                  
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-tight">Attempt $1.00 Test Intent</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold">Creates a non-captured PaymentIntent</p>
                    </div>
                    <Switch checked={attemptCharge} onCheckedChange={setAttemptCharge} />
                  </div>

                  <Button onClick={runConnectionTest} disabled={isTesting || !testAccountId} className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase tracking-widest text-[10px] h-11">
                    {isTesting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Terminal className="h-4 w-4 mr-2" />} Run Connectivity Test
                  </Button>
                </div>

                {testResult && (
                  <div className={cn("p-4 rounded-xl border-2 space-y-4 animate-in fade-in zoom-in-95", testResult.error ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {testResult.error ? <AlertCircle className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{testResult.error ? "Test Refused" : "Handshake Verified"}</span>
                      </div>
                      {testResult.isTestMode !== undefined && (
                        <Badge variant={testResult.isTestMode ? "secondary" : "destructive"} className="text-[8px] uppercase">
                          {testResult.isTestMode ? "Sandbox" : "LIVE MODE"}
                        </Badge>
                      )}
                    </div>

                    {!testResult.error && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/40 p-2 rounded border border-green-200">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Charges</p>
                          <p className="text-xs font-bold">{testResult.account?.charges_enabled ? 'ENABLED' : 'DISABLED'}</p>
                        </div>
                        <div className="bg-white/40 p-2 rounded border border-green-200">
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Payouts</p>
                          <p className="text-xs font-bold">{testResult.account?.payouts_enabled ? 'ENABLED' : 'DISABLED'}</p>
                        </div>
                        {testResult.charge && (
                          <div className={cn("col-span-2 p-2 rounded border flex items-center justify-between", testResult.charge.success === false ? "bg-red-100 border-red-200" : "bg-primary/10 border-primary/20")}>
                             <div className="flex items-center gap-2">
                               <CreditCard className="h-3 w-3" />
                               <span className="text-[9px] font-black uppercase">Test Intent</span>
                             </div>
                             <span className="text-[9px] font-mono font-bold truncate max-w-[120px]">{testResult.charge.id || testResult.charge.error}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {testResult.error && (
                      <div className="bg-white/50 p-2 rounded border border-red-200 space-y-2">
                        <p className="text-[10px] text-red-700 font-mono font-bold leading-relaxed">{testResult.error}</p>
                        <div className="pt-2 border-t border-red-100">
                           <p className="text-[8px] font-black uppercase text-red-600">Possible Resolution:</p>
                           <ul className="text-[8px] text-red-800 list-disc pl-3 space-y-0.5 mt-1 font-bold">
                             <li>Verify deployment status in your Firebase Console</li>
                             <li>Ensure the Secret Key starts with 'sk_test_' in Sandbox mode</li>
                             <li>Confirm the Connected Account ID exists and belongs to this platform</li>
                           </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSeller(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="uppercase font-headline text-xl">{editingSeller ? 'Update Venue' : 'Register Venue'}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
              <FormField control={form.control} name="courseName" render={({ field }) => (<FormItem><FormLabel>Venue Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><select {...field} className="w-full h-10 border rounded-md px-3 text-sm">{sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FormItem>)} />
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><select {...field} className="w-full h-10 border rounded-md px-3 text-sm"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></FormItem>)} />
              </div>
              <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Venue"}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
