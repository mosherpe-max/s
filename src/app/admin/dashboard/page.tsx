'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Store, 
  MapPin, 
  Activity, 
  Target,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Seller, Lead } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function AdminDashboardPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const leadsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'leads') : null), [firestore]);
  const venuesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sellers') : null), [firestore]);

  const { data: leads } = useCollection<Lead>(leadsQuery);
  const { data: venues } = useCollection<Seller>(venuesQuery);

  const recentLeads = [...(leads || [])].sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0)).slice(0, 5);

  return (
    <div className="p-8 animate-in fade-in duration-500 text-left">
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard label="Total Venues" value={venues?.length || 0} sub="Onboarded Partners" icon={Store} colorClass="bg-indigo-600" />
          <KPICard label="Active Markets" value={2} sub="Regional Clusters" icon={MapPin} colorClass="bg-green-600" />
          <KPICard label="System Health" value="100%" sub="All Feeds Live" icon={Activity} colorClass="bg-emerald-500" />
          <KPICard label="Total Prospects" value={leads?.length || 0} sub="In Sales Pipeline" icon={Target} colorClass="bg-primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Recent Lead Activity</CardTitle>
              <Link href="/admin/sales" className="text-[9px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                View CRM <ArrowRight className="h-2 w-2" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {recentLeads.length === 0 ? (
                    <TableRow><TableCell className="py-20 text-center text-muted-foreground uppercase text-[10px] font-bold">No recent leads found</TableCell></TableRow>
                  ) : (
                    recentLeads.map(lead => (
                      <TableRow key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <p className="font-black text-sm">{lead.venueName}</p>
                          <p className="text-[9px] uppercase text-muted-foreground">{lead.city}, {lead.state}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] font-black uppercase bg-white">{lead.stage}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm bg-[#213147] text-white overflow-hidden">
             <CardHeader className="py-8 px-8 text-center border-b border-white/10">
                <div className="bg-primary/20 p-4 rounded-[2rem] w-fit mx-auto mb-4 border-2 border-primary/20">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl font-black uppercase tracking-tight">Koop God Mode</CardTitle>
                <CardDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Global System Oversight Enabled</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
                      <p className="text-[9px] font-black uppercase text-primary mb-1">Registry</p>
                      <p className="text-sm font-bold">Authorized</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
                      <p className="text-[9px] font-black uppercase text-primary mb-1">Financials</p>
                      <p className="text-sm font-bold">Read / Write</p>
                   </div>
                </div>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-center pt-4">
                  Session Identity: {auth?.currentUser?.uid || 'Initializing...'}
                </p>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
