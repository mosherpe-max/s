
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, addDoc, query, orderBy, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Briefcase, 
  Target, 
  PhoneCall, 
  Mail, 
  MapPin, 
  TrendingUp, 
  Plus, 
  Filter, 
  Search, 
  ClipboardList, 
  DollarSign,
  Trash2,
  MessageSquare,
  Edit,
  User
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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
      list = list.filter(p => 
        p.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contactName.toLowerCase().includes(searchTerm.toLowerCase())
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
      });
  };

  const onLogActivity = async (data: ActivityFormData) => {
    if (!firestore || !selectedProspect) return;
    
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
      });
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

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-40" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => <Skeleton key={`stat-skel-${i}`} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-indigo-600">MY PIPELINE</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-200 text-indigo-700">
              Sales Rep View
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Welcome back, {currentRep.name}. Manage your active deals below.</p>
        </div>
        <Button onClick={() => { setSelectedProspect(null); form.reset(); setIsProspectDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" /> Add New Prospect
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-sm border-2 border-indigo-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl"><Target className="h-6 w-6 text-indigo-600" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Prospects</p>
                <p className="text-2xl font-headline font-black">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl"><Briefcase className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Venues Closed</p>
                <p className="text-2xl font-headline font-black text-green-600">{stats?.closedCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl"><DollarSign className="h-6 w-6 text-slate-600" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">My Pipeline Value</p>
                <p className="text-2xl font-headline font-black text-slate-700">${stats?.pipelineValue.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="pipeline" className="text-[10px] font-black uppercase tracking-widest px-6">Pipeline</TabsTrigger>
          <TabsTrigger value="activity" className="text-[10px] font-black uppercase tracking-widest px-6">My Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search prospects..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {isProspectsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={`p-skel-${i}`} className="h-32 w-full rounded-xl" />)
            ) : filteredProspects.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground bg-white">
                <Target className="h-12 w-12 opacity-10 mx-auto mb-4" />
                <p className="font-medium">You don't have any prospects yet.</p>
                <Button variant="link" onClick={() => setIsProspectDialogOpen(true)}>Add your first venue</Button>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase">Venue</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Contact</TableHead>
                      <TableHead className="text-[10px] font-black uppercase">Stage</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right">Quote</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProspects.map((prospect) => (
                      <TableRow key={prospect.id} className="group">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{prospect.venueName}</span>
                            <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {prospect.venueType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{prospect.contactName}</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {prospect.contactEmail}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[8px] font-black uppercase px-2", getStageColor(prospect.stage))}>
                            {prospect.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-bold text-xs">${prospect.launchFeeQuoted.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => { setSelectedProspect(prospect); setIsActivityDialogOpen(true); }}>
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedProspect(prospect); form.reset(prospect); setIsProspectDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProspect(prospect.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-4">
            {isActivitiesLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={`act-skel-${i}`} className="h-24 w-full rounded-xl" />)
            ) : sortedActivities && sortedActivities.length > 0 ? (
              <div className="space-y-3">
                {sortedActivities.map((activity) => (
                  <Card key={activity.id} className="shadow-sm border-l-4 border-l-indigo-500 overflow-hidden bg-white">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                            {activity.type === 'Call' && <PhoneCall className="h-4 w-4" />}
                            {activity.type === 'Email' && <Mail className="h-4 w-4" />}
                            {activity.type === 'Visit' && <MapPin className="h-4 w-4" />}
                            {activity.type === 'Meeting' && <Briefcase className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold uppercase tracking-tight">{activity.venueName}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{activity.type} Logged</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {activity.date ? format(activity.date.toDate(), 'MMM d, h:mm a') : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-12">{activity.notes}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground bg-white">
                <ClipboardList className="h-12 w-12 opacity-10 mx-auto mb-4" />
                <p>You haven't logged any activities yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase text-indigo-600">{selectedProspect ? 'Edit Prospect' : 'Add New Prospect'}</DialogTitle>
            <DialogDescription>Track deal stages and venue details for your pipeline.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSaveProspect)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="venueName" render={({ field }) => (
                  <FormItem><FormLabel>Venue Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="venueType" render={({ field }) => (
                  <FormItem><FormLabel>Venue Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Golf Course">Golf Course</SelectItem><SelectItem value="Bowling Center">Bowling Center</SelectItem></SelectContent></Select></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="stage" render={({ field }) => (
                <FormItem><FormLabel>Sales Stage</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Contacted">Contacted</SelectItem><SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem><SelectItem value="Proposal Sent">Proposal Sent</SelectItem><SelectItem value="Closed">Closed</SelectItem><SelectItem value="Lost">Lost</SelectItem></SelectContent></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem><FormLabel>Decision Maker</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                <FormField control={form.control} name="launchFeeQuoted" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Launch Fee ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="monthlyFee" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Monthly ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="estVolume" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black uppercase">Est. Monthly Vol ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Prospect Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">Save Prospect</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline uppercase text-indigo-600">Log Interaction</DialogTitle>
            <DialogDescription>Recording interaction with {selectedProspect?.venueName}</DialogDescription>
          </DialogHeader>
          <Form {...activityForm}>
            <form onSubmit={activityForm.handleSubmit(onLogActivity)} className="space-y-4 pt-2">
              <FormField control={activityForm.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Action Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Visit">On-site Visit</SelectItem><SelectItem value="Meeting">Meeting</SelectItem></SelectContent></Select></FormItem>
              )} />
              <FormField control={activityForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} placeholder="What was discussed?" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Log Action</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
