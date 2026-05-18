
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Store, 
  TrendingUp, 
  Users, 
  Globe, 
  Activity,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import type { Seller } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * PlatformAdminPage
 * Replaces the diagnostic tool with a high-level command dashboard.
 */
export default function PlatformAdminPage() {
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), limit(10));
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-[#213147]">PLATFORM ADMIN</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">
              Global Control
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Real-time overview of the KOOP ecosystem.</p>
        </div>
        <Button className="h-11 px-6 font-black uppercase tracking-widest text-xs gap-2 bg-[#213147] hover:bg-black shadow-lg">
          <Plus className="h-4 w-4" />
          Provision New Venue
        </Button>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Global Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">{sellers?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Active Installations</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" /> Platform Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">$0.00</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Throughput Last 24h</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-blue-600" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="text-lg font-black font-headline uppercase text-[#213147]">Operational</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Services in optimal state</p>
          </CardContent>
        </Card>
      </div>

      {/* VENUE LIST */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#213147]" />
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Recent Installations</h2>
          </div>
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest hover:text-primary">
            View All Venues <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isSellersLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : sellers?.length === 0 ? (
            <div className="p-20 border-2 border-dashed rounded-3xl text-center bg-muted/10">
              <Store className="h-12 w-12 mx-auto opacity-10 mb-4" />
              <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No active venues found in registry</p>
            </div>
          ) : (
            sellers?.map((venue) => (
              <Card key={venue.id} className="shadow-sm hover:border-[#213147]/30 transition-all border-2 rounded-2xl group overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                    <div className="flex items-center gap-5">
                      <div className="bg-muted p-4 rounded-2xl text-[#213147] group-hover:bg-[#213147] group-hover:text-white transition-colors shadow-inner">
                        <Store className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight text-[#213147]">{venue.courseName}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                            {venue.city}, {venue.state}
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/20">
                            {venue.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" asChild className="h-10 px-5 font-black text-[10px] uppercase tracking-widest rounded-xl border-2 hover:bg-[#213147] hover:text-white transition-all">
                        <Link href={`/sellers/${venue.id}`}>
                          Manage Venue
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
