
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
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
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Seller, Order, Prospect, SalesActivity } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name required'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant']),
  contactEmail: z.string().email('Invalid email'),
  serviceFee: z.coerce.number().min(0),
  status: z.enum(['Active', 'Inactive']),
});

type SellerFormData = z.infer<typeof sellerSchema>;

export default function KOOPAdminPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // Guard Logic: Verify Role before attempting any data queries
  const roleRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);
  
  const { data: adminRole, isLoading: isRoleLoading } = useDoc(roleRef);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // CRITICAL: Queries only activate if adminRole is verified. 
  // This prevents permission errors on page load.
  const sellersQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'sellers');
  }, [firestore, adminRole]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'orders');
  }, [firestore, adminRole]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders } = useCollection<Order>(ordersQuery);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      type: 'Public Golf Course',
      contactEmail: '',
      serviceFee: 0,
      status: 'Active',
    },
  });

  const handleSystemReset = async () => {
    if (!firestore) return;
    setIsResetting(true);
    try {
      const batch = writeBatch(firestore);
      const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
      ordersSnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast({ title: "System Reset Complete" });
    } catch (e) {
      toast({ variant: "destructive", title: "Reset Failed" });
    } finally {
      setIsResetting(false);
    }
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore) return;
    setIsSaving(true);
    const sellerId = data.courseName.toLowerCase().replace(/\s+/g, '-');
    const sellerRef = doc(firestore, 'sellers', sellerId);
    
    setDoc(sellerRef, { ...data, id: sellerId }, { merge: true })
      .then(() => {
        toast({ title: 'Seller Registered' });
        setIsFormOpen(false);
        form.reset();
      })
      .finally(() => setIsSaving(false));
  };

  if (isUserLoading || isRoleLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Verifying Administrator Role...</p>
      </div>
    );
  }

  if (!user || !adminRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
        <div className="p-6 bg-destructive/10 rounded-full text-destructive shadow-inner">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-black uppercase text-[#213147]">ACCESS RESTRICTED</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            You are signed in, but your account has not been promoted to the **KOOP Admin** role. 
            Please use the setup tool on the login page to initialize your admin session.
          </p>
        </div>
        <Button asChild size="lg" className="h-14 px-8 font-headline font-black uppercase tracking-widest">
          <Link href="/login">RETURN TO SECURITY SETUP</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-3xl font-bold text-[#213147] uppercase tracking-tight">KOOP ADMIN</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-black">Authorized Session</Badge>
          </div>
          <p className="text-muted-foreground">Global oversight of established venues and growth pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSystemReset} disabled={isResetting} className="border-destructive text-destructive">
            <RefreshCw className={cn("mr-2 h-4 w-4", isResetting && "animate-spin")} /> Reset Orders
          </Button>
          <Button onClick={() => setIsFormOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Register Venue</Button>
        </div>
      </header>

      <Tabs defaultValue="operations" className="space-y-8">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase px-8">Venue Operations</TabsTrigger>
          <TabsTrigger value="growth" className="text-[10px] font-black uppercase px-8">Growth Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-2 border-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl"><Building className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Active Venues</p>
                    <p className="text-2xl font-black">{sellers?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-xl"><ShoppingBag className="h-6 w-6 text-muted-foreground" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Lifetime Orders</p>
                    <p className="text-2xl font-black">{orders?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-xl"><DollarSign className="h-6 w-6 text-indigo-600" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Platform Volume</p>
                    <p className="text-2xl font-black">${(orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm font-black uppercase">Registered Seller Network</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="text-[10px] uppercase font-black">Venue</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSellersLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : sellers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic text-sm">
                        No venues registered yet.
                      </TableCell>
                    </TableRow>
                  ) : sellers?.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{seller.courseName}</span>
                          <span className="text-[9px] text-muted-foreground">{seller.contactEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] uppercase", seller.status === 'Active' ? 'bg-green-600' : 'bg-slate-400')}>
                          {seller.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-bold">
                          <Link href={`/sellers/${seller.id}`}>MANAGE <ChevronRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <div className="flex items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl">
            <div className="text-center space-y-4">
              <Target className="h-12 w-12 mx-auto opacity-20" />
              <p className="font-medium italic">Growth Pipeline functionality is restricted to authorized platform administrators.</p>
              <Button variant="link" asChild className="text-indigo-600 font-bold uppercase text-[10px]">
                <Link href="/sales">Go to My Pipeline</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="uppercase font-headline">Register New Venue</DialogTitle>
            <DialogDescription>Initialize a new establishment on the platform.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-4">
              <FormField control={form.control} name="courseName" render={({ field }) => (
                <FormItem><FormLabel>Venue Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><FormControl><select {...field} className="w-full h-10 border rounded-md px-3 text-sm">{sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="serviceFee" render={({ field }) => (
                <FormItem><FormLabel>Convenience Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter className="pt-6">
                <Button type="submit" disabled={isSaving} className="w-full h-12">{isSaving ? "Registering..." : "Register Establishment"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
