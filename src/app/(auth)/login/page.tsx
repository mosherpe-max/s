'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, ShieldCheck, Mail, Lock, User, LogOut, CheckCircle2, LogIn, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StylizedKoopLogo } from '@/components/header';
import { SUPER_ADMIN_ID } from '@/lib/utils';

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

  // 1. Check Global Admin Role (UID Based)
  const globalRoleRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'roles_admin', user.uid);
  }, [firestore, user]);
  const { data: globalRole } = useDoc(globalRoleRef);

  // 2. Check Seller Admin Role (Email Based)
  const sellerRoleRef = useMemoFirebase(() => {
    if (!firestore || !user?.email) return null;
    return doc(firestore, 'roles_seller_admin', user.email.toLowerCase());
  }, [firestore, user]);
  const { data: sellerRole } = useDoc(sellerRoleRef);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_ID;
  const isPlatformAdmin = isSuperAdmin || !!globalRole;
  const isVenueAdmin = !!sellerRole;

  // Handle Automatic Redirection
  useEffect(() => {
    if (!user || isUserLoading) return;

    if (isPlatformAdmin) {
      router.push('/admin');
    } else if (isVenueAdmin && sellerRole?.sellerId) {
      router.push(`/sellers/${sellerRole.sellerId}`);
    }
  }, [user, isUserLoading, isPlatformAdmin, isVenueAdmin, sellerRole, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Authorized Session Established" });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: error.message || "Please check your credentials or contact your administrator." 
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
      toast({ title: "Signed Out" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    if (!user || !firestore || !user.email) return;
    setIsAdminSettingUp(true);
    try {
      // 1. Create Role Marker (UID based for rules)
      await setDoc(doc(firestore, 'roles_admin', user.uid), {
        grantedAt: serverTimestamp(),
        grantedBy: 'Prototype Setup Tool'
      });

      // 2. Create Admin Profile (Email based for consistency)
      await setDoc(doc(firestore, 'adminUsers', user.email.toLowerCase()), {
        id: user.uid,
        email: user.email.toLowerCase(),
        role: 'KOOP Platform Admin',
        createdAt: serverTimestamp()
      }, { merge: true });

      toast({ 
        title: "Admin Access Granted", 
        description: "Your account now has global privileges." 
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setIsAdminSettingUp(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing Security Protocol...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/30 p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2">
        <CardHeader className="text-center pb-8 border-b bg-muted/10">
          <div className="flex justify-center items-center mb-4">
            <StylizedKoopLogo size="lg" colorClass="text-[#213147]" />
          </div>
          <CardTitle className="font-headline text-xl font-black uppercase tracking-[0.2em] text-[#213147]/60">
            ACCESS GATEWAY
          </CardTitle>
          <CardDescription className="font-medium">
            Authorized Platform Portal
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
                  <p className="text-sm font-bold truncate">{user.email || 'Authorized Identity'}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              {isPlatformAdmin || isVenueAdmin ? (
                <div className="space-y-4">
                  <div className="p-5 bg-primary/10 border-2 border-primary/20 rounded-2xl flex flex-col items-center text-center gap-2">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                    <h3 className="font-headline font-bold text-primary uppercase">STATUS VERIFIED</h3>
                    <p className="text-xs text-muted-foreground">
                      {isPlatformAdmin ? 'Platform Administrator Access' : `Authorized Manager: ${sellerRole?.courseName || 'Assigned Venue'}`}
                    </p>
                  </div>
                  <Button asChild className="w-full h-14 bg-[#213147] hover:bg-[#213147]/90 text-white font-headline font-black uppercase tracking-widest shadow-xl">
                    <a href={isPlatformAdmin ? '/admin' : `/sellers/${sellerRole?.sellerId}`}>
                      ENTER DASHBOARD
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <ShieldCheck className="h-4 w-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Role Activation Required</p>
                    </div>
                    <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                      Your identity is recognized, but your administrative profile needs to be initialized.
                    </p>
                    <Button 
                      onClick={handleSetupAdmin} 
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg gap-3"
                      disabled={isAdminSettingUp}
                    >
                      {isAdminSettingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                      <span className="font-headline font-bold uppercase tracking-wider">Initialize Admin Profile</span>
                    </Button>
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
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest">Authorized Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@kooporders.com" 
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
                  Account registration is restricted to platform administrators.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#213147] hover:bg-[#213147]/90 text-white shadow-xl font-headline font-black uppercase tracking-widest gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn className="h-4 w-4" />}
                AUTHENTICATE
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 text-center justify-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            KOOP SECURE ACCESS v2.6
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
