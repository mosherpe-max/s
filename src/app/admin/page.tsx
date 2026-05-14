'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from '@/firebase';
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
  Settings,
  ShieldCheck,
  KeyRound,
  Save,
  Globe
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/tabs";
import type { Seller } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SUPER_ADMIN_ID } from '@/lib/utils';
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
  const firestore = useFirestore();
  const auth = useAuth();
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

  const isAuthorized = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';

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
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    await setDoc(doc(firestore, 'sellers', sellerId), { ...data, id: sellerId, updatedAt: serverTimestamp() }, { merge: true });
    toast({ title: editingSeller ? 'Venue Updated' : 'Venue Registered' });
    setIsFormOpen(false); setEditingSeller(null); form.reset(); setIsSaving(false);
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
                      <Button variant="ghost" size="icon" onClick={() => { setEditingSeller(seller); form.reset(seller); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
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

            <Card className="shadow-lg border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase">Configuration Guide</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-4 text-muted-foreground leading-relaxed">
                <p>To enable multi-venue onboarding, you must configure your Stripe dashboard:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Navigate to <strong>Connect > Settings</strong> in Stripe.</li>
                  <li>Copy your <strong>Live/Test Client ID</strong> and paste it here.</li>
                  <li>Add <code>https://your-domain.com/onboarding-success</code> to your <strong>Redirect URIs</strong>.</li>
                  <li>Obtain your Secret Key from <strong>Developers > API Keys</strong>.</li>
                </ol>
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
