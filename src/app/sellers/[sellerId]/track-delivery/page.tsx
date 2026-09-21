
'use client';

import { useState, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle2 } from 'lucide-react';

/**
 * Opened in an actual Safari tab, never inside the installed standalone app -
 * confirmed on-device that any geolocation call from inside that installed
 * app ejects it into Safari chrome, even a single gesture-gated
 * getCurrentPosition() call with no permission dialog ever shown. Continuous
 * watchPosition tracking is safe here specifically because this page never
 * runs inside that standalone context - bevcart/clubhouse link out to this
 * page (window.open, a fresh tab) instead of asking for location themselves.
 */
export default function TrackDeliveryPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const searchParams = useSearchParams();
  const staffId = searchParams.get('staffId') || '';
  const firestore = useFirestore();

  const [status, setStatus] = useState<'idle' | 'sharing' | 'denied' | 'unsupported'>('idle');
  const watchIdRef = useRef<number | null>(null);

  const handleStart = () => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!firestore || !staffId) return;
        setDoc(doc(firestore, 'sellers', sellerId, 'staff', staffId), {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          lastActive: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true }
    );
    setStatus('sharing');
  };

  const handleStop = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#213147] text-white p-8 text-center">
      <div className="bg-primary/10 p-6 rounded-[2rem] mb-6">
        <MapPin className="h-12 w-12 text-primary" />
      </div>

      {status === 'sharing' ? (
        <>
          <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Sharing Live Location</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">
            Keep this tab open while you're out for delivery - patrons can see your position update on the map. You can switch back to the Koop app now; this tab keeps sharing in the background.
          </p>
          <Button onClick={handleStop} className="h-14 px-8 bg-primary font-black uppercase tracking-widest text-xs gap-2 shadow-xl">
            <CheckCircle2 className="h-4 w-4" /> Done - Stop Sharing
          </Button>
        </>
      ) : status === 'denied' ? (
        <>
          <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Location Denied</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs">
            Patrons won't see your live position for this delivery. You can still deliver normally from the Koop app.
          </p>
        </>
      ) : status === 'unsupported' ? (
        <>
          <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Not Supported</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs">
            This browser can't share your location. You can still deliver normally from the Koop app.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Share Live Location</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">
            Turn this on before heading out so patrons can see your position update on the map.
          </p>
          <Button onClick={handleStart} className="h-14 px-8 bg-primary font-black uppercase tracking-widest text-xs gap-2 shadow-xl">
            <MapPin className="h-4 w-4" /> Start Sharing
          </Button>
        </>
      )}
    </div>
  );
}
