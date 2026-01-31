'use client';

import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import type { Seller } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const sellerSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  courseAddress: z.string().min(1, 'Address is required'),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  serviceFee: z.coerce.number().min(0, 'Fee must be positive'),
  status: z.enum(['Active', 'Inactive']),
});

type SellerFormData = z.infer<typeof sellerSchema>;

export default function KoopAdminPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers');
  }, [firestore]);

  const { data: sellers, isLoading } = useCollection<Seller>(sellersQuery);

  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      courseName: '',
      courseAddress: '',
      latitude: 0,
      longitude: 0,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      serviceFee: 0,
      status: 'Active',
    },
  });

  const handleOpenForm = (seller: Seller | null = null) => {
    setEditingSeller(seller);
    if (seller) {
      form.reset(seller);
    } else {
      form.reset({
        courseName: '',
        courseAddress: '',
        latitude: 0,
        longitude: 0,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        serviceFee: 0,
        status: 'Active',
      });
    }
    setIsFormOpen(true);
  };

  const onSave = async (data: SellerFormData) => {
    if (!firestore) return;

    try {
      if (editingSeller) {
        const sellerRef = doc(firestore, 'sellers', editingSeller.id);
        await setDoc(sellerRef, data, { merge: true });
        toast({ title: 'Seller Updated', description: `${data.courseName} has been updated.` });
      } else {
        const newSellerRef = doc(collection(firestore, 'sellers'));
        await setDoc(newSellerRef, { ...data, id: newSellerRef.id });
        toast({ title: 'Seller Created', description: `${data.courseName} has been added.` });
      }
      setIsFormOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save seller.' });
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!firestore) return;
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteDoc(doc(firestore, 'sellers', id));
        toast({ title: 'Seller Deleted', description: `${name} has been removed.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete seller.' });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-foreground">Koop Admin</h1>
          <p className="text-muted-foreground">Manage golf course sellers and partners.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Seller
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registered Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sellers...</div>
          ) : sellers && sellers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.courseName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="font-semibold">{seller.contactName}</span>
                          <span className="text-muted-foreground">{seller.contactEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>{seller.courseAddress}</span>
                          <span className="font-mono">{seller.latitude.toFixed(4)}, {seller.longitude.toFixed(4)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">${seller.serviceFee.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={seller.status === 'Active' ? 'default' : 'secondary'}>
                          {seller.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(seller)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(seller.id, seller.courseName)}>
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
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              No sellers found. Add your first golf course to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeller ? 'Edit Seller' : 'Add New Seller'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="courseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Pebble Beach" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="courseAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Address</FormLabel>
                    <FormControl><Input {...field} placeholder="Full address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl><Input type="number" step="0.000001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl><Input type="number" step="0.000001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Fee ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Contact Information</h3>
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl><Input {...field} placeholder="Primary contact name" /></FormControl>
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
                        <FormControl><Input type="email" {...field} /></FormControl>
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
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">{editingSeller ? 'Save Changes' : 'Create Seller'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
