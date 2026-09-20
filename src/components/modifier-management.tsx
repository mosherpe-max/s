'use client';

import { useState } from 'react';
import { collection, doc, deleteDoc, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, SlidersHorizontal, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { ModifierGroup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StarterModifierPicker } from '@/components/starter-modifier-picker';
import { Library } from 'lucide-react';

interface ModifierManagementProps {
  sellerId: string;
  venueType: 'golf' | 'bowling';
}

const optionSchema = z.object({
  name: z.string().min(1, 'Option name required'),
  priceAdjustment: z.coerce.number(),
  isAvailable: z.boolean().default(true),
});

const modifierGroupSchema = z.object({
  name: z.string().min(2, 'Name required'),
  minSelection: z.coerce.number().min(0),
  maxSelection: z.coerce.number().min(1),
  options: z.array(optionSchema).min(1, 'At least one option required'),
});

type ModifierGroupFormData = z.infer<typeof modifierGroupSchema>;

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const emptyOption = { name: '', priceAdjustment: 0, isAvailable: true };

export function ModifierManagement({ sellerId, venueType }: ModifierManagementProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ModifierGroup | null>(null);

  const groupsQuery = useMemoFirebase(() => (
    firestore ? query(collection(firestore, 'modifier_groups'), where('sellerId', '==', sellerId)) : null
  ), [firestore, sellerId]);
  const { data: groups, isLoading } = useCollection<ModifierGroup>(groupsQuery);

  const form = useForm<ModifierGroupFormData>({
    resolver: zodResolver(modifierGroupSchema),
    defaultValues: { name: '', minSelection: 0, maxSelection: 1, options: [emptyOption] }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' });

  const openCreateForm = () => {
    setEditingGroup(null);
    form.reset({ name: '', minSelection: 0, maxSelection: 1, options: [emptyOption] });
    setIsFormOpen(true);
  };

  const openEditForm = (group: ModifierGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      options: group.options.map(o => ({ name: o.name, priceAdjustment: o.priceAdjustment, isAvailable: o.isAvailable !== false })),
    });
    setIsFormOpen(true);
  };

  const onSave = (data: ModifierGroupFormData) => {
    if (!firestore) return;
    setIsSaving(true);
    // Deterministic ID (sellerId + slugified name), same convention the
    // Koop-admin "Clone Modifiers" cloner uses - keeps venue-created and
    // cloned groups compatible with the same modifier_groups collection.
    const groupId = editingGroup?.id || `${sellerId}-${slugify(data.name)}`;
    const docRef = doc(firestore, 'modifier_groups', groupId);
    const payload = {
      id: groupId,
      sellerId,
      name: data.name,
      minSelection: data.minSelection,
      maxSelection: data.maxSelection,
      options: data.options.map((o, index) => ({
        id: editingGroup?.options[index]?.id || slugify(o.name),
        name: o.name,
        priceAdjustment: o.priceAdjustment,
        isAvailable: o.isAvailable,
      })),
      createdAt: editingGroup?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    setDoc(docRef, payload, { merge: true })
      .then(() => {
        toast({ title: editingGroup ? 'Modifier Updated' : 'Modifier Created' });
        setIsFormOpen(false);
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: editingGroup ? 'update' : 'create',
          requestResourceData: payload,
        } satisfies SecurityRuleContext));
      })
      .finally(() => setIsSaving(false));
  };

  const confirmDelete = () => {
    if (!firestore || !groupToDelete) return;
    const docRef = doc(firestore, 'modifier_groups', groupToDelete.id);
    deleteDoc(docRef)
      .then(() => toast({ title: 'Modifier Deleted' }))
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext));
      })
      .finally(() => setGroupToDelete(null));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><SlidersHorizontal className="h-6 w-6 text-primary" /></div>
          <div className="text-left">
            <h2 className="text-xl font-black uppercase text-[#213147]">Modifiers</h2>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Add-on Groups & Options</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StarterModifierPicker
            sellerId={sellerId}
            venueType={venueType}
            trigger={
              <Button variant="outline" className="font-black uppercase text-xs tracking-widest rounded-xl h-11 px-6 gap-2 border-2">
                <Library className="h-4 w-4" /> Import From Library
              </Button>
            }
          />
          <Button onClick={openCreateForm} className="bg-[#213147] font-black uppercase text-xs tracking-widest shadow-lg rounded-xl h-11 px-6">
            <Plus className="h-4 w-4 mr-2" /> Add Modifier Group
          </Button>
        </div>
      </div>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Selection</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Options</TableHead>
              <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(groups || []).map(group => (
              <TableRow key={group.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8 font-bold text-sm uppercase">{group.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-50 border-slate-200">
                    {group.minSelection > 0 ? 'Required' : 'Optional'} · {group.maxSelection === 1 ? 'Single' : 'Multi'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {group.options.map(opt => (
                      <Badge key={opt.id} variant="outline" className={cn("text-[8px] font-bold bg-slate-50 border-slate-200", opt.isAvailable === false && "opacity-40 line-through")}>
                        {opt.name}{opt.priceAdjustment ? ` +$${opt.priceAdjustment.toFixed(2)}` : ''}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right px-8">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(group)} className="h-8 w-8 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setGroupToDelete(group)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (groups || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground text-sm font-bold uppercase">
                  No modifier groups yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent closeClassName="text-white hover:text-white/80" className="max-w-lg rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left max-h-[90vh] flex flex-col">
          <DialogHeader className="p-8 bg-[#213147] text-white shrink-0">
            <DialogTitle className="font-headline font-black uppercase text-xl">{editingGroup ? 'Edit Modifier Group' : 'New Modifier Group'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-8 space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase">Group Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Choose Your Side" className="h-11 border-2 font-bold" /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="minSelection" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase">Min Required</FormLabel>
                    <FormControl><Input {...field} type="number" min={0} className="h-11 border-2 font-bold" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="maxSelection" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase">Max Allowed</FormLabel>
                    <FormControl><Input {...field} type="number" min={1} className="h-11 border-2 font-bold" /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[9px] font-black uppercase">Options</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={() => append(emptyOption)} className="h-8 text-[9px] font-black uppercase gap-1">
                    <Plus className="h-3 w-3" /> Add Option
                  </Button>
                </div>
                {fields.map((optionField, index) => (
                  <div key={optionField.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                    <FormField control={form.control} name={`options.${index}.name`} render={({ field }) => (
                      <FormItem className="flex-1"><FormControl><Input {...field} placeholder="Option name" className="h-9 bg-white border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`options.${index}.priceAdjustment`} render={({ field }) => (
                      <FormItem className="w-24"><FormControl><Input {...field} type="number" step="0.01" placeholder="+$0.00" className="h-9 bg-white border-2 font-bold" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`options.${index}.isAvailable`} render={({ field }) => (
                      <FormItem className="shrink-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                    )} />
                    <Button type="button" variant="ghost" size="icon" disabled={fields.length === 1} onClick={() => remove(index)} className="h-9 w-9 shrink-0 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

            </div>
            </div>
            <div className="p-8 pt-0 shrink-0">
              <Button type="submit" disabled={isSaving} className="w-full h-12 font-black uppercase tracking-widest">
                {isSaving ? 'Saving...' : editingGroup ? 'Save Changes' : 'Create Modifier Group'}
              </Button>
            </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="uppercase font-black text-[#213147]">Delete Modifier Group?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{groupToDelete?.name}&quot; will be removed. Menu items referencing it will no longer show these options.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setGroupToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
