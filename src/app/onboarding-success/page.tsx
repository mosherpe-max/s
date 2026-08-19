'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venueId');

  useEffect(() => {
    // Automatically redirect back to the venue admin after a few seconds
    const timer = setTimeout(() => {
      if (venueId) {
        router.push(`/sellers/${venueId}`);
      } else {
        router.push('/');
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [router, venueId]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-8 bg-green-600 text-white pt-10">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16" />
          </div>
          <CardTitle className="font-headline text-2xl font-black uppercase tracking-widest">
            Setup Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10 pb-12 px-8 text-center space-y-6">
          <p className="text-muted-foreground font-medium">
            Your business details have been securely submitted to Stripe. You are now authorized to accept payments and receive payouts.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Returning to Dashboard...
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl font-bold uppercase tracking-widest gap-2"
            onClick={() => router.push(venueId ? `/sellers/${venueId}` : '/')}
          >
            Go Now <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
