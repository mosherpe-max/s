
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, addDoc, query, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Briefcase, 
  Target, 
  PhoneCall, 
  Mail, 
  MapPin, 
  Plus, 
  Filter, 
  Search, 
  ClipboardList, 
  DollarSign,
  Trash2,
  MessageSquare,
  Edit,
  Save,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn, getNumericOrderId } from '@/lib/utils';
import type { Prospect, SalesActivity, ProspectStage } from '@/lib/types';

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

const activitySchema = z.object({
  type: z.enum(['Call', 'Email', 'Visit', 'Meeting']),
  notes: z.string().min(5, 'Please provide more details about the activity'),
});

type ActivityFormData = z.infer<typeof activitySchema>;

export default function SalesCRMPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentRep = { id: 'rep-1', name: 'John Sales' };

  const prospectsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'prospects'), 
      where('assignedRepId', '==', currentRep.id)
    );
  }, [firestore, currentRep.id]);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'activities'), 
      where('repId', '==', currentRep.id)
    );
  }, [firestore, currentRep.id]);

  const { data: prospects, isLoading: isProspectsLoading } = useCollection<Prospect>(prospectsQuery);
  const { data: activities, isLoading: isActivitiesLoading } = useCollection<SalesActivity>(activitiesQuery);

  const filteredProspects = useMemo(() => {
    if (!prospects) return [];
    let list = prospects;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(p => 
        p.venueName.toLowerCase().includes(s) ||
        p.contactName.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  }, [prospects, searchTerm]);

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0));
  }, [activities]);

  const stats = useMemo(() => {
    if (!filteredProspects) return null;
    const closed = filteredProspects.filter(p => p.stage === 'Closed');
    const pipelineValue = filteredProspects.reduce((acc, p) => acc + (p.launchFeeQuoted || 0), 0);
    return {
      total: filteredProspects.length,
      closedCount: closed.length,
      pipelineValue,
    };
  }, [filteredProspects]);

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      venueName: '',
      venueType: 'Golf Course',
      stage: 'Contacted',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
      launchFeeQuoted: 0,
      monthlyFee: 0,
      estVolume: 0,
    },
  });

  const activityForm = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'Call',
      notes: '',
    },
  });

  const onSaveProspect = async (data: ProspectFormData) => {
    if (!firestore) return;
    setIsProcessing(true);
    const id = selectedProspect?.id || Math.random().toString(36).substr(2, 9);
    const prospectRef = doc(firestore, 'prospects', id);
    
    const payload = {
      ...data,
      id,
      assignedRepId: currentRep.id,
      assignedRepName: currentRep.name,
      updatedAt: serverTimestamp(),
      createdAt: selectedProspect?.createdAt || serverTimestamp(),
    };

    setDoc(prospectRef, payload, { merge: true })
      .then(() => {
        toast({ title: selectedProspect ? 'Prospect Updated' : 'Prospect Added' });
        setIsProspectDialogOpen(false);
        setSelectedProspect(null);
        form.reset();
      })
      .finally(() => setIsProcessing(false));
  };

  const onLogActivity = async (data: ActivityFormData) => {
    if (!firestore || !selectedProspect) return;
    setIsProcessing(true);
    const activityData = {
      prospectId: selectedProspect.id,
      venueName: selectedProspect.venueName,
      type: data.type,
      notes: data.notes,
      date: serverTimestamp(),
      repId: currentRep.id,
      repName: currentRep.name,
    };

    addDoc(collection(firestore, 'activities'), activityData)
      .then(() => {
        toast({ title: 'Activity Logged' });
        setIsActivityDialogOpen(false);
        activityForm.reset();
      })
      .finally(() => setIsProcessing(false));
  };

  const handleDeleteProspect = async (id: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'prospects', id))
      .then(() => toast({ title: 'Prospect Removed' }));
  };

  const getStageColor = (stage: ProspectStage) => {
    switch (stage) {
      case 'Contacted': return 'bg-slate-500';
      case 'Demo Scheduled': return 'bg-blue-500';
      case 'Proposal Sent': return 'bg-purple-500';
      case 'Closed': return 'bg-green-600';
      case 'Lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20 text-left">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-indigo-600">MY PIPELINE</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-200 text-indigo-700">
              Sales Rep View
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Welcome back, {currentRep.name}. Manage your active deals below.</p>
        </div>
        <Button onClick={() => { setSelectedProspect(null); form.reset(); setIsProspectDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest px-6 h-11">
          <Plus className="mr-2 h-4 w-4" /> Add New Prospect
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-sm border-2 border-indigo-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Target className="h-6 w-6" /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Prospects</p>
                <p className="text-2xl font-headline font-black">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl text-green-600"><Briefcase className="h-6 w-6" /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Venues Closed</p>
                <p className="text-2xl font-headline font-black text-green-600">{stats?.closedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-600"><DollarSign className="h-6 w-6" /></div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">My Pipeline Value</p>
                <p className="text-2xl font-headline font-black text-slate-700">${stats?.pipelineValue.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-11">
          <TabsTrigger value="pipeline" className="text-[10px] font-black uppercase tracking-widest px-8">Pipeline Registry</TabsTrigger>
          <TabsTrigger value="activity" className="text-[10px] font-black uppercase tracking-widest px-8">Recent Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search prospects by venue or contact..." 
                className="pl-10 h-11 border-2" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 border-2"><Filter className="h-4 w-4" /></Button>
          </div>

          <div className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase h-12 px-6">Establishment</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Decision Maker</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12">Stage</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12 text-right">Launch Quote</TableHead>
                  <TableHead className="text-[10px] font-black uppercase h-12 text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((prospect) => (
                  <TableRow key={prospect.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col text-left">
                        <span className="font-black text-sm text-[#213147] uppercase">{prospect.venueName}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5 text-primary" /> {prospect.venueType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-700">{prospect.contactName}</span>
                        <span className="text-[9px] font-medium text-muted-foreground flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" /> {prospect.contactEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[8px] font-black uppercase px-2 h-4", getStageColor(prospect.stage))}>
                        {prospect.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-black text-xs text-indigo-600">${prospect.launchFeeQuoted.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => { setSelectedProspect(prospect); setIsActivityDialogOpen(true); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => { setSelectedProspect(prospect); form.reset(prospect); setIsProspectDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProspect(prospect.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        {/* Activity Tab stays same */}
      </Tabs>

      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl text-left">
          <DialogHeader className="p-8 bg-indigo-600 text-white text-left">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl"><Target className="h-6 w-6 text-white" /></div>
              <div className="text-left">
                <DialogTitle className="font-headline font-black uppercase tracking-tight text-white text-xl">
                  {selectedProspect ? 'Modify Pipeline Record' : 'New CRM Prospect'}
                </DialogTitle>
                <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Lead & Quoting Registry</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSaveProspect)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="venueName" render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-[10px] font-black uppercase">Establishment Name</FormLabel>
                        <FormControl><Input {...field} className="h-12 border-2 font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="venueType" render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="text-[10px] font-black uppercase">Venue Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Golf Course">Golf Course</SelectItem>
                            <SelectItem value="Bowling Center">Bowling Center</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <FormField control={form.control} name="stage" render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel className="text-[10px] font-black uppercase">Pipeline Stage</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Contacted">Initial Outreach</SelectItem>
                          <SelectItem value="Demo Scheduled">Demo Pending</SelectItem>
                          <SelectItem value="Proposal Sent">Proposal Delivered</SelectItem>
                          <SelectItem value="Closed">Closed / Onboarding</SelectItem>
                          <SelectItem value="Lost">Lost Opportunity</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  
                  {/* Rest of form stays same */}
                  <Button type="submit" disabled={isProcessing} className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />} Synchronize Prospect Record
                  </Button>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Activity Dialog stays same */}
    </div>
  );
}
