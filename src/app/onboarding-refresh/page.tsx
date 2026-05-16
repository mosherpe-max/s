
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { StylizedKoopLogo } from '@/components/header';

function OnboardingRefreshContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('sellerId');

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-2 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="text-center pb-8 bg-amber-600 text-white pt-10">
          <div className="flex flex-col items-center gap-4">
            <StylizedKoopLogo size="lg" />
            <CardTitle className="font-headline text-xl font-black uppercase tracking-widest">Link Expired</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-10 pb-12 px-8 flex flex-col items-center text-center space-y-6">
          <div className="bg-amber-100 p-4 rounded-full">
            <AlertCircle className="h-12 w-12 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg">Onboarding Incomplete</h3>
            <p className="text-sm text-muted-foreground">
              The Stripe security session has timed out. Please return to your dashboard and click the connect button again to resume setup.
            </p>
          </div>
          <Button 
            className="w-full h-14 bg-amber-600 hover:bg-amber-700 font-headline font-black uppercase tracking-widest"
            onClick={() => router.push(`/sellers/${sellerId}`)}
          >
            Restart Setup <RotateCcw className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingRefreshPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingRefreshContent />
    </Suspense>
  );
}
