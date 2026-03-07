
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Mail, Lock, User, LogOut, CheckCircle2, AlertCircle, UserPlus, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GolfBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12c-2 0-2.83 1-4 1s-2-1-4-1" />
    <path d="m15.5 15.5-3-3" />
    <path d="M20 16c-2 0-2.83-1-4-1s-2 1-4 1" />
    <path d="M4 16c2 0 2.83-1 4-1s2 1 4 1" />
    <path d="M12 12c2 0 2.83-1 4-1s2 1 4 1" />
    <path d="M4 8c2 0 2.83 1 4 1s2-1-4-1" />
    <path d="m8.5 8.5 3 3" />
    <path d="M20 8c-2 0-2.83 1-4 1s-2-1-4-1" />
  </svg>
);

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminSettingUp, setIsAdminSettingUp] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Account Created", description: "You are now signed in. Please setup admin access below." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Authorized session established." });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed", 
        description: error.message || "Authentication error." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      toast({ title: "Guest Session Started" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Auth Error", description: error.message });
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
    if (!user || !firestore) return;
    setIsAdminSettingUp(true);
    try {
      // 1. Set Role Marker
      await setDoc(doc(firestore, 'roles_admin', user.uid), {
        grantedAt: serverTimestamp(),
        grantedBy: 'Prototype Setup'
      });

      // 2. Set Profile
      await setDoc(doc(firestore, 'adminUsers', user.uid), {
        id: user.uid,
        email: user.email || 'anonymous@koop.com',
        role: 'KOOP Admin',
        createdAt: serverTimestamp()
      });

      toast({ 
        title: "Admin Access Granted", 
        description: "You now have full platform privileges." 
      });
      router.push('/admin');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: error.message });
    } finally {
      setIsAdminSettingUp(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-muted/30 p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2">
        <CardHeader className="text-center pb-8 border-b bg-muted/10">
          <div className="flex justify-center items-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <GolfBallIcon className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="font-headline text-3xl font-black uppercase tracking-tight text-[#213147]">
            KOOP ACCESS
          </CardTitle>
          <CardDescription className="font-medium">
            Authorized Platform Gateway
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
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Active Session</p>
                  <p className="text-sm font-bold truncate">{user.email || 'Guest User'}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-indigo-50 border-2 border-indigo-100 rounded-xl space-y-2">
                  <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Initial Setup Required</p>
                  <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                    Click the button below to grant this account global administrative privileges in the database.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={handleSetupAdmin} 
                    className="h-14 bg-indigo-600 hover:bg-indigo-700 shadow-lg gap-3"
                    disabled={isAdminSettingUp}
                  >
                    {isAdminSettingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                    <span className="font-headline font-bold uppercase tracking-wider">Setup Prototype Admin Access</span>
                  </Button>
                  
                  <Button 
                    asChild 
                    variant="outline" 
                    className="h-12 border-2 border-[#213147] text-[#213147] font-bold uppercase tracking-widest"
                  >
                    <a href="/admin">Go to Dashboard</a>
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="text-muted-foreground hover:text-destructive h-10 uppercase text-[10px] font-black tracking-[0.2em] gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Terminate Session
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="email" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-12">
                <TabsTrigger value="email" className="font-bold uppercase text-[10px] tracking-widest">Email Access</TabsTrigger>
                <TabsTrigger value="guest" className="font-bold uppercase text-[10px] tracking-widest">Quick Start</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest px-1">Email Address</Label>
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
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest px-1">Security Key</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        className="pl-10 h-11 border-2 font-bold"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between px-1">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-[10px] font-bold uppercase p-0 h-auto"
                      onClick={() => setIsSignUp(!isSignUp)}
                    >
                      {isSignUp ? "Already have an account? Sign In" : "Need an account? Create one"}
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#213147] hover:bg-[#213147]/90 text-white shadow-xl font-headline font-black uppercase tracking-widest mt-2 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />)}
                    {isSignUp ? "CREATE ACCOUNT" : "AUTHENTICATE"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="guest">
                <div className="space-y-4 py-2">
                  <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      For rapid prototyping, you can use a Guest Session. You will still need to click "Setup Prototype Admin" after signing in to access restricted areas.
                    </p>
                  </div>
                  <Button 
                    onClick={handleAnonymousSignIn} 
                    variant="outline" 
                    className="w-full h-14 border-2 border-dashed border-primary text-primary hover:bg-primary/5 font-headline font-black uppercase tracking-widest"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : "START GUEST SESSION"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 text-center justify-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            KOOP SECURE ACCESS PROTOCOL v2.0
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
