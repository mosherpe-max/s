
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function RefreshContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venueId');

  useEffect(() => {
    // Redirect back to dashboard to restart the flow
    if (venueId) {
      const timer = setTimeout(() => {
        router.push(`/sellers/${venueId}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [router, venueId]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 rounded-[2rem] overflow-hidden">
        <CardHeader className="text-center pb-8 bg-amber-500 text-white pt-10">
          <div className="flex justify-center mb-4">
            <RefreshCw className="h-16 w-16 animate-spin" />
          </div>
          <CardTitle className="font-headline text-2xl font-black uppercase tracking-widest">
            Session Expired
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10 pb-12 px-8 text-center space-y-6">
          <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Stripe onboarding links are temporary for your security. This session has timed out.
            </p>
          </div>
          
          <p className="text-muted-foreground text-sm font-medium">
            Redirecting you back to your dashboard to generate a fresh link...
          </p>

          <Button 
            className="w-full h-12 bg-[#213147] rounded-xl font-bold uppercase tracking-widest"
            onClick={() => router.push(venueId ? `/sellers/${venueId}` : '/')}
          >
            Restart Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingRefreshPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10" /></div>}>
      <RefreshContent />
    </Suspense>
  );
}
