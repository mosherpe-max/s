
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, query, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Loader2, MapPin, Mail, Phone, User, Building, DollarSign, ShoppingBag, BarChart3, ListChecks, Utensils, RefreshCw, AlertTriangle, ShieldCheck, Percent } from 'lucide-react';
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
import type { Seller, Order } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isToday, isThisMonth, isThisYear, format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  menuServiceFees: z.record(z.string(), z.coerce.number().min(0)).optional(),
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

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 text-center md:text-left">
        <div className="flex-1">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <h1 className="font-headline text-3xl font-bold text-foreground uppercase tracking-tight">KOOP ADMIN</h1>
          </div>
          <p className="text-muted-foreground">Manage your seller network and monitor platform performance.</p>
        </div>
        <div className="flex items-center gap-3 self-center md:self-auto">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                <RefreshCw className={cn("mr-2 h-4 w-4", isResetting && "animate-spin")} />
                Manual System Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Hard Platform Reset
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action will <strong>delete all active orders</strong> and set <strong>all drivers to Inactive</strong>. This is used to clear ghost markers and stale data during prototyping.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSystemReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => handleOpenForm()} size="default" className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Register New Seller
          </Button>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
            Global Sales Dashboard
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
            ) : (
                <Card className="w-full py-10 flex flex-col items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-10 w-10 opacity-10 mb-2" />
                    <p>No order data available to generate stats.</p>
                </Card>
            )}
        </div>
      </section>

      <Card className="shadow-sm border-muted">
        <CardHeader className="bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4 border-b">
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
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="font-mono text-[10px] text-muted-foreground align-top pt-5">{seller.id}</TableCell>
                      <TableCell className="font-medium align-top pt-5">
                        <div className="flex flex-col">
                            <span>{seller.courseName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-1">Default Convenience Fee: ${seller.serviceFee.toFixed(2)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Tax Rate: {seller.taxRate || 6.0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-5">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">{seller.type}</Badge>
                      </TableCell>
                      <TableCell className="align-top pt-5">
                        <div className="flex flex-col text-xs space-y-1">
                          <span className="font-semibold flex items-center gap-1"><User className="h-3 w-3" /> {seller.contactName}</span>
                          <span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {seller.contactEmail}</span>
                          <span className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {seller.contactPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top pt-5">
                        <div className="flex flex-col text-xs text-muted-foreground space-y-0.5">
                          <span className="font-semibold text-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {seller.streetAddress}</span>
                          <span>{seller.city}, {seller.state} {seller.zip}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top pt-5">
                        <Badge variant={seller.status === 'Active' ? 'default' : 'secondary'} className="w-16 justify-center transition-colors">
                          {seller.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right align-top pt-4">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(seller)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setSellerToDelete(seller)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-24 text-muted-foreground border-2 border-dashed m-6 rounded-xl flex flex-col items-center gap-2">
              <Building className="h-12 w-12 opacity-10" />
              <p className="text-lg font-medium">No sellers registered.</p>
              <p className="text-sm">Register your first partner to begin service.</p>
              <Button variant="outline" onClick={() => handleOpenForm()} className="mt-4">Register Now</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline text-primary uppercase">
              {editingSeller ? 'Edit Seller Profile' : 'Register New Seller'}
            </DialogTitle>
            <DialogDescription>
                Ensure all details are accurate. Coordinates will be calculated automatically based on the address.
            </DialogDescription>
          </DialogHeader>
          <Separator className="my-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Building className="h-4 w-4" /> Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="courseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller / Business Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Pebble Beach Golf Links" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Account Status</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-row space-x-6 pt-2"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Active" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Active
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Inactive" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Inactive
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Seller Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2"
                        >
                          {sellerTypes.map((type) => (
                            <FormItem key={type} className="flex items-center space-x-2 space-y-0 border rounded-md p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                              <FormControl>
                                <RadioGroupItem value={type} />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex-1">
                                {type}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="menuTypes"
                  render={() => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" /> Enabled Menu Types
                      </FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {getMenuOptionsForType(selectedType).map((option) => (
                          <FormField
                            key={option}
                            control={form.control}
                            name="menuTypes"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={option}
                                  className="flex flex-row items-start space-x-3 space-y-0 border rounded-md p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, option])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== option
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer flex-1">
                                    {option}
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

                {isHalfwayHouseEnabled && (
                  <div className="space-y-4 bg-muted/30 p-4 rounded-lg border animate-in slide-in-from-top-2">
                    <FormField
                      control={form.control}
                      name="halfwayHouseCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Halfway Houses</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g. 2" />
                          </FormControl>
                          <FormDescription>Specify how many delivery locations exist.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {fields.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Location Names</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {fields.map((field, index) => (
                            <FormField
                              key={field.id}
                              control={form.control}
                              name={`halfwayHouseNames.${index}` as any}
                              render={({ field: inputField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...inputField} placeholder={`Name for Location ${index + 1}`} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isLaneDeliveryEnabled && (
                  <div className="bg-muted/30 p-4 rounded-lg border animate-in slide-in-from-top-2">
                    <FormField
                      control={form.control}
                      name="laneCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Number of Lanes</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g. 24" />
                          </FormControl>
                          <FormDescription>Used for customers to specify their lane number at checkout.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {isDineInEnabled && (
                  <div className="bg-muted/30 p-4 rounded-lg border animate-in slide-in-from-top-2">
                    <FormField
                      control={form.control}
                      name="tableCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Number of Tables</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="e.g. 15" />
                          </FormControl>
                          <FormDescription>Used for customers to specify their table number for dine-in orders.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                        <DollarSign className="h-4 w-4" /> Fees & Taxation
                    </h3>
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">Establishment Tax Rate (%)</FormLabel>
                          <div className="relative w-24">
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                {...field} 
                                className="h-8 text-right pr-7 font-mono text-xs" 
                              />
                            </FormControl>
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Define convenience fees and local tax rates.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serviceFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Fee ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.50" {...field} />
                          </FormControl>
                          <FormDescription>Used if no menu-specific fee is set.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {selectedMenuTypes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {selectedMenuTypes.map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name={`menuServiceFees.${type}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-tight">{type} Fee</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input 
                                    type="number" 
                                    step="0.50" 
                                    className="pl-7"
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Service Location
                </h3>
                <FormField
                  control={form.control}
                  name="streetAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input {...field} placeholder="1700 17-Mile Drive" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input {...field} placeholder="Pebble Beach" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State (Code)</FormLabel>
                        <FormControl><Input {...field} placeholder="CA" maxLength={2} className="uppercase" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl><Input {...field} placeholder="93953" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <User className="h-4 w-4" /> Administrative Contact
                </h3>
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Point of Contact</FormLabel>
                      <FormControl><Input {...field} placeholder="Full name of manager" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="manager@seller.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSeller ? 'Save Changes' : 'Register Seller'
                  )}
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
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{sellerToDelete?.courseName}</strong>? This will permanently delete the seller profile and all associated menu items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
