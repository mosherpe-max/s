
'use client';

import React, { useState, useEffect, use } from 'react';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Smartphone, User, ShieldCheck, ChevronRight, X, Eraser, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Seller, StaffMember } from '@/lib/types';
import { StylizedKoopLogo } from '@/components/header';

export default function StaffLoginPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [venueName, setVenueName] = useState('This Venue');

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
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => setPin('');

  const verifyPin = async (code: string) => {
    if (!firestore) return;
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
        const staffData = snapshot.docs[0].data() as StaffMember;
        
        // Persist session
        localStorage.setItem('koop_staff_id', staffData.id);
        localStorage.setItem('koop_staff_name', staffData.name);
        localStorage.setItem('koop_staff_role', staffData.role);
        localStorage.setItem('koop_staff_session_start', Date.now().toString());

        toast({ 
          title: `Welcome, ${staffData.name}`, 
          description: "Access granted. Launching dashboard..." 
        });

        // Route to appropriate dashboard
        setTimeout(() => {
          switch (staffData.role) {
            case 'Driver': router.push(`/sellers/${sellerId}/bevcart`); break;
            case 'Server': router.push(`/sellers/${sellerId}/clubhouse`); break;
            default: router.push(`/sellers/${sellerId}/clubhouse`); break;
          }
        }, 1000);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Verification Error", description: error.message });
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8 bg-[#213147] text-white pt-10 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-20">
            <ShieldCheck className="h-20 w-20" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <StylizedKoopLogo size="lg" />
            <div className="space-y-1">
              <CardTitle className="font-headline text-xl font-black uppercase tracking-widest leading-none">Staff Access</CardTitle>
              <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-[0.2em]">{venueName}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-10 pb-12 px-8 space-y-10">
          {/* PIN Indicators */}
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

          {/* Keypad */}
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
