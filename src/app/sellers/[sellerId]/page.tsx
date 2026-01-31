'use client';

import React, { useState, useMemo, useEffect, useRef, use } from 'react';
import { collection, doc, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, GripVertical, Filter, DollarSign, ShoppingBag, Clock, Database, Users, UserPlus, Sparkles } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { isToday, isThisMonth, isThisYear } from 'date-fns';

import type { MenuItem, Seller, Category, Order, Member } from '@/lib/types';
import { categories } from '@/lib/types';
import { menuItems as mockMenuItems } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  category: z.enum(categories),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  memberNumber: z.string().min(1, 'Member ID number is required'),
});

type MemberFormData = z.infer<typeof memberSchema>;

const sampleMembers = [
  { name: 'Jane Doe', memberNumber: '1001' },
  { name: 'John Smith', memberNumber: '1002' },
  { name: 'Alice Johnson', memberNumber: '1003' },
  { name: 'Robert Brown', memberNumber: '1004' }
];

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 py-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Craft IPA" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="A short description of the item." /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{isEditing ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
}

function MemberForm({
  onSave,
  onClose,
  member,
  disabled,
}: {
  onSave: (data: MemberFormData) => void;
  onClose: () => void;
  member?: Member | null;
  disabled?: boolean;
}) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: member || { name: '', memberNumber: '' },
  });

  useEffect(() => {
    form.reset(member || { name: '', memberNumber: '' });
  }, [member, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 py-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Member Name</FormLabel><FormControl><Input {...field} placeholder="Jane Doe" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="memberNumber" render={({ field }) => (
            <FormItem><FormLabel>Member ID Number</FormLabel><FormControl><Input {...field} placeholder="12345" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={disabled}>{member ? 'Update' : 'Add Member'}</Button>
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
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Total Revenue</span></div>
          <span className="font-mono font-bold">${revenue.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Total Orders</span></div>
          <span className="font-mono font-bold">{orders}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-destructive" /><span className="text-sm font-medium">Orders {'>'} 10m</span></div>
          <span className="font-mono font-bold text-destructive">{longWait}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SellerAdminPage({ params }: { params: { sellerId: string } }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');
  const [isSeeding, setIsSeeding] = useState(false);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller, isLoading: isSellerLoading } = useDoc<Seller>(sellerRef);

  const menuItemsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'menuItems') : null), [firestore, sellerId]);
  const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuItemsQuery);

  const membersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers', sellerId, 'members') : null), [firestore, sellerId]);
  const { data: members, isLoading: areMembersLoading } = useCollection<Member>(membersQuery);

  const ordersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'orders'), where('sellerId', '==', sellerId)) : null), [firestore, sellerId]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const isClubSeller = seller?.type === 'Private Golf Course' || seller?.type === 'Semi Private Golf Course';

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
    return {
      daily: calculate(orders.filter(o => o.createdAt && isToday(o.createdAt.toDate()))),
      monthly: calculate(orders.filter(o => o.createdAt && isThisMonth(o.createdAt.toDate()))),
      yearly: calculate(orders.filter(o => o.createdAt && isThisYear(o.createdAt.toDate()))),
    };
  }, [orders]);

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);
      if (!seller) {
        batch.set(doc(firestore, 'sellers', sellerId), {
          id: sellerId, courseName: sellerId === 'demo-course' ? 'Demo Golf Course' : 'Sample Course',
          type: 'Private Golf Course', streetAddress: '123 Fairway Drive', city: 'Pebble Beach', state: 'CA', zip: '93953',
          latitude: 42.7748, longitude: -83.2139, contactName: 'Pro Shop Manager', contactEmail: 'manager@democourse.com',
          contactPhone: '555-0100', serviceFee: 2.50, status: 'Active'
        });
      }

      // Seed Menu Items
      mockMenuItems.forEach((item, index) => {
        const newItemRef = doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
        batch.set(newItemRef, { ...item, id: newItemRef.id, rank: index + 1 });
      });

      // Seed Members for Private Courses
      sampleMembers.forEach((member) => {
        const memberRef = doc(collection(firestore, 'sellers', sellerId, 'members'));
        batch.set(memberRef, { ...member, id: memberRef.id });
      });

      await batch.commit();
      toast({ title: "Database Initialized", description: "Demo course, menu, and members loaded." });
    } catch (e) { toast({ variant: "destructive", title: "Seeding Failed" }); }
    finally { setIsSeeding(false); }
  };

  const handleSeedMembers = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(firestore);
      sampleMembers.forEach((member) => {
        const memberRef = doc(collection(firestore, 'sellers', sellerId, 'members'));
        batch.set(memberRef, { ...member, id: memberRef.id });
      });
      await batch.commit();
      toast({ title: "Members Seeded", description: "Sample member list added for testing." });
    } catch (e) {
      toast({ variant: "destructive", title: "Seeding Failed" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveMenuItem = (data: MenuItemFormData) => {
    if (!firestore) return;
    const itemRef = editingItem ? doc(firestore, 'sellers', sellerId, 'menuItems', editingItem.id) : doc(collection(firestore, 'sellers', sellerId, 'menuItems'));
    const payload = editingItem ? data : { ...data, id: itemRef.id, rank: (menuItems?.length || 0) + 1 };
    setDoc(itemRef, payload, { merge: true }).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'write', requestResourceData: payload })));
    setEditingItem(null); setIsItemFormOpen(false);
  };

  const handleSaveMember = (data: MemberFormData) => {
    if (!firestore) return;
    const memberRef = editingMember ? doc(firestore, 'sellers', sellerId, 'members', editingMember.id) : doc(collection(firestore, 'sellers', sellerId, 'members'));
    const payload = { ...data, id: memberRef.id };
    setDoc(memberRef, payload, { merge: true }).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: memberRef.path, operation: 'write', requestResourceData: payload })));
    setEditingMember(null); setIsMemberFormOpen(false);
  };

  const handleDeleteMember = (id: string) => {
    if (!firestore) return;
    const ref = doc(firestore, 'sellers', sellerId, 'members', id);
    deleteDoc(ref).catch(err => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'delete' })));
  };

  const groupedItems = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  if (!isSellerLoading && !seller && sellerId === 'demo-course') {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
        <h1 className="font-headline text-3xl font-bold mb-2">Initialize Demo Course</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">Click below to set up the "Demo Golf Course" with sample menu items and a member list for testing.</p>
        <Button size="lg" onClick={handleSeedData} disabled={isSeeding}>{isSeeding ? 'Initializing...' : 'Set Up Demo Course'}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">Seller Admin - {seller?.courseName || sellerId}</h1>
        {seller && <Badge variant="outline" className="mt-1">{seller.type}</Badge>}
      </header>

      <section className="mb-12">
        <h2 className="font-headline text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Sales Data Dashboard</h2>
        <div className="flex flex-wrap gap-4">{dashboardStats ? (
          <>
            <StatTile title="Daily" {...dashboardStats.daily} />
            <StatTile title="This Month" {...dashboardStats.monthly} />
            <StatTile title="This Year" {...dashboardStats.yearly} />
          </>
        ) : <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>}</div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          {['All', ...categories].map((filter) => (
            <Button key={filter} variant={activeFilter === filter ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter(filter as any)} className="h-8">{filter}</Button>
          ))}
        </div>
        <Button onClick={() => { setEditingItem(null); setIsItemFormOpen(true); }} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Menu Item</Button>
      </div>

      <Card className="mb-12">
        <CardHeader><CardTitle>Menu Items</CardTitle></CardHeader>
        <CardContent>
          {areItemsLoading ? <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : menuItems && menuItems.length > 0 ? (
            <div className="space-y-6">
              {categories.filter(cat => activeFilter === 'All' || activeFilter === cat).map((category) => (groupedItems[category]?.length > 0 && (
                <div key={category}>
                  <h3 className="font-headline text-xl font-semibold mb-2">{category}</h3>
                  <Separator />
                  <div className="space-y-2 mt-4">
                    {groupedItems[category].sort((a,b) => a.rank - b.rank).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50 border border-transparent hover:border-border">
                        <div className="flex items-center gap-4"><GripVertical className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p></div></div>
                        <div className="flex items-center gap-2"><Badge variant="secondary" className="hidden sm:inline-flex">{item.category}</Badge><Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsItemFormOpen(true); }}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (!firestore) return; deleteDoc(doc(firestore, 'sellers', sellerId, 'menuItems', item.id)); }}><Trash2 className="h-4 w-4" /></Button></div>
                      </div>
                    ))}
                  </div>
                </div>
              )))}
            </div>
          ) : <div className="text-center py-12 text-muted-foreground">No menu items found.</div>}
        </CardContent>
      </Card>

      {isClubSeller && (
        <section className="mb-12">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Member Management</CardTitle>
                <CardDescription>Maintain your club member list for member-account charging.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {(!members || members.length === 0) && (
                   <Button variant="outline" size="sm" onClick={handleSeedMembers} disabled={isSeeding}>
                    <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                    Seed Sample Members
                  </Button>
                )}
                <Button onClick={() => { setEditingMember(null); setIsMemberFormOpen(true); }} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {areMembersLoading ? <Skeleton className="h-32 w-full" /> : members && members.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Member ID</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="font-mono text-xs">{m.memberNumber}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingMember(m); setIsMemberFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMember(m.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 opacity-20" />
                  <p>No members registered for this course.</p>
                  <p className="text-xs">Add members manually or use the "Seed Sample Members" button above.</p>
              </div>}
            </CardContent>
          </Card>
        </section>
      )}

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader><MenuItemForm onSave={handleSaveMenuItem} menuItem={editingItem} onClose={() => setIsItemFormOpen(false)} /></DialogContent></Dialog>
      <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{editingMember ? 'Edit Member' : 'Add Member'}</DialogTitle></DialogHeader><MemberForm onSave={handleSaveMember} member={editingMember} onClose={() => setIsMemberFormOpen(false)} /></DialogContent></Dialog>
    </div>
  );
}