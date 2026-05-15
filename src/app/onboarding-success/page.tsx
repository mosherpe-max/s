
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ArrowRight, ShieldCheck, Globe, AlertCircle } from 'lucide-react';
import { StylizedKoopLogo } from '@/components/header';
import { useFirebaseApp } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Link from 'next/link';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const firebaseApp = useFirebaseApp();
  const code = searchParams.get('code');
  const sellerId = searchParams.get('state'); // sellerId was passed as 'state'
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function exchangeToken() {
      if (!code || !sellerId) {
        setStatus('error');
        setErrorMessage('Missing authorization credentials from Stripe.');
        return;
      }

      try {
        const functions = getFunctions(firebaseApp, 'us-central1');
        const finalize = httpsCallable(functions, 'finalizeStripeOnboarding');
        
        await finalize({ code, sellerId });
        setStatus('success');
      } catch (e: any) {
        console.error('[TOKEN-EXCHANGE-FAIL]', e);
        setStatus('error');
        setErrorMessage(e.message || 'The secure handshake with Stripe failed.');
      }
    }

    exchangeToken();
  }, [code, sellerId, firebaseApp]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-2 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8 bg-[#213147] text-white pt-12">
          <div className="flex justify-center mb-6">
            <StylizedKoopLogo size="lg" />
          </div>
          <CardTitle className="font-headline text-2xl font-black uppercase tracking-widest">
            {status === 'error' ? 'Connection Failed' : 'Stripe Verified'}
          </CardTitle>
          <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-[0.3em]">
            {status === 'processing' ? 'Finalizing Handshake...' : 'Integration Complete'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-12 pb-10 px-10 text-center">
          {status === 'processing' ? (
            <div className="space-y-6 py-10">
              <div className="flex justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
              </div>
              <div className="space-y-2">
                <p className="font-headline font-black uppercase tracking-tight text-xl">Securing Credentials...</p>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Exchanging secure authorization token with Stripe</p>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-center">
                <div className="bg-red-500/10 p-6 rounded-full border-2 border-red-500/20 shadow-xl">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-headline font-black text-2xl text-[#213147] uppercase">Handshake Error</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
              </div>
              <Button asChild variant="outline" className="w-full h-14 border-2 font-black uppercase tracking-widest rounded-2xl">
                <Link href={`/sellers/${sellerId}`}>Try Again</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-center">
                <div className="bg-green-500/10 p-6 rounded-full border-2 border-green-500/20 shadow-xl shadow-green-500/5">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-headline font-black text-2xl text-[#213147] uppercase leading-tight">
                  Authorization Captured
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Your Stripe identity has been verified. The platform is now configured to route digital payments to your account.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-muted/50 p-4 rounded-2xl border">
                <div className="flex flex-col items-center gap-1 border-r pr-4">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Venue Identity</span>
                  <span className="text-xs font-bold uppercase truncate w-full">{sellerId}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Provider Status</span>
                  <span className="text-xs font-bold uppercase text-green-600 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button asChild size="lg" className="w-full h-14 bg-[#213147] hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all">
                  <Link href={`/sellers/${sellerId}`}>
                    Return to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-muted/10 border-t py-6 flex justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> Secure Multi-Tenant Architecture v3
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
