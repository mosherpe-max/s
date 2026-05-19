'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Store, 
  TrendingUp, 
  Users, 
  Globe, 
  Activity,
  ArrowRight,
  Plus,
  Loader2,
  Settings2,
  Trash2,
  Database,
  Sparkles,
  MapPin,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle
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
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, limit, doc, setDoc, serverTimestamp, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import type { Seller, SellerType, MenuItem } from '@/lib/types';
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  // Dialog/Sheet States
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isSetupItemsOpen, setIsSetupItemsOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
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
        latitude: 42.7748, // Default to prototype center
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
      toast({ title: "Venue Provisioned", description: `${newVenue.courseName} is now in the registry.` });
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
      
      // Determine seed data
      let seedData: any[] = publicGolfItems;
      if (venue.type.includes('Private')) seedData = privateGolfItems;
      if (venue.type.includes('Bowling')) seedData = bowlingAlleyItems;

      // Clear existing items first (Sanitization)
      const existingItems = await getDocs(collection(firestore, 'sellers', venue.id, 'menuItems'));
      existingItems.docs.forEach(d => batch.delete(d.ref));

      // Add seed items
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
      toast({ title: "Menu Initialized", description: `Default catalog synced to ${venue.courseName}` });
      setIsSetupItemsOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!firestore || !window.confirm("Permanent registry removal? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(firestore, 'sellers', id));
      toast({ title: "Venue De-Provisioned" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      {/* HEADER */}
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
        <Button 
          onClick={() => setIsProvisionOpen(true)}
          className="h-11 px-6 font-black uppercase tracking-widest text-xs gap-2 bg-[#213147] hover:bg-black shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Provision New Venue
        </Button>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Registry Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">{sellers?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Authorized Sellers</p>
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
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">All venues sync verified</p>
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
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1 tracking-tighter">Real-time listeners active</p>
          </CardContent>
        </Card>
      </div>

      {/* VENUE REGISTRY */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-[#213147]" />
            <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Venue Registry</h2>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">v3.2 Protocol</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isSellersLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : sellers?.length === 0 ? (
            <div className="p-20 border-2 border-dashed rounded-3xl text-center bg-muted/10">
              <Store className="h-12 w-12 mx-auto opacity-10 mb-4" />
              <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Registry Empty</p>
              <Button variant="link" onClick={() => setIsProvisionOpen(true)}>Provision first venue</Button>
            </div>
          ) : (
            sellers?.map((venue) => (
              <Card key={venue.id} className="shadow-sm hover:border-[#213147]/30 transition-all border-2 rounded-2xl overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                    <div className="flex items-center gap-5">
                      <div className="bg-muted p-4 rounded-2xl text-[#213147] group-hover:bg-[#213147] group-hover:text-white transition-colors shadow-inner">
                        <Store className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-lg uppercase tracking-tight text-[#213147]">{venue.courseName}</h3>
                          <Badge className={cn(
                            "text-[8px] font-black uppercase px-1.5 h-4",
                            venue.status === 'Active' ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"
                          )}>
                            {venue.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {venue.city}, {venue.state}
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {venue.contactEmail}
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/20">
                            {venue.type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { setSelectedVenue(venue); setIsSetupItemsOpen(true); }}
                        className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2 hover:bg-indigo-50 border-indigo-100 text-indigo-600"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                        Setup Items
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild 
                        className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2 hover:bg-[#213147] hover:text-white transition-all"
                      >
                        <Link href={`/sellers/${venue.id}`}>
                          <Settings2 className="h-3.5 w-3.5 mr-2" />
                          Maintain
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteVenue(venue.id)}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
                      >
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

      {/* PROVISIONING DIALOG */}
      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Provision Venue</DialogTitle>
            <DialogDescription>Register a new establishment in the Koop platform registry.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest">Venue Name</Label>
              <Input 
                id="name" 
                placeholder="Augusta National" 
                value={newVenue.courseName}
                onChange={(e) => setNewVenue(prev => ({ ...prev, courseName: e.target.value }))}
                className="font-bold border-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-widest">Venue Category</Label>
                <Select 
                  value={newVenue.type} 
                  onValueChange={(val) => setNewVenue(prev => ({ ...prev, type: val as SellerType }))}
                >
                  <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sellerTypes.map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest">Initial Status</Label>
                <Select 
                  value={newVenue.status} 
                  onValueChange={(val) => setNewVenue(prev => ({ ...prev, status: val as 'Active' | 'Inactive' }))}
                >
                  <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active" className="font-bold">Active</SelectItem>
                    <SelectItem value="Inactive" className="font-bold">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest">Primary Contact Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="manager@venue.com" 
                value={newVenue.contactEmail}
                onChange={(e) => setNewVenue(prev => ({ ...prev, contactEmail: e.target.value }))}
                className="font-bold border-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl">
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Conv. Fee ($)</Label>
                <Input 
                  type="number" 
                  step="0.10"
                  value={newVenue.serviceFee}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, serviceFee: parseFloat(e.target.value) }))}
                  className="font-mono font-bold"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase text-muted-foreground">Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={newVenue.taxRate}
                  onChange={(e) => setNewVenue(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                  className="font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleProvisionVenue}
              disabled={isProcessing || !newVenue.courseName || !newVenue.contactEmail}
              className="w-full h-12 bg-[#213147] font-black uppercase tracking-widest"
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Finalize Provisioning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SETUP ITEMS SHEET */}
      <Sheet open={isSetupItemsOpen} onOpenChange={setIsSetupItemsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-8 bg-[#213147] text-white border-b-2 border-primary">
            <div className="bg-primary/20 p-3 rounded-2xl w-fit mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">Initialize Catalog</SheetTitle>
            <SheetDescription className="text-white/60 font-medium">
              Sync standardized Koop item sets to {selectedVenue?.courseName}.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-8">
            <div className="space-y-8">
              <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex gap-4">
                <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Standardized Seeding</p>
                  <p className="text-[10px] font-bold text-indigo-800 leading-relaxed">
                    This will replace any existing menu items for this venue with a clean set of standard catalog items matched to the venue type.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Venue Context</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border-2 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Type</p>
                    <p className="text-xs font-bold truncate">{selectedVenue?.type}</p>
                  </div>
                  <div className="p-3 border-2 rounded-xl">
                    <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Items Policy</p>
                    <p className="text-xs font-bold truncate">Standardized</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">What's included in this sync?</h4>
                <div className="space-y-2">
                  {[
                    'Full Category Mappings (Appetizers, Spirits, etc.)',
                    'High-Impact Placeholder Imagery',
                    'Pricing Tiers (Market Standard)',
                    'Service Visibility Flags (BevCart vs. Clubhouse)'
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[11px] font-bold text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 border-t bg-muted/10">
            <Button 
              className="w-full h-14 bg-[#213147] hover:bg-black font-black uppercase tracking-widest shadow-xl gap-3"
              disabled={isProcessing || !selectedVenue}
              onClick={() => selectedVenue && handleInitializeMenu(selectedVenue)}
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Database className="h-5 w-5" />}
              Sync Catalog Now
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
