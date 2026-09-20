
'use client';

import React, { useState, useEffect, use } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Smartphone, User, ShieldCheck, ChevronRight, X, Eraser, CheckCircle2, Truck, Building, Users, MapPin, AlertTriangle, BellRing, Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, AUTHORIZED_SERVICE_MODES } from '@/lib/utils';
import type { Seller, StaffMember } from '@/lib/types';
import { StylizedKoopLogo } from '@/components/header';
import { subscribeDeviceToPush, getOrCreateDeviceId } from '@/lib/push-notifications';
import Link from 'next/link';

const PUSH_SETUP_DONE_KEY = 'koop_push_setup_done';

const roleIcons: Record<string, any> = {
  'Beverage Cart': Truck,
  'Clubhouse': Building,
  'Lane Delivery': Users,
};

export default function StaffLoginPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffMember | null>(null);
  const [venueName, setVenueName] = useState('This Venue');

  // Device notification setup - only ever shown in Safari, before this
  // device has been added to the Home Screen. Calling
  // Notification.requestPermission() from inside the already-installed
  // standalone PWA ejects it into Safari chrome on this iOS build
  // (confirmed on-device, regardless of gesture gating), so this step
  // can't run inside the app itself - see push-notifications.ts.
  const [deviceSetupChecked, setDeviceSetupChecked] = useState(false);
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushOutcome, setPushOutcome] = useState<'success' | 'denied' | 'unsupported' | 'unconfigured' | null>(null);

  useEffect(() => {
    const isStandalone = (window.navigator as any).standalone === true;
    const alreadyDone = localStorage.getItem(PUSH_SETUP_DONE_KEY) === 'true';
    setShowDeviceSetup(!isStandalone && !alreadyDone);
    setDeviceSetupChecked(true);
  }, []);

  const finishDeviceSetup = () => {
    localStorage.setItem(PUSH_SETUP_DONE_KEY, 'true');
    setShowDeviceSetup(false);
  };

  const handleEnablePush = async () => {
    if (!firestore) { finishDeviceSetup(); return; }
    setIsEnablingPush(true);
    const result = await subscribeDeviceToPush(firestore, sellerId).catch(() => 'denied' as const);
    setIsEnablingPush(false);
    setPushOutcome(result === 'subscribed' ? 'success' : result);
    if (result !== 'subscribed') {
      // Denied/unsupported/unconfigured - nothing more to try on this
      // device, so don't keep showing the prompt on future visits.
      localStorage.setItem(PUSH_SETUP_DONE_KEY, 'true');
    }
  };

  // AGGRESSIVE SESSION PURGE ON MOUNT
  useEffect(() => {
    localStorage.removeItem('koop_is_admin_session');
    localStorage.removeItem('koop_staff_id');
    localStorage.removeItem('koop_staff_name');
    localStorage.removeItem('koop_staff_role');
    localStorage.removeItem('koop_staff_session_start');
  }, []);

  const sellerRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sellers', sellerId) : null), [firestore, sellerId]);
  const { data: seller } = useDoc<Seller>(sellerRef);

  useEffect(() => {
    if (seller) {
      setVenueName(seller.courseName);
    }
  }, [seller]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        // Do NOT request Notification permission here (or anywhere in this
        // login flow). Confirmed on-device: even gesture-tied, the mere act
        // of calling Notification.requestPermission() from inside the
        // installed standalone PWA silently swaps it into Safari browser
        // chrome for the rest of the session - the ejection isn't about
        // gesture timing, it's the API call itself in this iOS webview
        // context. If push notifications are needed later, they need an
        // opt-in path that doesn't run inside the installed app's own
        // critical navigation (e.g. prompted from Safari before install).
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => setPin('');

  const verifyPin = async (code: string) => {
    if (!firestore || !auth) return;
    setIsVerifying(true);
    try {
      const staffQuery = query(
        collection(firestore, 'sellers', sellerId, 'staff'),
        where('pin', '==', code),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(staffQuery);
      
      if (snapshot.empty) {
        toast({ 
          variant: "destructive", 
          title: "Invalid PIN", 
          description: "Please check your access code and try again." 
        });
        setPin('');
      } else {
        await signInAnonymously(auth);
        const staffData = snapshot.docs[0].data() as StaffMember;
        setAuthenticatedStaff(staffData);

        toast({ title: `Identity Verified`, description: `Hello, ${staffData.name}. Please select your shift role.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Error", description: error.message });
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRoleSelect = async (menuType: string) => {
    if (!authenticatedStaff || !firestore || !sellerId || !seller) return;

    const fieldMap: Record<string, string> = {
      'Beverage Cart': 'bevcartActive',
      'Clubhouse': 'clubhouseActive',
      'Lane Delivery': 'lanedeliveryActive'
    };
    
    const modeField = fieldMap[menuType];
    const isModeAuthorizedByAdmin = !!(seller as any)?.[modeField];

    if (!isModeAuthorizedByAdmin) {
      toast({ variant: "destructive", title: "Channel Restricted", description: `The ${menuType} is currently deactivated by management.` });
      return;
    }

    // Fresh session ID on every login (same mode or a different one) - lets any
    // device previously signed in with this PIN detect it's been superseded and
    // sign itself out, instead of two devices silently fighting over one shift.
    const sessionId = crypto.randomUUID();

    // Update Personnel document with active role - currentDeviceId points
    // this staff member at whichever device's push subscription (if any)
    // should receive alerts, set up separately in Safari before this
    // device was ever added to the Home Screen.
    await updateDoc(doc(firestore, 'sellers', sellerId, 'staff', authenticatedStaff.id), {
      activeMode: menuType,
      activeSessionId: sessionId,
      currentDeviceId: getOrCreateDeviceId(),
      lastActive: serverTimestamp()
    }).catch(() => {});

    // Persist Official Staff Session
    localStorage.setItem('koop_is_admin_session', 'false');
    localStorage.setItem('koop_staff_id', authenticatedStaff.id);
    localStorage.setItem('koop_staff_name', authenticatedStaff.name);
    localStorage.setItem('koop_staff_role', menuType);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    localStorage.setItem('koop_staff_session_id', sessionId);
    localStorage.removeItem('koop_staff_last_hidden');

    toast({ 
      title: "Shift Started", 
      description: `Assuming ${menuType} role. Launching dashboard...` 
    });

    setTimeout(() => {
      switch (menuType) {
        case 'Beverage Cart': router.push(`/sellers/${sellerId}/bevcart`); break;
        case 'Clubhouse': router.push(`/sellers/${sellerId}/clubhouse`); break;
        case 'Lane Delivery': router.push(`/sellers/${sellerId}/laneside`); break;
        default: router.push(`/sellers/${sellerId}/clubhouse`); break;
      }
    }, 800);
  };

  const authorizedServiceModes = React.useMemo(() => {
    if (!seller) return [];
    return (seller.menuTypes || []).filter(mode => AUTHORIZED_SERVICE_MODES.includes(mode));
  }, [seller]);

  if (deviceSetupChecked && showDeviceSetup) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#213147] text-white p-8 text-center">
        <div className="bg-primary/10 p-6 rounded-[2rem] mb-6">
          <BellRing className="h-12 w-12 text-primary" />
        </div>

        {pushOutcome === 'success' ? (
          <>
            <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Notifications Enabled</h1>
            <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-6">
              This device is set up for order alerts. Now add {venueName} to your Home Screen so staff can launch it like an app:
            </p>
            <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest mb-8">
              Tap <Share className="h-4 w-4" /> then &ldquo;Add to Home Screen&rdquo;
            </div>
          </>
        ) : pushOutcome ? (
          <>
            <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">
              {pushOutcome === 'denied' ? 'Notifications Off' : 'Alerts Unavailable'}
            </h1>
            <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">
              {pushOutcome === 'denied'
                ? 'You can still use this device to take orders, but staff here won’t get push alerts for new orders.'
                : 'This browser can’t receive push alerts. You can still use this device to take orders.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Enable Notifications</h1>
            <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">
              {venueName} can alert this device when new orders come in - do this once before adding Koop to your Home Screen.
            </p>
          </>
        )}

        <Button
          onClick={pushOutcome ? finishDeviceSetup : handleEnablePush}
          disabled={isEnablingPush}
          className="h-14 px-8 bg-primary font-black uppercase tracking-widest text-xs gap-2 shadow-xl"
        >
          {isEnablingPush ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
          {pushOutcome ? 'Continue' : 'Enable Notifications'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 text-left">
      <Card className="w-full max-w-md shadow-2xl border-2 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8 bg-[#213147] text-white pt-10 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-20">
            <ShieldCheck className="h-20 w-20" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <StylizedKoopLogo size="lg" />
            <div className="space-y-1">
              <CardTitle className="font-headline text-xl font-black uppercase tracking-widest leading-none">
                {authenticatedStaff ? 'Select Role' : 'Staff Access'}
              </CardTitle>
              <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-[0.2em]">{venueName}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-10 pb-12 px-8 text-left">
          {!authenticatedStaff ? (
            <div className="space-y-10">
              <div className="flex justify-center gap-4">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-all duration-300",
                      pin.length > i 
                        ? "bg-[#213147] border-[#213147] scale-110 shadow-lg" 
                        : "bg-muted/50 border-muted-foreground/20"
                    )} 
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    disabled={isVerifying}
                    onClick={() => handleNumberClick(num.toString())}
                    className="h-16 text-2xl font-black rounded-2xl border-2 hover:bg-[#213147] hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  disabled={isVerifying}
                  onClick={handleClear}
                  className="h-16 text-muted-foreground hover:text-destructive"
                >
                  <Eraser className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  disabled={isVerifying}
                  onClick={() => handleNumberClick('0')}
                  className="h-16 text-2xl font-black rounded-2xl border-2 hover:bg-[#213147] hover:text-white transition-all shadow-sm active:scale-95"
                >
                  0
                </Button>
                <div className="flex items-center justify-center">
                  {isVerifying ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Lock className="h-6 w-6 text-muted-foreground/20" />}
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
                  <Smartphone className="h-3 w-3" /> Secure Initialized Device
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <div className="text-center space-y-2 mb-8">
                <div className="bg-green-500/10 p-3 rounded-full inline-block mb-2">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-headline font-bold text-lg text-[#213147]">{authenticatedStaff.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Shift Assignment</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {authorizedServiceModes.length > 0 ? (
                  authorizedServiceModes.map((type) => {
                    const Icon = roleIcons[type] || Building;
                    const fieldMap: any = { 'Beverage Cart': 'bevcartActive', 'Clubhouse': 'clubhouseActive', 'Lane Delivery': 'lanedeliveryActive' };
                    const isDeactivated = seller && !(seller as any)?.[fieldMap[type]];

                    return (
                      <Button
                        key={type}
                        variant="outline"
                        disabled={isDeactivated}
                        onClick={() => handleRoleSelect(type)}
                        className={cn(
                          "h-16 justify-start px-6 gap-4 border-2 rounded-2xl transition-all group relative",
                          isDeactivated ? "opacity-50 grayscale border-slate-100" : "hover:border-primary hover:bg-primary/5 shadow-sm"
                        )}
                      >
                        <div className="bg-muted group-hover:bg-primary/10 p-2 rounded-xl transition-colors">
                          <Icon className={cn("h-5 w-5", isDeactivated ? "text-slate-300" : "text-[#213147] group-hover:text-primary")} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest">{type}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{isDeactivated ? 'Deactivated by Admin' : 'Activate & Enter Dashboard'}</p>
                        </div>
                        {!isDeactivated && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                        {isDeactivated && <AlertTriangle className="ml-auto h-4 w-4 text-amber-500/40" />}
                      </Button>
                    );
                  })
                ) : (
                  <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-slate-50 space-y-3">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">No Authorized Modes</p>
                    <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">Please ask a manager to configure service channels in the Venue Admin.</p>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={() => setAuthenticatedStaff(null)}
                className="w-full text-muted-foreground font-bold uppercase text-[10px] tracking-widest mt-4"
              >
                Not you? Switch User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Button 
        variant="link" 
        asChild
        className="mt-8 text-muted-foreground uppercase text-[10px] font-black tracking-widest"
      >
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
