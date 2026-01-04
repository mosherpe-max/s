'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical } from 'lucide-react';
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
import { cn } from '@/lib/utils';

import type { MenuItem, Seller, Category } from '@/lib/types';
import { categories } from '@/lib/types';
import { menuItems as mockMenuItems } from '@/lib/data';

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
  
  const handleSeedData = async () => {
    if (!firestore || !menuItems) return;
    const batch = writeBatch(firestore);
  
    const itemsByCategory = mockMenuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<Category, typeof mockMenuItems>);
  
    // Filter out existing items from mock data to prevent duplicates
    const existingNames = new Set(menuItems.map(item => item.name));
    
    Object.values(itemsByCategory).forEach(categoryItems => {
      let rank = 1;
      categoryItems.forEach((item) => {
        if (!existingNames.has(item.name)) {
          const { id, ...rest } = item;
          const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
          batch.set(newItemRef, { ...rest, id: newItemRef.id, rank });
          rank++;
        }
      });
    });
  
    await batch.commit();
  };


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
      const itemsInCategory = menuItems?.filter(item => item.category === itemData.category) || [];
      const newRank = itemsInCategory.length > 0 ? Math.max(...itemsInCategory.map(item => item.rank)) + 1 : 1;
      setDoc(newItemRef, { ...itemData, id: newItemRef.id, rank: newRank });
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
    const grouped = menuItems.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);

    // Sort items within each category by rank
    for (const category in grouped) {
      grouped[category].sort((a, b) => a.rank - b.rank);
    }

    return grouped;
  }, [menuItems]);


  // Drag and drop state and handlers
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const dragOverItem = useRef<MenuItem | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MenuItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, item: MenuItem) => {
    e.preventDefault();
    if (draggedItem?.category === item.category) {
        dragOverItem.current = item;
        // Basic visual feedback could be added here if needed
    }
  };

  const handleDrop = async () => {
    if (!firestore || !draggedItem || !dragOverItem.current || draggedItem.id === dragOverItem.current.id || draggedItem.category !== dragOverItem.current.category) {
      return;
    }
  
    const category = draggedItem.category;
    const items = [...(groupedItems[category] || [])];
    const dragIndex = items.findIndex(item => item.id === draggedItem.id);
    const dropIndex = items.findIndex(item => item.id === dragOverItem.current!.id);
  
    if (dragIndex === -1 || dropIndex === -1) return;
  
    const newOrderedItems = [...items];
    const [reorderedItem] = newOrderedItems.splice(dragIndex, 1);
    newOrderedItems.splice(dropIndex, 0, reorderedItem);
  
    // Update ranks and prepare for batch write
    const batch = writeBatch(firestore);
    newOrderedItems.forEach((item, index) => {
      if (item.rank !== index + 1) {
        const itemRef = doc(firestore, 'sellers', sellerId, 'menuItems', item.id);
        batch.update(itemRef, { rank: index + 1 });
      }
    });
  
    await batch.commit();
    
    setDraggedItem(null);
    dragOverItem.current = null;
  };
  
  const handleDragEnd = () => {
      setDraggedItem(null);
      dragOverItem.current = null;
  };


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
            <div className="flex gap-2">
            {menuItems && menuItems.length === 0 && !isLoading && (
              <Button onClick={handleSeedData} variant="outline">Seed Menu</Button>
            )}
            <Button onClick={() => handleOpenItemForm()} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
            </div>
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
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragOver={(e) => handleDragOver(e, item)}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            className={cn(
                                "flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50 transition-opacity",
                                draggedItem?.id === item.id ? "opacity-50" : "opacity-100"
                            )}
                         >
                           <div className="flex items-center gap-4">
                             <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
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
                <p className="text-center text-muted-foreground py-8">No menu items found. Click "Add Menu Item" or "Seed Menu" to create one.</p>
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
