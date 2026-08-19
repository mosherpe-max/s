'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Store, 
  Plus,
  Loader2,
  Settings2,
  MapPin,
  LogOut,
  Users,
  Save,
  LayoutDashboard,
  Activity,
  Trash2,
  Edit,
  PanelLeft,
  ChevronRightSquare,
  Target,
  User,
  Search,
  Image as LucideImage
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
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Seller, Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, SUPER_ADMIN_ID, getNumericOrderId } from '@/lib/utils';
import { StylizedKoopLogo } from '@/components/header';
import { useIsMobile } from '@/hooks/use-mobile';
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
  marketFitData: z.object({
    golf: z.object({
      hasBevCart: z.boolean().default(false),
      hasClubhouseKitchen: z.boolean().default(false),
      roundsAnnually: z.coerce.number().default(0),
      bevCartAnnualRevenue: z.coerce.number().default(0),
    }).optional(),
    bowling: z.object({
      hasBar: z.boolean().default(false),
      hasKitchen: z.boolean().default(false),
      lanesCount: z.coerce.number().default(0),
      fbAnnualRevenue: z.coerce.number().default(0),
    }).optional(),
  }).default({}),
});

type LeadFormData = z.infer<typeof leadSchema>;

function KPICard({ label, value, sub, icon: Icon, colorClass }: { label: string, value: string | number, sub: string, icon: any, colorClass?: string }) {
  return (
    <Card className="border-2 shadow-sm overflow-hidden relative h-full">
      <div className={cn("absolute top-0 left-0 bottom-0 w-1.5", colorClass)} />
      <CardHeader className="pb-2 pt-5 px-6">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-5 px-6 text-left">
        <div className="text-3xl font-black font-headline tracking-tighter text-[#213147] mb-1">{value}</div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{sub}</p>
      </CardContent>
    </Card>
  );
}

function NavButton({ id, label, icon: Icon, active, onClick, sidebarOpen }: { 
  id: string, label: string, icon: any, active: boolean, onClick: (id: string) => void, sidebarOpen: boolean 
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative text-left",
        active ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "group-hover:text-white")} />
      {sidebarOpen && <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", active ? "text-primary" : "")}>{label}</span>}
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
    </button>
  );
}

export default function SolutionAdminPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');
  const [isProcessingSave, setIsProcessingSave] = useState(false);

  const leadsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'leads') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);

  const { data: leads } = useCollection<Lead>(leadsQuery);
  const { data: venues } = useCollection<Seller>(venuesQuery);

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
      marketFitData: {}
    }
  });

  const handleSaveLead = async (data: LeadFormData) => {
    if (!firestore) return;
    setIsProcessingSave(true);
    const id = editingLead?.id || Math.random().toString(36).substr(2, 9);
    const finalData = { ...data, id, updatedAt: serverTimestamp(), createdAt: editingLead?.createdAt || serverTimestamp() };
    setDoc(doc(firestore, 'leads', id), finalData, { merge: true })
      .then(() => { toast({ title: editingLead ? "Lead Updated" : "Lead Created" }); setIsLeadFormOpen(false); setEditingLead(null); })
      .finally(() => setIsProcessingSave(false));
  };

  const handleLogout = async () => { if (!auth) return; await signOut(auth); router.push('/login'); };

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || user?.email === 'mosherpe@gmail.com';
  if (isUserLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  if (!user || !isSuperAdmin) return null;

  const filteredLeads = (leads || []).filter(l => l.venueName.toLowerCase().includes(leadSearchTerm.toLowerCase())).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

  const NAV_ITEMS = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "sales", label: "Sales CRM", icon: Target },
    { id: "venues", label: "Venues", icon: Store },
    { id: "system", label: "System", icon: Settings2 }
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-left">
       <aside className={cn("bg-[#213147] hidden md:flex flex-col transition-all duration-300 relative border-r-4 border-primary/20 shrink-0", sidebarOpen ? "w-64" : "w-20")}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            {sidebarOpen && <StylizedKoopLogo size="md" />}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/20 hover:text-white mx-auto">
              {sidebarOpen ? <PanelLeft className="h-4 w-4" /> : <ChevronRightSquare className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
             <nav className="space-y-1">
               {NAV_ITEMS.map((item) => (
                 <NavButton key={item.id} id={item.id} label={item.label} icon={item.icon} active={activeNav === item.id} onClick={setActiveNav} sidebarOpen={sidebarOpen} />
               ))}
             </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8">
             <div className="max-w-7xl mx-auto space-y-8">
               {activeNav === 'dashboard' && (
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard label="Total Venues" value={venues?.length || 0} sub="Onboarded Partners" icon={Store} colorClass="bg-indigo-600" />
                    <KPICard label="Active Markets" value={2} sub="Regional Clusters" icon={MapPin} colorClass="bg-green-600" />
                    <KPICard label="System Health" value="100%" sub="All Feeds Live" icon={Activity} colorClass="bg-emerald-500" />
                 </div>
               )}

               {activeNav === 'sales' && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black uppercase text-[#213147]">Sales CRM</h2>
                      <div className="flex gap-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search Leads..." value={leadSearchTerm} onChange={(e) => setLeadSearchTerm(e.target.value)} className="pl-10 h-10 border-2 rounded-xl" />
                        </div>
                        <Button onClick={() => { setEditingLead(null); leadForm.reset(); setIsLeadFormOpen(true); }} className="bg-primary uppercase font-black text-xs tracking-widest"><Plus className="h-4 w-4 mr-2" /> New Lead</Button>
                      </div>
                    </div>
                    <div className="border-2 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                      <Table>
                        <TableHeader><TableRow><TableHead className="px-6">Venue</TableHead><TableHead>Contact</TableHead><TableHead>Stage</TableHead><TableHead className="text-right px-6">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredLeads.map(lead => (
                            <TableRow key={lead.id}>
                              <TableCell className="px-6 py-4"><p className="font-black text-sm">{lead.venueName}</p><p className="text-[9px] uppercase text-muted-foreground">{lead.city}, {lead.state}</p></TableCell>
                              <TableCell><p className="font-bold text-xs">{lead.contactName}</p><p className="text-[9px] text-muted-foreground">{lead.email}</p></TableCell>
                              <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase">{lead.stage}</Badge></TableCell>
                              <TableCell className="text-right px-6"><Button variant="ghost" size="icon" onClick={() => { setEditingLead(lead); leadForm.reset(lead); setIsLeadFormOpen(true); }}><Edit className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                 </div>
               )}
             </div>
          </div>
        </main>

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
                              <FormControl><SelectTrigger className="h-11 border-2 font-bold"><SelectValue placeholder="Select State" /></SelectTrigger></FormControl>
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
