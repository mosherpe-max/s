'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Store, 
  Plus,
  Loader2,
  Settings2,
  MapPin,
  Stethoscope,
  Zap,
  LogOut,
  UserPlus,
  ShieldCheck,
  Search,
  Users,
  Mail,
  Save
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useFirebase, useAuth, useDoc } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import type { Seller, PlatformConfig } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PlatformAdminPage() {
  const { firebaseApp } = useFirebase();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Seller | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const [managerEmail, setManagerEmail] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'platform', 'config') : null), [firestore]);
  const { data: config } = useDoc<PlatformConfig>(configRef);

  useEffect(() => {
    if (config?.supportEmail) {
      setConfigEmail(config.supportEmail);
    }
  }, [config]);

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

  const handleSaveConfig = async () => {
    if (!firestore || !configEmail) return;
    setIsSavingConfig(true);
    try {
      await setDoc(doc(firestore, 'platform', 'config'), {
        supportEmail: configEmail,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Configuration Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSavingConfig(false);
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
      toast({ title: "Establishment Profile Provisioned" });
      setIsProvisionOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Provisioning Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!firestore || !selectedVenue || !managerEmail) return;
    setIsProcessing(true);
    try {
      const cleanEmail = managerEmail.toLowerCase().trim();
      await setDoc(doc(firestore, 'roles_seller_admin', cleanEmail), {
        sellerId: selectedVenue.id,
        courseName: selectedVenue.courseName,
        assignedAt: serverTimestamp()
      }, { merge: true });

      toast({ 
        title: "Authorized Manager Assigned", 
        description: `${cleanEmail} can now manage ${selectedVenue.courseName}.` 
      });
      setIsAccessManagerOpen(false);
      setManagerEmail('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Assignment Failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-[#213147]">PLATFORM CONTROL</h1>
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 border-primary/20 text-primary">
              Global Admin
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Provision establishments and manage authorized venue managers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleRunHealthCheck}
            disabled={isHealthChecking}
            className="h-11 px-4 font-black uppercase tracking-widest text-[10px] gap-2 border-2"
          >
            {isHealthChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
            Infrastructure Check
          </Button>
          <Button 
            onClick={() => setIsProvisionOpen(true)}
            className="h-11 px-6 font-black uppercase tracking-widest text-xs gap-2 bg-[#213147] hover:bg-black shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Provision Venue
          </Button>
          <Button 
            variant="ghost"
            onClick={handleLogout}
            className="h-11 px-4 font-black uppercase tracking-widest text-[10px] gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Portal
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Store className="h-3.5 w-3.5" /> Active Establishments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">{sellers?.length || 0}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-indigo-600" /> Authorized Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black font-headline text-[#213147]">Managed</p>
          </CardContent>
        </Card>

        <Card className={cn("shadow-sm border-2 transition-all", healthStatus ? "bg-indigo-50 border-indigo-200" : "bg-muted/10")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> System Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthStatus ? (
              <p className="text-lg font-black font-headline uppercase text-indigo-700">Operational</p>
            ) : (
              <p className="text-lg font-black font-headline uppercase text-muted-foreground/40 italic">Offline</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="font-headline text-xl font-black uppercase tracking-tight text-[#213147]">Platform Configuration</h2>
        </div>
        <Card className="border-2 shadow-sm">
          <CardHeader className="pb-4">
            <CardDescription className="text-xs">Global settings applied to all support and onboarding workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support & Onboarding Email</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="support@kooporders.com" 
                    className="pl-10 h-11 border-2 font-bold"
                    value={configEmail}
                    onChange={(e) => setConfigEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={isSavingConfig}
                  className="h-11 px-6 font-black uppercase tracking-widest text-[10px] gap-2"
                >
                  {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Config
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

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
              <Card key={venue.id} className="shadow-sm hover:border-[#213147]/30 transition-all border-2 rounded-2xl overflow-hidden group bg-white">
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
                          <Badge variant="secondary" className="text-[8px] font-black uppercase">{venue.type}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(venue); setIsAccessManagerOpen(true); }} className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                        <UserPlus className="h-3.5 w-3.5 mr-2 text-indigo-600" /> Authorize Manager
                      </Button>
                      <Button variant="outline" size="sm" asChild className="h-10 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl border-2">
                        <Link href={`/sellers/${venue.id}`}>
                          <Settings2 className="h-3.5 w-3.5 mr-2" /> Manage Venue
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

      {/* ACCESS MANAGER DIALOG */}
      <Dialog open={isAccessManagerOpen} onOpenChange={setIsAccessManagerOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="p-3 bg-indigo-50 rounded-2xl w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Authorize Venue Manager</DialogTitle>
            <DialogDescription className="text-xs font-medium">Assign a manager identity to {selectedVenue?.courseName}. This user will have exclusive access to this establishment's dashboard.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorized Email Address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="manager@venue.com" 
                  className="pl-10 h-11 border-2 font-bold"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-xl border-2 border-dashed border-indigo-200">
              <p className="text-[9px] text-indigo-700 uppercase font-black tracking-widest leading-relaxed">
                Security Note: The manager must create an account with this exact email to activate their permissions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleGrantAccess} 
              disabled={isProcessing || !managerEmail} 
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest"
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />} Link Authorized Identity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROVISIONING DIALOG */}
      <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase tracking-tight text-[#213147]">Provision Establishment</DialogTitle>
            <DialogDescription>Initialize a new operational profile in the registry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Venue Name</Label>
              <Input placeholder="Oak Ridge Country Club" value={newVenue.courseName} onChange={(e) => setNewVenue(prev => ({ ...prev, courseName: e.target.value }))} className="font-bold border-2" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Contact Email</Label>
              <Input type="email" placeholder="contact@oakridge.com" value={newVenue.contactEmail} onChange={(e) => setNewVenue(prev => ({ ...prev, contactEmail: e.target.value }))} className="font-bold border-2" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleProvisionVenue} disabled={isProcessing || !newVenue.courseName || !newVenue.contactEmail} className="w-full h-12 bg-[#213147] font-black uppercase tracking-widest">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Store className="h-5 w-5 mr-2" />} Finalize Establishment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
