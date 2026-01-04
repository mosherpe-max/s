'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

import type { Seller } from '@/lib/types';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const sellerSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  courseAddress: z.string().min(1, 'Address is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  serviceFee: z.coerce.number().min(0, 'Service fee must be a positive number'),
});

type SellerFormData = z.infer<typeof sellerSchema>;

function SellerForm({
  onSave,
  onClose,
  seller,
  disabled,
}: {
  onSave: (sellerData: SellerFormData) => void;
  onClose: () => void;
  seller?: Seller | null;
  disabled?: boolean;
}) {
  const form = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: seller || {
      courseName: '',
      courseAddress: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      serviceFee: 0,
    },
  });
  
  const isEditing = !!seller;
  
  useEffect(() => {
    if (seller) {
      form.reset(seller);
    } else {
      form.reset({
        courseName: '',
        courseAddress: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        serviceFee: 0,
      });
    }
  }, [seller, form]);


  const handleSubmit = (data: SellerFormData) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="courseName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="courseAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Fee</FormLabel>
                <FormControl>
                  <Input type="number" step="0.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>{isEditing ? 'Save Changes' : 'Add Seller'}</Button>
        </div>
      </form>
    </Form>
  );
}

export default function AdminPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);

  const firestore = useFirestore();

  const sellersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers');
  }, [firestore]);

  const { data: sellers, isLoading: areSellersLoading } = useCollection<Seller>(sellersCollection);

  const handleSaveSeller = (sellerData: SellerFormData) => {
    if (!firestore) {
      console.error("Firestore not available.");
      return;
    };

    const placeholderLocation = {
      latitude: 42.7,
      longitude: -83.2,
    };

    if (editingSeller) {
      const sellerRef = doc(firestore, 'sellers', editingSeller.id);
      updateDoc(sellerRef, {
        ...sellerData,
      });
    } else {
        const nextId = () => {
          if (!sellers || sellers.length === 0) {
            return '1';
          }
          const highestId = sellers.reduce((maxId, seller) => {
            const currentId = parseInt(seller.id, 10);
            return currentId > maxId ? currentId : maxId;
          }, 0);
          return (highestId + 1).toString();
        };

      const newSellerId = nextId();
      const newSellerRef = doc(firestore, 'sellers', newSellerId);
      setDoc(newSellerRef, {
        ...sellerData,
        ...placeholderLocation,
        status: 'Active',
      });
    }
    handleCloseForm();
  };

  const toggleSellerStatus = (seller: Seller) => {
    if (!firestore) return;
    const sellerRef = doc(firestore, 'sellers', seller.id);
    const newStatus = seller.status === 'Active' ? 'Inactive' : 'Active';
    updateDoc(sellerRef, { status: newStatus });
  };

  const deleteSeller = (sellerId: string) => {
    if (!firestore) return;
    const sellerRef = doc(firestore, 'sellers', sellerId);
    deleteDoc(sellerRef);
  };

  const handleOpenForm = (seller: Seller | null = null) => {
    setEditingSeller(seller);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingSeller(null);
    setIsFormOpen(false);
  };
  
  const isLoading = areSellersLoading;

  return (
    <>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-headline text-4xl font-bold text-foreground">
            Koop Admin Panel
          </h1>
        </div>
      </header>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Sellers</CardTitle>
          <Button onClick={() => handleOpenForm()} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Seller
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Golf Course</TableHead>
                <TableHead>Seller ID</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Service Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {sellers &&
                sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <div className="font-medium">{seller.courseName}</div>
                      <div className="text-sm text-muted-foreground">
                        {seller.courseAddress}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{seller.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{seller.latitude.toFixed(4)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{seller.longitude.toFixed(4)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{seller.contactName}</div>
                      <div className="text-sm text-muted-foreground">
                        {seller.contactEmail}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {seller.contactPhone}
                      </div>
                    </TableCell>
                    <TableCell>${seller.serviceFee.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          seller.status === 'Active' ? 'default' : 'destructive'
                        }
                        className={
                          seller.status === 'Active'
                            ? 'bg-accent text-accent-foreground'
                            : ''
                        }
                      >
                        {seller.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isLoading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => handleOpenForm(seller)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleSellerStatus(seller)}
                          >
                            {seller.status === 'Active'
                              ? 'Deactivate'
                              : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteSeller(seller.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSeller ? 'Edit Seller' : 'Add New Seller'}
            </DialogTitle>
          </DialogHeader>
          <SellerForm
            onSave={handleSaveSeller}
            seller={editingSeller}
            onClose={handleCloseForm}
            disabled={isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
