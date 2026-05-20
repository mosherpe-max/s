'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Deprecated route formerly used for payment onboarding.
 * Now redirects to the platform home page.
 */
export default function OnboardingRefreshPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground animate-pulse text-[10px] font-black uppercase tracking-widest">
        Session Refreshed. Redirecting...
      </p>
    </div>
  );
}
