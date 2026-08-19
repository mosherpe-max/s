'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Library, 
  Plus, 
  UtensilsCrossed, 
  Tags, 
  Save, 
  Trash2, 
  Edit,
  Loader2,
  ChevronRight,
  Globe,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { StarterMenuItem, StarterModifierGroup } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

export default function GlobalLibrariesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('products');
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isModDialogOpen, setIsModDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<StarterMenuItem | null>(null);
  const [editingMod, setEditingMod] = useState<StarterModifierGroup | null>(null);

  const menuTemplatesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_menu_item_library') : null), [firestore]);
  const modTemplatesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'starter_modifier_library') : null), [firestore]);

  const { data: menuTemplates, isLoading: isMenuLoading } = useCollection<StarterMenuItem>(menuTemplatesQuery);
  const { data: modTemplates, isLoading: isModLoading } = useCollection<StarterModifierGroup>(modTemplatesQuery);

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsProcessing(true);
    
    const formData = new FormData(e.currentTarget);
    const id = editingItem?.id || formData.get('name')?.toString().toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9);
    
    const data: any = {
      id,
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price') as string) || 0,
      category: formData.get('category'),
      venueType: (formData.get('venueType') as string).split(','),
      serviceMode: formData.get('serviceMode'),
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      imageUrl: formData.get('imageUrl'),
      updatedAt: serverTimestamp()
    };

    setDoc(doc(firestore, 'starter_menu_item_library', id), data, { merge: true })
      .then(() => {
        toast({ title: "Template Saved" });
        setIsItemDialogOpen(false);
        setEditingItem(null);
      })
      .finally(() => setIsProcessing(false));
  };

  const handleSaveMod = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;
    setIsProcessing(true);
    
    const formData = new FormData(e.currentTarget);
    const id = editingMod?.id || formData.get('name')?.toString().toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 9);
    
    const data: any = {
      id,
      name: formData.get('name'),
      venueType: (formData.get('venueType') as string).split(','),
      category: formData.get('category'),
      selectionType: formData.get('selectionType'),
      required: formData.get('required') === 'on',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      updatedAt: serverTimestamp()
    };

    setDoc(doc(firestore, 'starter_modifier_library', id), data, { merge: true })
      .then(() => {
        toast({ title: "Modifier Template Saved" });
        setIsModDialogOpen(false);
        setEditingMod(null);
      })
      .finally(() => setIsProcessing(false));
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Library className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black uppercase text-[#213147]">Global Template Libraries</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Industry-Standard Starter Kits</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full">
        <Tabs defaultValue="products" className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
              <TabsTrigger value="products" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase text-[10px] font-black tracking-widest gap-2">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Products
              </TabsTrigger>
              <TabsTrigger value="modifiers" className="px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase text-[10px] font-black tracking-widest gap-2">
                <Tags className="h-3.5 w-3.5" /> Modifiers
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => activeTab === 'products' ? setIsItemDialogOpen(true) : setIsModDialogOpen(true)} className="bg-primary font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl gap-2 shadow-lg">
              <Plus className="h-4 w-4" /> Create {activeTab === 'products' ? 'Product' : 'Modifier'} Template
            </Button>
          </div>

          <TabsContent value="products" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Item Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Category</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Markets</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Default Service</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Price</TableHead>
                    <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMenuLoading ? (
                    <TableRow><TableCell colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : (menuTemplates || []).length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-40 text-center text-muted-foreground uppercase text-[10px] font-black opacity-30">No global products configured</TableCell></TableRow>
                  ) : (menuTemplates || []).map(item => (
                    <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-8 py-4">
                        <p className="font-black text-sm uppercase text-[#213147]">{item.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase truncate max-w-xs">{item.description}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100">{item.category}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(item.venueType || []).map(v => <Badge key={v} className="bg-indigo-600 text-white text-[7px] font-black uppercase h-4 px-1.5">{v}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell><Badge className="bg-[#213147] text-white text-[8px] font-black uppercase">{item.serviceMode}</Badge></TableCell>
                      <TableCell className="font-mono font-black text-sm text-primary">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsItemDialogOpen(true); }} className="h-8 w-8 hover:text-primary"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(firestore!, 'starter_menu_item_library', item.id))} className="h-8 w-8 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="modifiers" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Group Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Target Markets</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isModLoading ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" /></TableCell></TableRow>
                  ) : (modTemplates || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-40 text-center text-muted-foreground uppercase text-[10px] font-black opacity-30">No global modifiers configured</TableCell></TableRow>
                  ) : (modTemplates || []).map(mod => (
                    <TableRow key={mod.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-8 py-4">
                        <p className="font-black text-sm uppercase text-[#213147]">{mod.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Global ID: {mod.id}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(mod.venueType || []).map(v => <Badge key={v} className="bg-indigo-600 text-white text-[7px] font-black uppercase h-4 px-1.5">{v}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100">{mod.selectionType}</Badge></TableCell>
                      <TableCell><Badge className={cn("text-[8px] font-black uppercase border-0", mod.required ? "bg-primary" : "bg-slate-500")}>{mod.required ? 'REQUIRED' : 'OPTIONAL'}</Badge></TableCell>
                      <TableCell className="text-right px-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingMod(mod); setIsModDialogOpen(true); }} className="h-8 w-8 hover:text-primary"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(firestore!, 'starter_modifier_library', mod.id))} className="h-8 w-8 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ITEM DIALOG */}
      <Dialog open={isItemDialogOpen} onOpenChange={(o) => { setIsItemDialogOpen(o); if (!o) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">{editingItem ? 'Edit Product Template' : 'New Product Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem}>
            <ScrollArea className="max-h-[70vh]">
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Template Name</Label><Input name="name" defaultValue={editingItem?.name} required className="h-11 border-2 font-bold" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Description</Label><Input name="description" defaultValue={editingItem?.description} className="h-11 border-2 font-bold" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Category</Label><Input name="category" defaultValue={editingItem?.category} required className="h-11 border-2 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Price</Label><Input name="price" type="number" step="0.01" defaultValue={editingItem?.price} required className="h-11 border-2 font-bold" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Markets (Comma Sep)</Label><Input name="venueType" defaultValue={editingItem?.venueType?.join(',')} placeholder="golf,bowling" required className="h-11 border-2 font-bold" /></div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase">Initial Service Mode</Label>
                       <Select name="serviceMode" defaultValue={editingItem?.serviceMode || 'beverageCart'}>
                          <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                             <SelectItem value="beverageCart">Beverage Cart</SelectItem>
                             <SelectItem value="clubhouse">Clubhouse</SelectItem>
                             <SelectItem value="laneService">Lane Delivery</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Image URL</Label><Input name="imageUrl" defaultValue={editingItem?.imageUrl} className="h-11 border-2 font-bold" /></div>
                </div>
              </div>
            </ScrollArea>
            <div className="p-8 pt-0">
               <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
                 {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Template
               </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MOD DIALOG */}
      <Dialog open={isModDialogOpen} onOpenChange={(o) => { setIsModDialogOpen(o); if (!o) setEditingMod(null); }}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">Modifier Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMod}>
            <div className="p-8 space-y-6">
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Group Name</Label><Input name="name" defaultValue={editingMod?.name} required className="h-11 border-2 font-bold" /></div>
               <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Markets (Comma Sep)</Label><Input name="venueType" defaultValue={editingMod?.venueType?.join(',')} placeholder="golf,bowling" required className="h-11 border-2 font-bold" /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Selection Type</Label>
                    <Select name="selectionType" defaultValue={editingMod?.selectionType || 'single'}>
                      <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="multi">Multi</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Req. Entry</Label>
                    <div className="flex items-center gap-2 h-11 px-3 border-2 rounded-lg bg-slate-50">
                       <Checkbox name="required" defaultChecked={editingMod?.required} />
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">Required</span>
                    </div>
                  </div>
               </div>
               <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-indigo-600 font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl rounded-2xl">
                 {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Save Global Modifier
               </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
