'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store, 
  Globe, 
  Activity,
  Plus,
  Loader2,
  Settings2,
  Trash2,
  Database,
  Sparkles,
  MapPin,
  Mail,
  CheckCircle2,
  Stethoscope,
  Zap,
  LogOut
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
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Seller, SellerType } from '@/lib/types';
import { sellerTypes } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { publicGolfItems, privateGolfItems, bowlingAlleyItems } from '@/lib/data';
import { cn } from '@/lib/utils';

/**
 * PlatformAdminPage
 * The central command for Koop administrators to provision and maintain venues.
 */
export default function PlatformAdminPage() {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isSetupItemsOpen, setIsSetupItemsOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const [newVenue, setNewVenue] = useState<Partial<Seller>>({
    courseName: '',
    type: 'Public Golf Course',
    contactEmail: '',
    serviceFee: 1.50,
    taxRate: 6.0,
    status: 'Active',
    menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out']
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sellersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sellers'), limit(50));
  }, [firestore]);

  const { data: sellers, isLoading: isSellersLoading } = useCollection<Seller>(sellersQuery);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: "Authorized Session Terminated" });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const handleRunHealthCheck = async () => {
    if (!firebaseApp) return;
    setIsHealthChecking(true);
    try {
      const { getFunctions } = await import('firebase/functions');
      const functions = getFunctions(firebaseApp, 'us-central1');
      const checkFn = httpsCallable(functions, 'testFunction');
      const result = await checkFn();
      setHealthStatus(result.data);
      toast({ title: "Infrastructure Verified" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Health Check Failed", description: error.message });
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleProvisionVenue = async () => {
    if (!firestore || !newVenue.courseName || !newVenue.contactEmail) return;
    setIsProcessing(true);
    
    try {
      const venueId = newVenue.courseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const venueRef = doc(firestore, 'sellers', venueId);
      
      const payload = {
        ...newVenue,
        id: venueId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        latitude: 42.7748,
        longitude: -83.2139,
        streetAddress: '123 Venue Way',
        city: 'Metropolis',
        state: 'MI',
        zip: '48301',
        contactName: 'Venue Manager',
        contactPhone: '555-0100',
        orderThresholds: {
          'Beverage Cart': { warning: 7, max: 10 },
          'Clubhouse': { warning: 7, max: 10 },
          'Lane Delivery': { warning: 7, max: 10 }
        }
      };

      await setDoc(venueRef, payload);
      toast({ title: "Venue Provisioned" });
      setIsProvisionOpen(false);
      setNewVenue({
        courseName: '',
        type: 'Public Golf Course',
        contactEmail: '',
        serviceFee: 1.50,
        taxRate: 6.0,
        status: 'Active',
        menuTypes: ['Beverage Cart', 'Clubhouse', 'Take Out']
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitializeMenu = async (venue: Seller) => {
    if (!firestore) return;
    setIsProcessing(true);
    
    try {
      const batch = writeBatch(firestore);
      let seedData: any[] = publicGolfItems;
      if (venue.type.includes('Private')) seedData = privateGolfItems;
      if (venue.type.includes('Bowling')) seedData = bowlingAlleyItems;

      const existingItems = await getDocs(collection(firestore, 'sellers', venue.id, 'menuItems'));
      existingItems.docs.forEach(d => batch.delete(d.ref));

      seedData.forEach((item, idx) => {
        const itemRef = doc(collection(firestore, 'sellers', venue.id, 'menuItems'));
        batch.set(itemRef, {
          ...item,
          id: itemRef.id,
          rank: idx,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast({ title: "Menu Initialized" });
      setIsSetupItemsOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!firestore || !window.confirm("Permanent registry removal?")) return;
    try {
      await deleteDoc(doc(firestore, 'sellers', id));
      toast({ title: "Venue Removed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-[#213147]">PLATFORM ADMIN</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">
              Control Panel
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Provision venues and maintain global catalog items.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleRunHealthCheck}
            disabled={isHealthChecking}
            className="h-11 px-4 font-black uppercase tracking-widest text-[10px] gap-2 border-2"
          >
            {isHealthChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
            Run Health Check
          </Button>
          <Button 
            onClick={() => setIsProvisionOpen(true)}
            className="h-11 px-6 font-black uppercase tracking-widest text-xs gap-2 bg-[#213147] hover:bg-black shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Provision New Venue
          </Button>
          <Button 
            variant="ghost"
            onClick={handleLogout}
            className="h-11 px-4 font-black uppercase tracking-widest text-[10px] gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Registry Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">{sellers?.length || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-indigo-600" /> Catalog Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">Optimal</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-blue-600" /> Platform Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <p className="text-lg font-black font-headline uppercase text-[#213147]">Connected</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("shadow-sm border-2 transition-all", healthStatus ? "bg-indigo-50 border-indigo-200" : "bg-muted/10")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Backend Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <p className="text-lg font-black font-headline uppercase text-indigo-700">Online</p>
            ) : (
              <p className="text-lg font-black font-headline uppercase text-muted-foreground/40 italic">Not Checked</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#213147]" />
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Venue Registry</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isSellersLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : (
            sellers?.map((venue) => (
              <Card key={venue.id} className="shadow-sm hover:border-[#213147]/30 transition-all border-2 rounded-2xl overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                    <div className="flex items-center gap-5">
                      <div className="bg-muted p-4 rounded-2xl text-[#213147] group-hover:bg-[#213147] group-hover:text-white transition-colors">
                        <Store className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight text-[#213147]">{venue.courseName}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {venue.city}, {venue.state}
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {venue.contactEmail}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsSetupItemsOpen(true); }} className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                        <Sparkles className="h-3.5 w-3.5 mr-2" /> Setup Items
                      </Button>
                      <Button variant="outline" size="sm" asChild className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                        <Link href={`/sellers/${venue.id}`}>
                          <Settings2 className="h-3.5 w-3.5 mr-2" /> Maintain
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteVenue(venue.id)} className="h-10 w-10 text-muted-foreground hover:text-destructive rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Provision Venue</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Venue Name</Label>
              <Input placeholder="Augusta National" value={newVenue.courseName} onChange={(e) => setNewVenue(prev => ({ ...prev, courseName: e.target.value }))} className="font-bold border-2" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Primary Contact Email</Label>
              <Input type="email" placeholder="manager@venue.com" value={newVenue.contactEmail} onChange={(e) => setNewVenue(prev => ({ ...prev, contactEmail: e.target.value }))} className="font-bold border-2" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleProvisionVenue} disabled={isProcessing || !newVenue.courseName || !newVenue.contactEmail} className="w-full h-12 bg-[#213147] font-black uppercase tracking-widest">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />} Finalize Provisioning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSetupItemsOpen} onOpenChange={setIsSetupItemsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-8 bg-[#213147] text-white border-b-2 border-primary">
            <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Initialize Catalog</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 p-8">
            <p className="text-sm font-medium mb-4">Seeding standardized catalog for {selectedVenue?.courseName}.</p>
          </ScrollArea>
          <div className="p-8 border-t bg-muted/10">
            <Button className="w-full h-14 bg-[#213147] font-black uppercase tracking-widest shadow-xl" disabled={isProcessing || !selectedVenue} onClick={() => selectedVenue && handleInitializeMenu(selectedVenue)}>
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Database className="h-5 w-5 mr-2" />} Sync Catalog
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
