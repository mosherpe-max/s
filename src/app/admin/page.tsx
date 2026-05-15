'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc, useFirebaseApp } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Loader2, 
  Search,
  Edit,
  Lock,
  LogOut,
  Activity,
  ShieldCheck,
  KeyRound,
  Save,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Heart,
  Database,
  ExternalLink
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
import type { Seller } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  const firestore = useFirestore();
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Credentials State
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [stripeSecret, setStripeSecret] = useState('');
  const [stripeClientId, setStripeClientId] = useState('');

  // Diagnostic State
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; code?: string; type: 'heartbeat' | 'firestore' } | null>(null);

  const isAuthorized = user?.uid === SUPER_ADMIN_ID || 
                     user?.email === 'mosherpe@gmail.com' || 
                     user?.email === 'thirstygolfer.pmosher@gmail.com' ||
                     user?.email === 'thirstygolfer.pmoaher@gmail.com';

  const sellersQuery = useMemoFirebase(() => (firestore && isAuthorized ? collection(firestore, 'sellers') : null), [firestore, isAuthorized]);
  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);

  const credsRef = useMemoFirebase(() => (firestore && isAuthorized ? doc(firestore, 'config', 'platform_private') : null), [firestore, isAuthorized]);
  const { data: existingCreds } = useDoc(credsRef);

  useEffect(() => {
    if (existingCreds) {
      setStripeSecret(existingCreds.stripeSecretKey || '');
      setStripeClientId(existingCreds.stripeClientId || '');
    }
  }, [existingCreds]);

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
    try {
      const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(firestore, 'sellers', sellerId), { ...data, id: sellerId, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: editingSeller ? 'Venue Updated' : 'Venue Registered' });
      setIsFormOpen(false); setEditingSeller(null); form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCredentials = async () => {
    if (!firestore || !isAuthorized) return;
    setIsUpdatingCreds(true);
    try {
      await setDoc(doc(firestore, 'config', 'platform_private'), {
        stripeSecretKey: stripeSecret,
        stripeClientId: stripeClientId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Vault Updated", description: "Stripe Connect credentials have been secured." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update Failed", description: e.message });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const runHeartbeat = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const heartbeat = httpsCallable(functions, 'systemHeartbeat');
      const result = await heartbeat();
      const data = result.data as any;
      
      setPingResult({ 
        success: true, 
        type: 'heartbeat',
        message: `Runtime Operational: ${data.message}` 
      });
    } catch (e: any) {
      setPingResult({ 
        success: false, 
        type: 'heartbeat',
        code: e.code,
        message: e.message || 'The Cloud Function runtime could not be reached.' 
      });
    } finally {
      setIsPinging(false);
    }
  };

  const runFirestorePing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const ping = httpsCallable(functions, 'pingPlatform');
      const result = await ping();
      
      setPingResult({ 
        success: true, 
        type: 'firestore',
        message: 'Backend is online and successfully reached Firestore.' 
      });
    } catch (e: any) {
      setPingResult({ 
        success: false, 
        type: 'firestore',
        code: e.code,
        message: e.message || 'Firestore diagnostic failed.' 
      });
    } finally {
      setIsPinging(false);
    }
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
          <TabsTrigger value="stripe" className="text-[10px] font-black uppercase px-8 h-10"><Globe className="mr-2 h-3.5 w-3.5" /> System & Stripe</TabsTrigger>
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
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild title="View Venue Dashboard">
                          <Link href={`/sellers/${seller.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingSeller(seller); form.reset(seller); setIsFormOpen(true); }} title="Edit Record">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-indigo-50 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg text-white"><ShieldCheck className="h-5 w-5" /></div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase text-indigo-900">Credential Vault</CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase text-indigo-700/60">Encrypted Platform Secrets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <KeyRound className="h-3 w-3" /> Stripe Secret Key (sk_test_...)
                    </Label>
                    <Input 
                      type="password" 
                      placeholder="sk_test_••••••••••••••••••••••••" 
                      className="font-mono text-xs border-2"
                      value={stripeSecret}
                      onChange={(e) => setStripeSecret(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Globe className="h-3 w-3" /> Stripe Client ID (ca_...)
                    </Label>
                    <Input 
                      placeholder="ca_••••••••••••••••••••••••" 
                      className="font-mono text-xs border-2"
                      value={stripeClientId}
                      onChange={(e) => setStripeClientId(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleUpdateCredentials} disabled={isUpdatingCreds} className="w-full bg-[#213147] hover:bg-black font-black uppercase tracking-widest">
                  {isUpdatingCreds ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} Update Vault
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="shadow-lg border-2 bg-amber-50/30 border-amber-100">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase text-amber-900">System Diagnostics</CardTitle>
                    <Zap className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                    If you encounter an "Internal Error", use these tools to isolate if the issue is in the function runtime or the database connection.
                  </p>
                  
                  {pingResult && (
                    <div className={cn(
                      "p-3 rounded-lg border-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1",
                      pingResult.success ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-800"
                    )}>
                      <div className="flex items-center gap-3">
                        {pingResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight leading-tight">
                            {pingResult.type === 'heartbeat' ? 'Runtime Status' : 'Database Status'}
                          </span>
                          <span className="text-[9px] font-bold opacity-80">{pingResult.message}</span>
                        </div>
                      </div>
                      {pingResult.code && (
                        <div className="bg-black/5 p-2 rounded font-mono text-[9px] flex items-center gap-2">
                          <Terminal className="h-3 w-3" /> 
                          <span className="font-bold uppercase">Code: {pingResult.code}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={runHeartbeat} 
                      disabled={isPinging}
                      className="border-amber-200 text-amber-900 hover:bg-amber-100 font-black uppercase text-[9px] tracking-widest h-10"
                    >
                      <Heart className="h-3 w-3 mr-1.5" /> {isPinging ? "Testing..." : "Test Runtime"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={runFirestorePing} 
                      disabled={isPinging}
                      className="border-amber-200 text-amber-900 hover:bg-amber-100 font-black uppercase text-[9px] tracking-widest h-10"
                    >
                      <Database className="h-3 w-3 mr-1.5" /> {isPinging ? "Testing..." : "Test Firestore"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase">Onboarding Config</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-4 text-muted-foreground leading-relaxed">
                  <p>Requirements for Stripe Connect Standard:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Add <code>https://your-domain.com/onboarding-success</code> to <strong>Redirect URIs</strong> in Stripe.</li>
                    <li>Ensure you have configured a <strong>Branding Logo</strong> in your Stripe Settings.</li>
                    <li>Select <strong>Standard</strong> integration type in your platform settings.</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
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
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-10 border rounded-md px-3 text-sm bg-background">
                        {sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full h-10 border rounded-md px-3 text-sm bg-background">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : "Save Venue"}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
