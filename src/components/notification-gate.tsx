'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { subscribeToPushNotifications } from '@/lib/push-notifications';

interface NotificationGateProps {
  venueName?: string;
  sellerId: string;
  staffId: string;
  onDone: () => void;
}

/**
 * Full-screen gate shown before the dashboard on every staff mode - ties
 * the notification permission prompt to an explicit button tap, same
 * reason LocationGate does that for geolocation. Reaches every mode,
 * including Lane Delivery, which has no geolocation flow of its own to
 * borrow a tap from.
 */
export function NotificationGate({ venueName, sellerId, staffId, onDone }: NotificationGateProps) {
  const firestore = useFirestore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [outcome, setOutcome] = useState<'denied' | 'unsupported' | 'unconfigured' | null>(null);

  const handleEnable = async () => {
    if (!firestore) {
      onDone();
      return;
    }
    setIsRequesting(true);
    const result = await subscribeToPushNotifications(firestore, sellerId, staffId).catch(() => 'denied' as const);
    setIsRequesting(false);
    if (result === 'subscribed') {
      onDone();
    } else {
      setOutcome(result);
    }
  };

  const message = outcome === 'unsupported'
    ? "This device or browser doesn't support push alerts. You can still take orders."
    : outcome === 'unconfigured'
    ? "Push alerts aren't set up yet for this venue. You can still take orders."
    : outcome === 'denied'
    ? "Notifications were denied. You can still take orders, but won't get alerts when the app is in the background."
    : `${venueName || 'Koop'} can alert you here even when the app is backgrounded or your screen is off - new orders, and any running late.`;

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#213147] text-white p-8 text-center">
      <div className="bg-primary/10 p-6 rounded-[2rem] mb-6">
        <BellRing className="h-12 w-12 text-primary" />
      </div>
      <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Enable Notifications</h1>
      <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">{message}</p>
      <Button
        onClick={outcome ? onDone : handleEnable}
        disabled={isRequesting}
        className="h-14 px-8 bg-primary font-black uppercase tracking-widest text-xs gap-2 shadow-xl"
      >
        {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        {outcome ? 'Continue to Dashboard' : 'Enable Notifications'}
      </Button>
    </div>
  );
}
