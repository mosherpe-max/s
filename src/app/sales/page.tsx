
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, query, serverTimestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit,
  Save,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { Prospect } from '@/lib/types';

const prospectSchema = z.object({
  venueName: z.string().min(2, 'Venue name required'),
  venueType: z.enum(['Golf Course', 'Bowling Center']),
  stage: z.enum(['Contacted', 'Demo Scheduled', 'Proposal Sent', 'Closed', 'Lost']),
  contactName: z.string().min(2, 'Contact name required'),
  contactEmail: z.string().email('Valid email required'),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  launchFeeQuoted: z.coerce.number().min(0),
  monthlyFee: z.coerce.number().min(0),
  estVolume: z.coerce.number().min(0),
});

type ProspectFormData = z.infer<typeof prospectSchema>;

export default function SalesCRMPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const currentRep = { id: 'rep-1', name: 'John Sales' };

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'prospects'), where('assignedRepId', '==', currentRep.id));
  }, [firestore, currentRep.id]);

  const { data: prospects } = useCollection<Prospect>(prospectsQuery);

  const filteredProspects = useMemo(() => {
    if (!prospects) return [];
    let list = prospects;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => p.venueName.toLowerCase().includes(s) || p.contactName.toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  }, [prospects, searchTerm]);

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectSchema),
    defaultValues: { venueName: '', venueType: 'Golf Course', stage: 'Contacted', contactName: '', contactEmail: '', contactPhone: '', notes: '', launchFeeQuoted: 0, monthlyFee: 0, estVolume: 0 },
  });

  const onSaveProspect = async (data: ProspectFormData) => {
    if (!firestore) return;
    setIsProcessing(true);
    const id = selectedProspect?.id || Math.random().toString(36).substr(2, 9);
    const payload = { ...data, id, assignedRepId: currentRep.id, assignedRepName: currentRep.name, updatedAt: serverTimestamp(), createdAt: selectedProspect?.createdAt || serverTimestamp() };
    setDoc(doc(firestore, 'prospects', id), payload, { merge: true })
      .then(() => { toast({ title: selectedProspect ? 'Prospect Updated' : 'Prospect Added' }); setIsProspectDialogOpen(false); setSelectedProspect(null); form.reset(); })
      .finally(() => setIsProcessing(false));
  };

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20 text-left">
      <header className="flex justify-between items-center mb-8">
        <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-indigo-600">MY PIPELINE</h1>
        <Button onClick={() => { setSelectedProspect(null); form.reset(); setIsProspectDialogOpen(true); }} className="bg-indigo-600 font-black uppercase text-[10px] tracking-widest px-6 h-11"><Plus className="mr-2 h-4 w-4" /> Add Prospect</Button>
      </header>

      <div className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-6">Establishment</TableHead>
              <TableHead>Decision Maker</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProspects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="px-6 py-4"><p className="font-black text-sm">{p.venueName}</p><p className="text-[9px] uppercase text-muted-foreground">{p.venueType}</p></TableCell>
                <TableCell><p className="text-xs font-bold">{p.contactName}</p></TableCell>
                <TableCell><Badge className="text-[8px] font-black uppercase">{p.stage}</Badge></TableCell>
                <TableCell className="text-right px-8"><Button variant="ghost" size="icon" onClick={() => { setSelectedProspect(p); form.reset(p); setIsProspectDialogOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">Manage Prospect</DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSaveProspect)} className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="venueName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase">Establishment Name</FormLabel>
                      <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="venueType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase">Venue Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Golf Course">Golf Course</SelectItem>
                          <SelectItem value="Bowling Center">Bowling Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase">Pipeline Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
                        <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Prospect Record
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
