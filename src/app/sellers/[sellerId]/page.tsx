'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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

import type { Menu, MenuItem, Seller, Category } from '@/lib/types';
import { categories } from '@/lib/types';

const menuSchema = z.object({
  name: z.string().min(1, 'Menu name is required'),
  description: z.string().optional(),
});

type MenuFormData = z.infer<typeof menuSchema>;

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

function MenuForm({
  onSave,
  onClose,
  menu,
  disabled,
}: {
  onSave: (menuData: MenuFormData) => void;
  onClose: () => void;
  menu?: Menu | null;
  disabled?: boolean;
}) {
  const form = useForm<MenuFormData>({
    resolver: zodResolver(menuSchema),
    defaultValues: menu || {
      name: '',
      description: '',
    },
  });

  const isEditing = !!menu;

  useEffect(() => {
    if (menu) {
      form.reset(menu);
    } else {
      form.reset({ name: '', description: '' });
    }
  }, [menu, form]);

  const handleSubmit = (data: MenuFormData) => {
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
                <FormLabel>Menu Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Beer Menu" />
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
                  <Textarea {...field} placeholder="A short description of the menu." />
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
          <Button type="submit" disabled={disabled}>
            {isEditing ? 'Save Changes' : 'Add Menu'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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

function MenuItemsList({ menuId, sellerId, isLoading }: { menuId: string, sellerId: string, isLoading: boolean }) {
  const firestore = useFirestore();
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const menuItemsQuery = useMemoFirebase(() => {
    if (!firestore || !menuId) return null;
    return collection(firestore, 'sellers', sellerId, 'menus', menuId, 'menuItems');
  }, [firestore, menuId, sellerId]);

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
      const itemRef = doc(firestore, 'sellers', sellerId, 'menus', menuId, 'menuItems', editingItem.id);
      setDoc(itemRef, itemData, { merge: true });
    } else {
      const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menus', menuId, 'menuItems'));
      setDoc(newItemRef, { ...itemData, id: newItemRef.id, menuId });
    }
    handleCloseItemForm();
  };

  if (areItemsLoading) return <p>Loading menu items...</p>;

  return (
    <>
      <div className="space-y-4 p-4 bg-muted/50 rounded-md">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => handleOpenItemForm()} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
        {menuItems && menuItems.length > 0 ? (
          menuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 p-2 rounded-lg bg-background"
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
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-4">No items in this menu yet.</p>
        )}
      </div>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
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

export default function SellerAdminPage({
  params: { sellerId },
}: {
  params: { sellerId: string };
}) {
  const firestore = useFirestore();

  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

  const sellerRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'sellers', sellerId);
  }, [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menusQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sellers', sellerId, 'menus');
  }, [firestore, sellerId]);

  const { data: menus, isLoading: areMenusLoading } = useCollection<Menu>(menusQuery);
  
  const handleSaveMenu = (menuData: MenuFormData) => {
    if (!firestore) return;

    if (editingMenu) {
      // Logic for updating a menu would go here
    } else {
      const newMenuRef = doc(collection(firestore, 'sellers', sellerId, 'menus'));
      setDoc(newMenuRef, {
        ...menuData,
        id: newMenuRef.id,
        sellerId: sellerId,
      });
    }
    handleCloseMenuForm();
  };
  
  const handleOpenMenuForm = (menu: Menu | null = null) => {
    setEditingMenu(menu);
    setIsMenuFormOpen(true);
  };
  
  const handleCloseMenuForm = () => {
    setEditingMenu(null);
    setIsMenuFormOpen(false);
  };


  const isLoading = isSellerLoading || areMenusLoading;

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
            <CardTitle>Manage Menus</CardTitle>
            <Button onClick={() => handleOpenMenuForm()} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Menu
            </Button>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {isLoading ? (
                <p>Loading menus...</p>
              ) : menus && menus.length > 0 ? (
                menus.map((menu) => (
                  <AccordionItem value={menu.id} key={menu.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="font-semibold text-lg">{menu.name}</span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenMenuForm(menu); }}>
                              <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <MenuItemsList menuId={menu.id} sellerId={sellerId} isLoading={isLoading} />
                    </AccordionContent>
                  </AccordionItem>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No menus found. Click "Add Menu" to create one.</p>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isMenuFormOpen} onOpenChange={setIsMenuFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingMenu ? 'Edit Menu' : 'Add New Menu'}</DialogTitle>
          </DialogHeader>
          <MenuForm
            onSave={handleSaveMenu}
            menu={editingMenu}
            onClose={handleCloseMenuForm}
            disabled={isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
