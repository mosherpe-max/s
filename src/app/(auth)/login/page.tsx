
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
import { Loader2, ShieldCheck, Mail, Lock, User, LogOut, CheckCircle2, AlertCircle, UserPlus, LogIn, KeyRound } from 'lucide-react';
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
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAdminSettingUp, setIsAdminSettingUp] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "Account Created", description: "You are now signed in. Use the setup tool below to grant admin rights." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Authorized session established." });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: authMode === 'signup' ? "Registration Failed" : "Access Denied", 
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
      // 1. Set Role Marker in the specific location verified by Security Rules
      await setDoc(doc(firestore, 'roles_admin', user.uid), {
        grantedAt: serverTimestamp(),
        grantedBy: 'Self-Setup Prototype'
      });

      // 2. Create the extended admin profile
      await setDoc(doc(firestore, 'adminUsers', user.uid), {
        id: user.uid,
        email: user.email || 'anonymous@koop.com',
        role: 'KOOP Admin',
        createdAt: serverTimestamp()
      });

      toast({ 
        title: "Admin Access Granted", 
        description: "Your account now has global platform privileges." 
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Authenticating Session...</p>
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
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest leading-none mb-1">Authenticated As</p>
                  <p className="text-sm font-bold truncate">{user.email || 'Guest Session'}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Admin Promotion Tool</p>
                  </div>
                  <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                    Access to the <strong>KOOP Admin</strong> dashboard requires an entry in the <code>/roles_admin</code> collection. 
                    Click below to register this account as a Platform Administrator.
                  </p>
                  
                  <Button 
                    onClick={handleSetupAdmin} 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg gap-3"
                    disabled={isAdminSettingUp}
                  >
                    {isAdminSettingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                    <span className="font-headline font-bold uppercase tracking-wider">Setup Admin Access</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    asChild 
                    variant="outline" 
                    className="h-12 border-2 border-[#213147] text-[#213147] font-bold uppercase tracking-widest hover:bg-[#213147]/5"
                  >
                    <a href="/admin">Enter Global Dashboard</a>
                  </Button>

                  <Button 
                    variant="ghost" 
                    onClick={handleLogout} 
                    className="text-muted-foreground hover:text-destructive h-10 uppercase text-[10px] font-black tracking-[0.2em] gap-2 mt-2"
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
                        className="pl-10 h-11 border-2 font-bold focus-visible:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest px-1">Access Key</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••"
                        className="pl-10 h-11 border-2 font-bold focus-visible:ring-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center pt-2">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-[10px] font-black uppercase p-0 h-auto text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    >
                      {authMode === 'signin' 
                        ? "Need an account? Create one" 
                        : "Already have an account? Sign In"}
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#213147] hover:bg-[#213147]/90 text-white shadow-xl font-headline font-black uppercase tracking-widest mt-2 gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : (authMode === 'signup' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />)}
                    {authMode === 'signup' ? "REGISTER NEW ACCOUNT" : "AUTHENTICATE"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="guest">
                <div className="space-y-4 py-2">
                  <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      For rapid review, you can start a <strong>Guest Session</strong>. You will still need to click "Setup Admin Access" to enter the global dashboard.
                    </p>
                  </div>
                  <Button 
                    onClick={handleAnonymousSignIn} 
                    variant="outline" 
                    className="w-full h-14 border-2 border-dashed border-primary text-primary hover:bg-primary/5 font-headline font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2 h-5 w-5" />}
                    START GUEST SESSION
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t py-4 text-center justify-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            KOOP SECURE ACCESS PROTOCOL v2.1
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
