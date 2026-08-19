'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Search, 
  Edit,
  Save,
  Loader2,
  Target,
  User,
  Store,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

const leadSchema = z.object({
  venueName: z.string().min(2, 'Venue name required'),
  venueType: z.enum(['Golf Course', 'Bowling Center']),
  stage: z.enum(['Cold Lead', 'On-Site Meeting', 'Demo', 'Offer', 'Closed', 'Dead']),
  streetAddress: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  zip: z.string().default(''),
  county: z.string().default(''),
  contactName: z.string().min(2, 'Contact name required'),
  phone: z.string().default(''),
  email: z.string().email('Valid email required'),
});

type LeadFormData = z.infer<typeof leadSchema>;

export default function AdminSalesCRMPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  const leadsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'leads') : null), [firestore]);
  const { data: leads } = useCollection<Lead>(leadsQuery);

  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      venueName: '',
      venueType: 'Golf Course',
      stage: 'Cold Lead',
      streetAddress: '',
      city: '',
      state: '',
      zip: '',
      county: '',
      contactName: '',
      phone: '',
      email: '',
    }
  });

  const handleSaveLead = async (data: LeadFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingLead?.id || Math.random().toString(36).substr(2, 9);
    const finalData = { 
      ...data, 
      id, 
      updatedAt: serverTimestamp(), 
      createdAt: editingLead?.createdAt || serverTimestamp() 
    };
    
    setDoc(doc(firestore, 'leads', id), finalData, { merge: true })
      .then(() => { 
        toast({ title: editingLead ? "Lead Updated" : "Lead Created" }); 
        setIsLeadFormOpen(false); 
        setEditingLead(null); 
      })
      .finally(() => setIsProcessingSave(false));
  };

  const filteredLeads = (leads || [])
    .filter(l => l.venueName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-left">
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black uppercase text-[#213147]">Sales CRM</h2>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 border-2 rounded-xl w-64" />
          </div>
          <Button onClick={() => { setEditingLead(null); leadForm.reset(); setIsLeadFormOpen(true); }} className="bg-primary uppercase font-black text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> New Lead</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Venue</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Contact</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Stage</TableHead>
              <TableHead className="text-right px-8 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-40 text-center text-muted-foreground uppercase text-[10px] font-black opacity-40">No leads found in pipeline</TableCell></TableRow>
            ) : (
              filteredLeads.map(lead => (
                <TableRow key={lead.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-4">
                    <p className="font-black text-sm">{lead.venueName}</p>
                    <p className="text-[9px] uppercase text-muted-foreground">{lead.city}, {lead.state}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-xs">{lead.contactName}</p>
                    <p className="text-[9px] text-muted-foreground">{lead.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-slate-100">{lead.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-8">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingLead(lead); leadForm.reset(lead); setIsLeadFormOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
        <DialogContent className="sm:max-w-[750px] rounded-[2rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-[#213147] text-white">
            <DialogTitle className="font-headline font-black uppercase text-xl">{editingLead ? 'Modify Prospect' : 'New CRM Prospect'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8">
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(handleSaveLead)} className="space-y-10">
                  <div className="space-y-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Store className="h-3 w-3" /> Core Lead Info</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={leadForm.control} name="venueName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Name</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="venueType" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Venue Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent>
                        </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={leadForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">City</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                      <FormField control={leadForm.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px] font-black uppercase">State</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={leadForm.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel className="text-[9px] font-black uppercase">Zip</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><User className="h-3 w-3" /> Identity & Ownership</Label>
                     <div className="grid grid-cols-2 gap-4">
                       <FormField control={leadForm.control} name="contactName" render={({ field }) => (
                         <FormItem><FormLabel className="text-[9px] font-black uppercase">Primary Contact</FormLabel><FormControl><Input {...field} className="h-11 border-2 font-bold" /></FormControl></FormItem>
                       )} />
                       <FormField control={leadForm.control} name="email" render={({ field }) => (
                         <FormItem><FormLabel className="text-[9px] font-black uppercase">Email Address</FormLabel><FormControl><Input {...field} type="email" className="h-11 border-2 font-bold" /></FormControl></FormItem>
                       )} />
                     </div>
                  </div>

                  <FormField control={leadForm.control} name="stage" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase">Lead Stage</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cold Lead">Cold Lead</SelectItem>
                          <SelectItem value="On-Site Meeting">On-Site Meeting</SelectItem>
                          <SelectItem value="Demo">Demo</SelectItem>
                          <SelectItem value="Offer">Offer</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Dead">Dead</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={isProcessingSave} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessingSave ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize CRM Record
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
