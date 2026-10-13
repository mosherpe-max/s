'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// Asks Stripe (through the refreshStripeStatus function) for a venue's current account status and saves it.
// With no venue id it checks every venue that has a Stripe account (Koop admin only).
export function useRefreshStripeStatus() {
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (venueId?: string) => {
    if (!firebaseApp) return;
    setIsRefreshing(true);
    try {
      const functions = getFunctions(firebaseApp, 'us-central1');
      const result = await httpsCallable(functions, 'refreshStripeStatus')(venueId ? { venueId } : {});
      const data = result.data as { checked: number; failed: { venueId: string; message: string }[] };
      if (data.failed.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some Venues Could Not Be Checked',
          description: `${data.checked} checked. ${data.failed.map(f => `${f.venueId}: ${f.message}`).join(' | ')}`,
        });
      } else {
        toast({
          title: 'Stripe Status Updated',
          description: data.checked === 0 ? 'No venue with a Stripe account was found.' : `Checked ${data.checked} venue${data.checked === 1 ? '' : 's'} with Stripe.`,
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could Not Check Stripe', description: e?.message || 'Please try again.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
}
