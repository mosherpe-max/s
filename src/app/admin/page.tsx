'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, query, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  MapPin, 
  Mail, 
  Phone, 
  User, 
  Building, 
  DollarSign, 
  ShoppingBag, 
  BarChart3, 
  ListChecks, 
  Utensils, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  Target,
  Briefcase,
  TrendingUp,
  PhoneCall,
  ClipboardList
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import {
  RadioGroup,
  RadioGroupItem
} from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Seller, Order, Prospect, SalesActivity, ProspectStage } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isToday, isThisMonth, isThisYear, format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const sellerSchema = z.object({
  courseName: z.string().min(2, 'Seller name must be at least 2 characters'),
  type: z.enum(['Private Golf Course', 'Semi Private Golf Course', 'Public Golf Course', 'Bowling Alley', 'Brewery', 'Restaurant'], {
    required_error: "Please select a seller type",
  }),
  menuTypes: z.array(z.string()).min(1, 'Please select at least one menu type'),
  halfwayHouseCount: z.coerce.number().min(0).optional(),
  halfwayHouseNames: z.array(z.string()).optional(),
  laneCount: z.coerce.number().min(0).optional(),
  tableCount: z.coerce.number().min(0).optional(),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State (e.g. CA) is required').max(2, 'Use 2-letter state code'),
  zip: z.string().min(5, 'ZIP code must be at least 5 digits').max(10, 'Invalid ZIP code'),
  contactName: z.string().min(2, 'Contact person name is required'),
  contactEmail: z.string().email('Please enter a valid email address'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  serviceFee: z.coerce.number().min(0, 'Default convenience fee cannot be negative').max(100, 'Fee seems too high'),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate seems too high').default(6.0),
  menuServiceFees: z.record(z.string(), z.coerce.number().min(0).optional()).optional(),
  status: z.enum(['Active', 'Inactive']),
});

type SellerFormData = z.infer<typeof sellerSchema>;

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const getMenuOptionsForType = (type: string) => {
  switch (type) {
    case 'Private Golf Course':
    case 'Semi Private Golf Course':
      return ["Beverage Cart", "Clubhouse", "Pool", "Take Out", "Halfway House"];
    case 'Public Golf Course':
      return ["Beverage Cart", "Clubhouse", "Take Out", "Halfway House"];
    case 'Brewery':
    case 'Restaurant':
      return ["Take Out", "Dine-In"];
    case 'Bowling Alley':
      return ["Take Out", "Lane Delivery"];
    default:
      return [];
  }
};

function GlobalStatCard({ title, revenue, orders, avgTransaction }: { title: string, revenue: number, orders: number, avgTransaction: number }) {
  return (
    <Card className="flex-1 min-w-[280px] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline flex items-center gap-2">
           <BarChart3 className="h-4 w-4 text-primary" />
           {title} Sales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Revenue (Fees)</span>
          </div>
          <span className="font-mono font-bold text-sm">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Orders</span>
          </div>
          <span className="font-mono font-bold text-sm">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg Transaction</span>
          </div>
          <span className="font-mono font-bold text-sm">${avgTransaction.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KOOPAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers');
  }, [firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'orders');
  }, [firestore]);

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'prospects'), orderBy('updatedAt', 'desc'));
  }, [firestore]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'activities'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);
  const { data: prospects, isLoading: isProspectsLoading } = useCollection<Prospect>(prospectsQuery);
  const { data: activities, isLoading: isActivitiesLoading } = useCollection<SalesActivity>(activitiesQuery);

  const salesStats = useMemo(() => {
    if (!orders) return null;

    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + (o.serviceFee || 0), 0);
      const ordersCount = filtered.length;
      const totalSales = filtered.reduce((acc, o) => acc + (o.total || 0), 0);
      const avgTransaction = ordersCount > 0 ? totalSales / ordersCount : 0;
      return { revenue, orders: ordersCount, avgTransaction };
    };

    const dailyOrders = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const monthlyOrders = orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()));
    const yearlyOrders = orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()));

    return {
      daily: calculate(dailyOrders),
      monthly: calculate(monthlyOrders),
      yearly: calculate(yearlyOrders),
    };
  }, [orders]);

  const pipelineStats = useMemo(() => {
    if (!prospects) return null;
    const closed = prospects.filter(p => p.stage === 'Closed');
    const pipelineValue = prospects.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0);
    const estAnnualVolume = closed.reduce((acc, p) => acc + (p.estVolume || 0) * 12, 0);
    return {
      total: prospects.length,
      closedCount: closed.length,
      pipelineValue,
      estAnnualVolume
    };
  }, [prospects]);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      type: 'Public Golf Course',
      menuTypes: [],
      halfwayHouseCount: 0,
      halfwayHouseNames: [],
      laneCount: 0,
      tableCount: 0,
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      serviceFee: 0,
      taxRate: 6.0,
      menuServiceFees: {},
      status: 'Active',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "halfwayHouseNames" as any,
  });

  const selectedType = form.watch('type');
  const selectedMenuTypes = form.watch('menuTypes') || [];
  const halfwayCount = form.watch('halfwayHouseCount') || 0;

  const isHalfwayHouseEnabled = selectedMenuTypes.includes('Halfway House');
  const isLaneDeliveryEnabled = selectedMenuTypes.includes('Lane Delivery');
  const isDineInEnabled = selectedMenuTypes.includes('Dine-In');

  useEffect(() => {
    if (isHalfwayHouseEnabled) {
      const currentNames = form.getValues('halfwayHouseNames') || [];
      if (halfwayCount > currentNames.length) {
        for (let i = currentNames.length; i < halfwayCount; i++) {
          append(`Halfway House ${i + 1}`);
        }
      } else if (halfwayCount < currentNames.length) {
        for (let i = currentNames.length - 1; i >= halfwayCount; i--) {
          remove(i);
        }
      }
    } else {
      form.setValue('halfwayHouseNames', []);
      form.setValue('halfwayHouseCount', 0);
    }
  }, [halfwayCount, isHalfwayHouseEnabled, append, remove, form]);

  useEffect(() => {
    const validOptions = getMenuOptionsForType(selectedType);
    const currentMenuTypes = form.getValues('menuTypes') || [];
    const filteredMenuTypes = currentMenuTypes.filter(t => validOptions.includes(t));
    
    if (filteredMenuTypes.length !== currentMenuTypes.length) {
      form.setValue('menuTypes', filteredMenuTypes);
    }

    if (!filteredMenuTypes.includes('Lane Delivery')) form.setValue('laneCount', 0);
    if (!filteredMenuTypes.includes('Dine-In')) form.setValue('tableCount', 0);
    
  }, [selectedType, form]);

  const handleOpenForm = (seller: Seller | null = null) => {
    setEditingSeller(seller);
    if (seller) {
      form.reset({
        courseName: seller.courseName,
        type: seller.type,
        menuTypes: seller.menuTypes || [],
        halfwayHouseCount: seller.halfwayHouseCount || 0,
        halfwayHouseNames: seller.halfwayHouseNames || [],
        laneCount: seller.laneCount || 0,
        tableCount: seller.tableCount || 0,
        streetAddress: seller.streetAddress,
        city: seller.city,
        state: seller.state,
        zip: seller.zip,
        contactName: seller.contactName,
        contactEmail: seller.contactEmail,
        contactPhone: seller.contactPhone,
        serviceFee: seller.serviceFee,
        taxRate: seller.taxRate || 6.0,
        menuServiceFees: seller.menuServiceFees || {},
        status: seller.status,
      });
    } else {
      form.reset({
        courseName: '',
        type: 'Public Golf Course',
        menuTypes: [],
        halfwayHouseCount: 0,
        halfwayHouseNames: [],
        laneCount: 0,
        tableCount: 0,
        streetAddress: '',
        city: '',
        state: '',
        zip: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        serviceFee: 0,
        taxRate: 6.0,
        menuServiceFees: {},
        status: 'Active',
      });
    }
    setIsFormOpen(true);
  };

  const handleSystemReset = async () => {
    if (!firestore) return;
    setIsResetting(true);
    
    try {
      const batch = writeBatch(firestore);
      
      const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
      ordersSnapshot.forEach((orderDoc) => {
        batch.delete(orderDoc.ref);
      });
      
      const sellersSnapshot = await getDocs(collection(firestore, 'sellers'));
      sellersSnapshot.forEach((sellerDoc) => {
        batch.update(sellerDoc.ref, { 
          bevcartActive: false,
          clubhouseActive: false,
          lastActive: null 
        });
      });
      
      await batch.commit();
      toast({
        title: "System Reset Complete",
        description: "All orders have been cleared and drivers disconnected.",
      });
    } catch (error) {
      console.error("Reset failed:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "An error occurred while resetting the platform state.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore) return;
    setIsSaving(true);

    let latitude = editingSeller?.latitude || 0;
    let longitude = editingSeller?.longitude || 0;

    const fullAddress = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zip}`;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const result = await response.json();
      if (result.status === 'OK') {
        const location = result.results[0].geometry.location;
        latitude = location.lat;
        longitude = location.lng;
      } else {
        toast({
          variant: 'destructive',
          title: 'Geocoding Failed',
          description: 'Could not calculate coordinates. Please verify the address.'
        });
        if (!editingSeller) {
          setIsSaving(false);
          return;
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }

    const sellerId = editingSeller ? editingSeller.id : slugify(data.courseName);
    const sellerRef = doc(firestore, 'sellers', sellerId);
    
    const payload = { ...data, id: sellerId, latitude, longitude };

    setDoc(sellerRef, payload, { merge: true })
      .then(() => {
        toast({ 
          title: editingSeller ? 'Seller Updated' : 'Seller Created', 
          description: `${data.courseName} has been saved.` 
        });
        setIsFormOpen(false);
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: editingSeller ? 'update' : 'create',
          requestResourceData: payload
        }));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const confirmDelete = () => {
    if (!firestore || !sellerToDelete) return;
    
    const id = sellerToDelete.id;
    const name = sellerToDelete.courseName;
    const sellerRef = doc(firestore, 'sellers', id);
    
    deleteDoc(sellerRef)
      .then(() => {
        toast({ title: 'Seller Deleted', description: `${name} has been removed.` });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: sellerRef.path,
          operation: 'delete'
        }));
      });
    
    setSellerToDelete(null);
  };

  const getStageColor = (stage: ProspectStage) => {
    switch (stage) {
      case 'Contacted': return 'bg-slate-500';
      case 'Demo Scheduled': return 'bg-blue-500';
      case 'Proposal Sent': return 'bg-purple-500';
      case 'Closed': return 'bg-green-600';
      case 'Lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight">KOOP ADMIN</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20">System Master</Badge>
          </div>
          <p className="text-muted-foreground">Global oversight of seller network and growth pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                <RefreshCw className={cn("mr-2 h-4 w-4", isResetting && "animate-spin")} />
                Hard Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>System Hard Reset</AlertDialogTitle>
                <AlertDialogDescription>Delete all orders and reset driver states.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSystemReset} className="bg-destructive">Confirm Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => handleOpenForm()} className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Register Seller
          </Button>
        </div>
      </header>

      <Tabs defaultValue="operations" className="space-y-8">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="operations" className="text-[10px] font-black uppercase tracking-widest px-8">Venue Operations</TabsTrigger>
          <TabsTrigger value="growth" className="text-[10px] font-black uppercase tracking-widest px-8">Growth Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-10">
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" /> Platform Revenue
            </h2>
            <div className="flex flex-wrap gap-4">
                {isOrdersLoading ? (
                    <>
                        <Skeleton className="h-40 flex-1 min-w-[280px]" />
                        <Skeleton className="h-40 flex-1 min-w-[280px]" />
                        <Skeleton className="h-40 flex-1 min-w-[280px]" />
                    </>
                ) : salesStats ? (
                    <>
                        <GlobalStatCard title="Daily" {...salesStats.daily} />
                        <GlobalStatCard title="Monthly" {...salesStats.monthly} />
                        <GlobalStatCard title="Yearly" {...salesStats.yearly} />
                    </>
                ) : null}
            </div>
          </section>

          <Card className="shadow-sm border-muted">
            <CardHeader className="bg-muted/30 border-b py-4">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">Registered Sellers</CardTitle>
                <Badge variant="outline" className="bg-background">{sellers?.length || 0} Total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isSellersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading sellers...</p>
                </div>
              ) : sellers && sellers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>Seller</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.id} className="hover:bg-muted/5">
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                                <span>{seller.courseName}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">Fee: ${seller.serviceFee.toFixed(2)} | Tax: {seller.taxRate || 6.0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">{seller.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-semibold">{seller.contactName}</span>
                              <span className="text-muted-foreground">{seller.contactEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={seller.status === 'Active' ? 'default' : 'secondary'} className="w-16 justify-center">
                              {seller.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" asChild className="h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase">
                                <Link href={`/sellers/${seller.id}`}>Manage</Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenForm(seller)} title="Edit"><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setSellerToDelete(seller)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed m-6 rounded-xl">
                  <Building className="h-12 w-12 opacity-10 mx-auto mb-2" />
                  <p>No sellers registered.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-10">
          <section>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="h-3.5 w-3.5" /> Pipeline Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-2 border-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl"><Target className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Deals</p>
                      <p className="text-2xl font-headline font-black">{pipelineStats?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-green-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl"><Briefcase className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Venues Closed</p>
                      <p className="text-2xl font-headline font-black text-green-600">{pipelineStats?.closedCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-indigo-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl"><DollarSign className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contract Value</p>
                      <p className="text-2xl font-headline font-black text-indigo-600">${pipelineStats?.pipelineValue.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-2 border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Est. Managed Vol.</p>
                      <p className="text-2xl font-headline font-black text-blue-600">${pipelineStats?.estAnnualVolume.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 shadow-sm border-muted overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg">Global Pipeline</CardTitle>
                <CardDescription>Consolidated view of all sales representative activity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isProspectsLoading ? (
                  <div className="p-10 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                ) : prospects && prospects.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="text-[10px] uppercase font-black">Venue</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Stage</TableHead>
                        <TableHead className="text-[10px] uppercase font-black">Rep</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-black">Quote</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prospects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{p.venueName}</span>
                              <span className="text-[9px] text-muted-foreground uppercase">{p.venueType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[8px] font-black uppercase", getStageColor(p.stage))}>{p.stage}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{p.assignedRepName}</span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">${p.launchFeeQuoted.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20 text-muted-foreground bg-white"><p>No prospects found in the pipeline.</p></div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-muted flex flex-col max-h-[600px] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {isActivitiesLoading ? (
                      [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                    ) : activities && activities.length > 0 ? (
                      activities.map((a) => (
                        <div key={a.id} className="p-3 border rounded-lg bg-background text-xs space-y-1 shadow-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-bold uppercase tracking-tight">{a.venueName}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">{a.date ? format(a.date.toDate(), 'MMM d') : ''}</span>
                          </div>
                          <p className="text-muted-foreground italic">"{a.notes}"</p>
                          <div className="flex items-center gap-2 pt-1 border-t mt-1">
                            <Badge variant="secondary" className="text-[8px] h-4">{a.type}</Badge>
                            <span className="text-[9px] font-black uppercase text-indigo-600">{a.repName}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm italic py-10">No recent activity logged.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary uppercase">
              {editingSeller ? 'Edit Seller Profile' : 'Register New Seller'}
            </DialogTitle>
            <DialogDescription>Ensure all details are accurate. Coordinates calculated via address.</DialogDescription>
          </DialogHeader>
          <Separator className="my-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><Building className="h-4 w-4" /> Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="courseName" render={({ field }) => (
                    <FormItem><FormLabel>Seller / Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-row space-x-6 pt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Active" /><Label className="font-normal">Active</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="Inactive" /><Label className="font-normal">Inactive</Label></div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seller Type</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {sellerTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={type} id={type} /><Label htmlFor={type} className="font-normal cursor-pointer flex-1">{type}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="menuTypes" render={() => (
                  <FormItem>
                    <FormLabel>Enabled Menu Types</FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {getMenuOptionsForType(selectedType).map((option) => (
                        <FormField key={option} control={form.control} name="menuTypes" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 border rounded-md p-2 hover:bg-muted/50 transition-colors">
                            <FormControl><Checkbox checked={field.value?.includes(option)} onCheckedChange={(checked) => checked ? field.onChange([...field.value, option]) : field.onChange(field.value?.filter((value) => value !== option))} /></FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer flex-1">{option}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editingSeller ? 'Save Changes' : 'Register Seller'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!sellerToDelete} onOpenChange={(open) => !open && setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>Remove <strong>{sellerToDelete?.courseName}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white">Delete Forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
