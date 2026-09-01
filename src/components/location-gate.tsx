'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationGateProps {
  venueName?: string;
  onEnabled: (position: { latitude: number; longitude: number } | null) => void;
}

/**
 * Full-screen gate shown before any driver/tracking screen that needs GPS.
 * Ties the geolocation permission prompt to an explicit button tap rather
 * than firing automatically on mount - iOS is known to kick standalone
 * home-screen web apps out into Safari when geolocation is requested
 * without a direct user gesture behind it.
 */
export function LocationGate({ venueName, onEnabled }: LocationGateProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const handleEnable = () => {
    if (denied || !navigator.geolocation) {
      onEnabled(null);
      return;
    }
    setIsRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (p) => onEnabled({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => {
        setIsRequesting(false);
        setDenied(true);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#213147] text-white p-8 text-center">
      <div className="bg-primary/10 p-6 rounded-[2rem] mb-6">
        <MapPin className="h-12 w-12 text-primary" />
      </div>
      <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Enable Location</h1>
      <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs mb-8">
        {denied
          ? "Location access was denied. You can still take orders, but your position won't show on the map."
          : `${venueName || 'Koop'} needs your live location to route orders to you and show patrons where you are.`}
      </p>
      <Button onClick={handleEnable} disabled={isRequesting} className="h-14 px-8 bg-primary font-black uppercase tracking-widest text-xs gap-2 shadow-xl">
        {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {denied ? 'Continue Without Location' : 'Enable Location & Start Shift'}
      </Button>
    </div>
  );
}
