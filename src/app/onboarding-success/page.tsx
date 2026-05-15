
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Stripe Onboarding is no longer active.
 * Redirecting users back to the home page.
 */
export default function OnboardingSuccessRedirect() {
  useEffect(() => {
    redirect('/');
  }, []);

  return null;
}
