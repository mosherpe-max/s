'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store, 
  ExternalLink,
  Edit,
  Loader2,
  Save,
  DollarSign,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Seller, Venue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const venueRegistrySchema = z.object({
  name: z.string().min(2, 'Name required'),
  solutionFeeFixed: z.coerce.number().min(0),
  solutionFeePercent: z.coerce.number().min(0),
  patronConvenienceFee: z.coerce.number().min(0),
  monthlySolutionFee: z.coerce.number().min(0),
  isFoundingPartner: z.boolean().default(false),
  stripeOnboardingComplete: z.boolean().default(false),
  payoutsEnabled: z.boolean().default(false),
});

type VenueRegistryData = z.infer<typeof venueRegistrySchema>;

export default function AdminVenueRegistryPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const sellersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'venues') : null), [firestore]);

  const { data: sellers } = useCollection<Seller>(sellersQuery);
  const { data: venuesRegistry } = useCollection<Venue>(venuesQuery);

  const registryForm = useForm<VenueRegistryData>({
    resolver: zodResolver(venueRegistrySchema),
    defaultValues: {
      name: '',
      solutionFeeFixed: 0,
      solutionFeePercent: 0,
      patronConvenienceFee: 0,
      monthlySolutionFee: 0,
      isFoundingPartner: false,
      stripeOnboardingComplete: false,
      payoutsEnabled: false,
    }
  });

  const handleEditVenue = (venueId: string) => {
    const reg = venuesRegistry?.find(v => v.venueId === venueId);
    if (reg) {
      setSelectedVenue(reg);
      registryForm.reset({
        name: reg.name,
        solutionFeeFixed: reg.solutionFeeFixed || 0,
        solutionFeePercent: reg.solutionFeePercent || 0,
        patronConvenienceFee: reg.patronConvenienceFee || 0,
        monthlySolutionFee: reg.monthlySolutionFee || 0,
        isFoundingPartner: !!reg.isFoundingPartner,
        stripeOnboardingComplete: !!reg.stripeOnboardingComplete,
        payoutsEnabled: !!reg.payoutsEnabled,
      });
      setIsManagementOpen(true);
    } else {
      toast({ variant: "destructive", title: "Registry Not Found", description: "This seller does not have a linked business registry." });
    }
  };

  const onSaveVenueRegistry = async (data: VenueRegistryData) => {
    if (!firestore || !selectedVenue) return;
    setIsProcessing(true);
    const venueRef = doc(firestore, 'venues', selectedVenue.venueId);
    updateDoc(venueRef, { ...data, updatedAt: serverTimestamp() })
      .then(() => {
        toast({ title: "Registry Synchronized" });
        setIsManagementOpen(false);
      })
      .finally(() => setIsProcessing(false));
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase text-[#213147]">Establishment Registry</h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Establishment</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Business Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Digital Payments</TableHead>
              <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(sellers || []).map(v => {
              const registry = venuesRegistry?.find(r => r.venueId === v.id);
              return (
                <TableRow key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-4">
                    <p className="font-black text-sm uppercase">{v.courseName}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">{v.city}, {v.state}</p>
                  </TableCell>
                  <TableCell><Badge className="bg-[#213147] text-white text-[8px] font-black uppercase border-0">{v.type}</Badge></TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1">
                        <Badge variant={v.status === 'Active' ? 'default' : 'outline'} className={cn("text-[8px] font-black uppercase w-fit", v.status === 'Active' ? "bg-green-500" : "text-slate-400")}>Operational: {v.status}</Badge>
                        {registry?.isFoundingPartner && <Badge className="bg-amber-500 text-white text-[7px] font-black uppercase w-fit">Founding Partner</Badge>}
                     </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {registry?.stripeOnboardingComplete ? (
                        <Badge className="bg-emerald-500 text-white border-0 text-[7px] font-black uppercase">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[7px] font-black uppercase text-amber-600 border-amber-200 bg-amber-50">Pending Stripe</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <div className="flex justify-end gap-2">
                       <Button variant="outline" size="sm" onClick={() => handleEditVenue(v.id)} className="h-8 text-[9px] font-black uppercase tracking-widest border-2 gap-1.5">
                          <DollarSign className="h-3 w-3" /> Financials
                       </Button>
                       <Button variant="ghost" size="sm" asChild className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5">
                          <a href={`/sellers/${v.id}`} target="_blank">
                             Portal <ExternalLink className="h-3 w-3" />
                          </a>
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isManagementOpen} onOpenChange={setIsManagementOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">Financial Registry</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8">
               <Form {...registryForm}>
                 <form onSubmit={registryForm.handleSubmit(onSaveVenueRegistry)} className="space-y-8">
                    <div className="space-y-6">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><DollarSign className="h-3 w-3" /> Transaction Model</Label>
                       <div className="grid grid-cols-2 gap-4">
                          <FormField control={registryForm.control} name="solutionFeeFixed" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">Koop Fixed Fee (Cents)</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                          <FormField control={registryForm.control} name="solutionFeePercent" render={({ field }) => (
                            <FormItem><FormLabel className="text-[9px] font-black uppercase">Koop % Fee</FormLabel><FormControl><Input {...field} type="number" step="0.1" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                          )} />
                       </div>
                       <FormField control={registryForm.control} name="patronConvenienceFee" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase">Patron Convenience Fee (Cents)</FormLabel>
                          <FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase mt-1">THE FEE CHARGED TO THE PATRON AT CHECKOUT</p>
                        </FormItem>
                       )} />
                    </div>

                    <div className="space-y-6 pt-6 border-t">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Zap className="h-3 w-3" /> SaaS Subscription</Label>
                       <FormField control={registryForm.control} name="monthlySolutionFee" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Monthly Solution Fee ($)</FormLabel><FormControl><Input {...field} type="number" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                       )} />
                    </div>

                    <div className="space-y-4 pt-6 border-t">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> Partner Status</Label>
                       <div className="grid gap-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                             <span className="text-[10px] font-black uppercase text-[#213147]">Founding Partner</span>
                             <FormField control={registryForm.control} name="isFoundingPartner" render={({ field }) => (
                               <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" />
                             )} />
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-100">
                             <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-[#213147]">Stripe Onboarded</span><span className="text-[8px] font-bold text-muted-foreground uppercase">FORCE OVERRIDE</span></div>
                             <FormField control={registryForm.control} name="stripeOnboardingComplete" render={({ field }) => (
                               <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-green-500" />
                             )} />
                          </div>
                       </div>
                    </div>

                    <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Financial Registry
                    </Button>
                 </form>
               </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
