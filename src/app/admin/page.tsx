
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, query, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  Target, 
  Briefcase, 
  TrendingUp, 
  ClipboardList, 
  Hash, 
  Map as MapIcon, 
  Percent, 
  CalendarDays, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  CreditCard, 
  QrCode, 
  ShieldAlert, 
  Lock,
  ArrowRight
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Seller, Order, Prospect, SalesActivity } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisMonth, isThisYear, format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { cn, getNumericOrderId } from '@/lib/utils';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name must be at least 2 characters'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant']),
  menuTypes: z.array(z.string()).min(1, 'Select at least one menu type'),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, '2-letter state code required'),
  zip: z.string().min(5, 'Invalid ZIP'),
  contactName: z.string().min(2, 'Contact name required'),
  contactEmail: z.string().email('Invalid email'),
  contactPhone: z.string().min(10, 'Invalid phone'),
  serviceFee: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).default(6.0),
  monthlyPlatformFee: z.coerce.number().min(0).optional(),
  launchFee: z.coerce.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']),
});

type SellerFormData = z.infer<typeof sellerSchema>;

export default function KOOPAdminPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
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
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
  const [activeTab, setActiveTab] = useState<string>('operations');

  // Queries (Only active if adminRole is verified)
  const sellersQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'sellers');
  }, [firestore, adminRole]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'orders');
  }, [firestore, adminRole]);

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'prospects');
  }, [firestore, adminRole]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !adminRole) return null;
    return collection(firestore, 'activities');
  }, [firestore, adminRole]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: prospects, isLoading: isProspectsLoading } = useCollection<Prospect>(prospectsQuery);
  const { data: activities, isLoading: isActivitiesLoading } = useCollection<SalesActivity>(activitiesQuery);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      type: 'Public Golf Course',
      menuTypes: [],
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      serviceFee: 0,
      taxRate: 6.0,
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
    const sellerId = editingSeller ? editingSeller.id : data.courseName.toLowerCase().replace(/\s+/g, '-');
    const sellerRef = doc(firestore, 'sellers', sellerId);
    setDoc(sellerRef, { ...data, id: sellerId }, { merge: true })
      .then(() => {
        toast({ title: 'Seller Updated' });
        setIsFormOpen(false);
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
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Total SaaS Volume</p>
                    <p className="text-2xl font-black">${(sellers?.reduce((acc, s) => acc + (s.monthlyPlatformFee || 0), 0) || 0).toLocaleString()}</p>
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
                    <TableHead className="text-[10px] uppercase font-black">Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-center">Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSellersLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                    ))
                  ) : sellers?.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{seller.courseName}</span>
                          <span className="text-[9px] text-muted-foreground">{seller.contactEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] uppercase">{seller.type}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[8px] uppercase", seller.status === 'Active' ? 'bg-green-600' : 'bg-slate-400')}>
                          {seller.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] font-bold">
                          <Link href={`/sellers/${seller.id}`}>MANAGE</Link>
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
              <p className="font-medium italic">Sales Pipeline and CRM tools are strictly for platform administrators.</p>
              <p className="text-xs uppercase font-black tracking-widest">Functionality Locked to Admin Role</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="uppercase font-headline">Register New Venue</DialogTitle>
            <DialogDescription>Initialize a new establishment on the platform.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-4">
              <FormField control={form.control} name="courseName" render={({ field }) => (
                <FormItem><FormLabel>Venue Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel><FormControl><select {...field} className="w-full h-10 border rounded-md px-3 text-sm">{sellerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><FormControl><select {...field} className="w-full h-10 border rounded-md px-3 text-sm"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="serviceFee" render={({ field }) => (
                  <FormItem><FormLabel>Convenience Fee ($)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <DialogFooter className="pt-6">
                <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Register Establishment"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
