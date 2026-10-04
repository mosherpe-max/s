'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DRIVING_RANGE,
  formatHole,
  getHoleOptions,
  getLocationFixSteps,
  needsPatronLocation,
  requestPatronLocation,
  type PatronLocation,
} from '@/lib/patron-location';

// What the patron gave us before paying: a real location, or the hole they're on.
export interface LocationChoice {
  location?: PatronLocation;
  hole?: string;
}

interface GateOptions {
  menuType?: string | null;
  holeCount?: number;
  hasDrivingRange?: boolean;
}

// Asks for the patron's location *before* they are charged. If they allow it we carry
// on straight away. If they don't, a dialog lets them try again or say which hole they're
// on, so the order is never placed without a way for staff to find them.
// askForLocation resolves to null if the patron backs out (nothing should be charged).
export function usePatronLocationGate({ menuType, holeCount, hasDrivingRange }: GateOptions) {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((choice: LocationChoice | null) => void) | null>(null);

  const finish = useCallback((choice: LocationChoice | null) => {
    setOpen(false);
    resolverRef.current?.(choice);
    resolverRef.current = null;
  }, []);

  // Call straight from the tap handler so the browser treats the prompt as user-initiated.
  const askForLocation = useCallback(async (): Promise<LocationChoice | null> => {
    if (!needsPatronLocation(menuType)) return {};
    const location = await requestPatronLocation(12000);
    if (location) return { location };
    return new Promise<LocationChoice | null>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, [menuType]);

  const gateDialog = (
    <LocationGateDialog
      open={open}
      holeCount={holeCount}
      hasDrivingRange={hasDrivingRange}
      onResolve={finish}
    />
  );

  return { askForLocation, gateDialog };
}

function LocationGateDialog({
  open,
  holeCount,
  hasDrivingRange,
  onResolve,
}: {
  open: boolean;
  holeCount?: number;
  hasDrivingRange?: boolean;
  onResolve: (choice: LocationChoice | null) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [stillBlocked, setStillBlocked] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [hole, setHole] = useState<string | null>(null);

  const options = getHoleOptions(holeCount, hasDrivingRange);
  const holes = options.filter((o) => o !== DRIVING_RANGE);

  useEffect(() => {
    if (open) {
      setChecking(false);
      setStillBlocked(false);
      setShowSteps(false);
      setHole(null);
    }
  }, [open]);

  // If they turn location on (in Settings, or the browser's site menu) and come back,
  // carry on automatically instead of making them tap again.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tryQuietly = async () => {
      const location = await requestPatronLocation(6000);
      if (location && !cancelled) onResolve({ location });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryQuietly();
    };
    document.addEventListener('visibilitychange', onVisible);
    let status: PermissionStatus | null = null;
    const onPermissionChange = () => {
      if (status?.state === 'granted') tryQuietly();
    };
    navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        s.addEventListener('change', onPermissionChange);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      status?.removeEventListener('change', onPermissionChange);
    };
  }, [open, onResolve]);

  const shareLocation = async () => {
    setChecking(true);
    const location = await requestPatronLocation(12000);
    setChecking(false);
    if (location) onResolve({ location });
    else setStillBlocked(true);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onResolve(null); }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto p-5 text-left">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#213147]">
            <Satellite className="h-4 w-4 text-primary" /> Where should we bring your order?
          </DialogTitle>
          <DialogDescription className="text-[11px] font-semibold text-muted-foreground">
            Your order isn&apos;t placed yet and you haven&apos;t been charged. Share your location so your driver can find you.
          </DialogDescription>
        </DialogHeader>

        <Button onClick={shareLocation} disabled={checking} className="w-full h-12 font-black uppercase tracking-widest text-xs gap-2">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Share my location
        </Button>

        {stillBlocked && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-[11px] font-bold text-amber-800">
              Your phone is blocking location for this page. Turn it on and come back, and we&apos;ll continue on our own. Or pick your hole below.
            </p>
            <button type="button" onClick={() => setShowSteps((v) => !v)} className="text-[10px] font-black uppercase tracking-widest text-amber-700 underline">
              {showSteps ? 'Hide steps' : 'How to turn it on'}
            </button>
            {showSteps && (
              <ol className="list-decimal pl-5 space-y-1 text-[11px] font-semibold text-amber-900">
                {getLocationFixSteps().map((s) => <li key={s}>{s}</li>)}
              </ol>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-slate-200" /> or tell us where you are <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-6 gap-1.5">
            {holes.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHole(h)}
                className={cn(
                  'h-10 rounded-lg border-2 text-sm font-black transition-colors',
                  hole === h ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-[#213147] hover:border-primary/40'
                )}
              >
                {h}
              </button>
            ))}
          </div>
          {hasDrivingRange && (
            <button
              type="button"
              onClick={() => setHole(DRIVING_RANGE)}
              className={cn(
                'w-full h-10 rounded-lg border-2 text-[11px] font-black uppercase tracking-widest transition-colors',
                hole === DRIVING_RANGE ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-[#213147] hover:border-primary/40'
              )}
            >
              {DRIVING_RANGE}
            </button>
          )}
          <Button
            variant="outline"
            disabled={!hole}
            onClick={() => hole && onResolve({ hole })}
            className="w-full h-11 border-2 font-black uppercase tracking-widest text-xs"
          >
            {hole ? `Continue from ${formatHole(hole)}` : 'Pick your hole'}
          </Button>
        </div>

        <button type="button" onClick={() => onResolve(null)} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive">
          Cancel
        </button>
      </DialogContent>
    </Dialog>
  );
}
