
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck, Mail, Lock, User, LogOut, CheckCircle2, LogIn, ArrowRight, Copy, Zap, Target, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { SUPER_ADMIN_ID } from '@/lib/utils';
import type { SellerAdminRole } from '@/lib/types';

/**
 * INTERNAL SOLUTION GATEWAY
 * Restricted exclusively to Solution Administrators, Sales Reps,
 * and Venue Managers. Staff access the solution through 
 * PIN-based entry on dedicated devices.
 */
export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminSettingUp, setIsAdminSettingUp] = useState(false);

  // Hardcoded Super Admin Check (Primary Solution Control)
  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID || 
                      user?.email === 'mosherpe@gmail.com';

  // Check Global Admin Role
  const globalRoleRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);
  const { data: globalRole, isLoading: isGlobalRoleLoading } = useDoc(globalRoleRef);

  // Check Sales Rep Role
  const salesRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_sales_rep', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: salesRole, isLoading: isSalesRoleLoading } = useDoc(salesRoleRef);

  // Check Seller Admin Role (Venue Manager)
  const sellerRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole, isLoading: isSellerRoleLoading } = useDoc<SellerAdminRole>(sellerRoleRef);

  const isSolutionAdmin = isSuperAdmin || !!globalRole;
  const isInternalStaff = !!salesRole;
  const isVenueManager = !!sellerRole;

  const isVerifyingRoles = isGlobalRoleLoading || isSalesRoleLoading || isSellerRoleLoading;

  // Redirection Logic
  useEffect(() => {
    if (!user || isUserLoading || isVerifyingRoles) return;

    if (isSolutionAdmin) {
      router.push('/admin');
    } else if (isInternalStaff) {
      router.push('/sales/dashboard');
    } else if (isVenueManager && sellerRole?.sellerId) {
      router.push(`/sellers/${sellerRole.sellerId}`);
    }
  }, [user, isUserLoading, isSolutionAdmin, isInternalStaff, isVenueManager, sellerRole, router, isVerifyingRoles]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Internal Session Established" });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: "Credentials not recognized by solution security." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Session Terminated" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    if (!user || !firestore || !user.email) return;
    setIsAdminSettingUp(true);
    try {
      await setDoc(doc(firestore, 'roles_admin', user.uid), {
        grantedAt: serverTimestamp(),
        grantedBy: 'Solution Setup Tool'
      });

      toast({ 
        title: "Internal Admin Activated", 
        description: "Global solution privileges assigned." 
      });
      
      router.push('/admin');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: "Authorization required to initialize registry." });
    } finally {
      setIsAdminSettingUp(false);
    }
  };

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      toast({ title: "UID Copied" });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Synchronizing Security Protocol...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/30 p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2">
        <CardHeader className="text-center pb-8 border-b bg-muted/10">
          <div className="flex justify-center mb-4">
            <Link 
              href="/" 
              title="Return to Koop Home"
              className="bg-[#213147] p-5 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 group border-2 border-white/5"
            >
              <StylizedKoopLogo size="lg" colorClass="text-white" />
            </Link>
          </div>
          <CardTitle className="font-headline text-xl font-black uppercase tracking-[0.2em] text-[#213147]/60">
            INTERNAL GATEWAY
          </CardTitle>
          <CardDescription className="font-medium text-xs">
            Restricted Solution Access
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          {user ? (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-100 p-4 rounded-xl flex items-center gap-4">
                <div className="bg-green-500 p-2 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest leading-none mb-1">Authenticated As</p>
                  <p className="text-sm font-bold truncate">{user.email}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              {isVerifyingRoles ? (
                <div className="p-10 flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verifying Authorizations...</p>
                </div>
              ) : (isSolutionAdmin || isInternalStaff || isVenueManager) ? (
                <div className="space-y-4">
                  <div className="p-5 bg-primary/10 border-2 border-primary/20 rounded-2xl flex flex-col items-center text-center gap-2">
                    {isVenueManager ? <Store className="h-10 w-10 text-primary" /> : isInternalStaff ? <Target className="h-10 w-10 text-indigo-600" /> : <ShieldCheck className="h-10 w-10 text-primary" />}
                    <h3 className="font-headline font-bold text-primary uppercase">INTERNAL VERIFIED</h3>
                    <p className="text-xs text-muted-foreground">
                      {isSolutionAdmin ? 'Solution Management Console' : isVenueManager ? `Venue Manager: ${sellerRole?.courseName}` : 'Sales Professional Workspace'}
                    </p>
                  </div>
                  <Button asChild className="w-full h-14 bg-[#213147] hover:bg-[#213147]/90 text-white font-headline font-black uppercase tracking-widest shadow-xl">
                    <a href={isSolutionAdmin ? '/admin' : isVenueManager ? `/sellers/${sellerRole?.sellerId}` : '/sales/dashboard'}>
                      LAUNCH DASHBOARD
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <ShieldCheck className="h-4 w-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Solution Role Required</p>
                    </div>
                    <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                      This portal is reserved for internal KOOP operations. External partners should use the direct dashboard URLs.
                    </p>
                    <div className="bg-white p-3 rounded-lg border-2 border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-muted-foreground">Solution Identity</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyUid}><Copy className="h-3 w-3" /></Button>
                      </div>
                      <code className="text-[10px] font-mono font-black break-all text-indigo-600">{user.uid}</code>
                    </div>
                    {isSuperAdmin && (
                      <Button 
                        onClick={handleSetupAdmin} 
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg gap-3"
                        disabled={isAdminSettingUp}
                      >
                        {isAdminSettingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                        <span className="font-headline font-bold uppercase tracking-wider">Initialize Global Admin</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className="w-full text-muted-foreground hover:text-destructive h-10 uppercase text-[10px] font-black tracking-[0.2em] gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Terminate Session
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest">Solution Identity</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="identity@kooporders.com" 
                      className="pl-10 h-11 border-2 font-bold"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest">Security Key</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      className="pl-10 h-11 border-2 font-bold"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wide leading-relaxed text-center">
                  This gateway is restricted to authorized solution personnel and establishment managers.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#213147] hover:bg-[#213147]/90 text-white shadow-xl font-headline font-black uppercase tracking-widest gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="h-4 w-4" />}
                SECURE LOGIN
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 text-center justify-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            AUTHORIZED ACCESS ONLY • v3.8
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
