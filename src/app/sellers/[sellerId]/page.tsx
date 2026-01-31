'use client';

import React, { useState, useMemo, useEffect, useRef, use } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical, Filter, DollarSign, ShoppingBag, Clock } from 'lucide-react';
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
import { isToday, isThisMonth, isThisYear } from 'date-fns';

import type { MenuItem, Seller, Category, Order } from '@/lib/types';
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

function StatTile({ title, revenue, orders, longWait }: { title: string, revenue: number, orders: number, longWait: number }) {
  return (
    <Card className="flex-1 min-w-[300px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline">{title}</CardTitle>
        <CardDescription>Sales Performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Revenue</span>
          </div>
          <span className="font-mono font-bold">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Total Orders</span>
          </div>
          <span className="font-mono font-bold">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Orders {'>'} 10m</span>
          </div>
          <span className="font-mono font-bold text-destructive">{longWait}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SellerAdminPage({
  params,
}: {
  params: { sellerId: string };
}) {
  const { sellerId } = use(params);
  const firestore = useFirestore();

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');

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

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'orders'), where('sellerId', '==', sellerId));
  }, [firestore, sellerId]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const dashboardStats = useMemo(() => {
    if (!orders) return null;

    const calculate = (filtered: Order[]) => {
      const revenue = filtered.reduce((acc, o) => acc + o.total, 0);
      const longWait = filtered.filter(o => {
        if (!o.deliveredAt || !o.createdAt) return false;
        const duration = (o.deliveredAt.toDate().getTime() - o.createdAt.toDate().getTime()) / 60000;
        return duration > 10;
      }).length;
      return { revenue, orders: filtered.length, longWait };
    };

    const daily = orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()));
    const monthly = orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()));
    const yearly = orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()));

    return {
      daily: calculate(daily),
      monthly: calculate(monthly),
      yearly: calculate(yearly),
    };
  }, [orders]);
  
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

  const isLoading = isSellerLoading || areItemsLoading || areOrdersLoading;

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

  const filterOptions: (Category | 'All')[] = ['All', ...categories];

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
            Seller Admin - {isSellerLoading ? 'Loading...' : seller?.courseName}
          </h1>
        </header>

        {/* Sales Dashboard Section */}
        <section className="mb-12">
          <h2 className="font-headline text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Sales Data Dashboard
          </h2>
          <div className="flex flex-wrap gap-4">
            {dashboardStats ? (
              <>
                <StatTile title="Daily" {...dashboardStats.daily} />
                <StatTile title="This Month" {...dashboardStats.monthly} />
                <StatTile title="This Year" {...dashboardStats.yearly} />
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
          </div>
        </section>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center flex-1">
             <Filter className="h-4 w-4 text-muted-foreground mr-2" />
             {filterOptions.map((filter) => (
               <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className="h-8"
               >
                 {filter}
               </Button>
             ))}
          </div>
          <div className="flex gap-2">
            {menuItems && menuItems.length === 0 && !isLoading && (
              <Button onClick={handleSeedData} variant="outline" size="sm">Seed Menu</Button>
            )}
            <Button onClick={() => handleOpenItemForm()} disabled={isLoading} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            {areItemsLoading ? (
                <p>Loading menu items...</p>
            ) : menuItems && menuItems.length > 0 ? (
              <div className="space-y-6">
                {categories.filter(cat => activeFilter === 'All' || activeFilter === cat).map((category) => (
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
