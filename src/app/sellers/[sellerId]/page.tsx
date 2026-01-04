'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import type { MenuItem, Seller, Category } from '@/lib/types';
import { categories } from '@/lib/types';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

function MenuItemForm({
  onSave,
  onClose,
  menuItem,
  disabled,
}: {
  onSave: (itemData: MenuItemFormData) => void;
  onClose: () => void;
  menuItem?: MenuItem | null;
  disabled?: boolean;
}) {
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: menuItem || {
      name: '',
      description: '',
      price: 0,
      category: 'Beer',
    },
  });

  const isEditing = !!menuItem;

  useEffect(() => {
    form.reset(menuItem || { name: '', description: '', price: 0, category: 'Beer' });
  }, [menuItem, form]);

  const handleSubmit = (data: MenuItemFormData) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Craft IPA" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="A short description of the item." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled}>
            {isEditing ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function SellerAdminPage({
  params: { sellerId },
}: {
  params: { sellerId: string };
}) {
  const firestore = useFirestore();

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const sellerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers', sellerId, 'menuItems');
  }, [firestore, sellerId]);

  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const handleOpenItemForm = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsItemFormOpen(true);
  };

  const handleCloseItemForm = () => {
    setEditingItem(null);
    setIsItemFormOpen(false);
  };
  
  const handleSaveMenuItem = (itemData: MenuItemFormData) => {
    if (!firestore) return;
    
    if (editingItem) {
      const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id);
      setDoc(itemRef, itemData, { merge: true });
    } else {
      const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
      setDoc(newItemRef, { ...itemData, id: newItemRef.id });
    }
    handleCloseItemForm();
  };

  const handleDeleteMenuItem = (itemId: string) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', itemId);
    deleteDoc(itemRef);
  };

  const isLoading = isSellerLoading || areItemsLoading;

  const groupedItems = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
            Seller Admin - {isLoading ? 'Loading...' : seller?.courseName}
          </h1>
        </header>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Manage Menu Items</CardTitle>
            <Button onClick={() => handleOpenItemForm()} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <p>Loading menu items...</p>
            ) : menuItems && menuItems.length > 0 ? (
              <div className="space-y-6">
                {categories.map((category) => (
                  (groupedItems[category] && groupedItems[category].length > 0) && (
                    <div key={category}>
                      <h3 className="font-headline text-xl font-semibold mb-2">{category}</h3>
                      <Separator />
                      <div className="space-y-2 mt-4">
                        {groupedItems[category].map((item) => (
                           <div
                           key={item.id}
                           className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50"
                         >
                           <div className="flex items-center gap-4">
                             <div>
                               <p className="font-medium">{item.name}</p>
                               <p className="text-sm text-muted-foreground">
                                 ${item.price.toFixed(2)}
                               </p>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Badge variant="secondary">{item.category}</Badge>
                             <Button variant="ghost" size="icon" onClick={() => handleOpenItemForm(item)}>
                               <Edit className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="text-destructive hover:text-destructive"
                               onClick={() => handleDeleteMenuItem(item.id)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </div>
                         </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">No menu items found. Click "Add Menu Item" to create one.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <MenuItemForm
            onSave={handleSaveMenuItem}
            menuItem={editingItem}
            onClose={handleCloseItemForm}
            disabled={isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
