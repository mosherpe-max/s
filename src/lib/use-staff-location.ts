'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import {
  LIVE_WATCH_OPTIONS, QUICK_FIX_OPTIONS, RESUME_FIX_OPTIONS, STILL_LOOKING_AFTER_MS, shouldWritePosition, statusFromGeoError,
  type StaffLocationStatus,
} from '@/lib/staff-location';

export interface StaffPosition {
  latitude: number;
  longitude: number;
}

// Starts sharing a signed-in staff member's position as soon as their terminal opens: a quick rough fix right
// away, then a precise live watch. The position is also returned directly, so their own "YOU" marker doesn't
// wait for the round trip through Firestore. Reports a status (and a retry) so the screen can say what is
// wrong instead of silently showing nothing.
export function useStaffLocation(options: {
  firestore: Firestore | null | undefined;
  sellerId: string;
  staffId: string | undefined;
  pollIntervalMs: number;
}): { status: StaffLocationStatus; position: StaffPosition | undefined; retry: () => void } {
  const { firestore, sellerId, staffId, pollIntervalMs } = options;
  const [status, setStatus] = useState<StaffLocationStatus>('starting');
  const [position, setPosition] = useState<StaffPosition | undefined>();
  const [attempt, setAttempt] = useState(0);
  const lastWriteRef = useRef(0);
  const pollRef = useRef(pollIntervalMs);
  pollRef.current = pollIntervalMs;

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  useEffect(() => {
    if (!firestore || !staffId) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    let saveFailed = false;
    let watchId: number | null = null;
    let permission: PermissionStatus | null = null;
    const staffRef = doc(firestore, 'sellers', sellerId, 'staff', staffId);

    setStatus('starting');
    lastWriteRef.current = 0;

    const publish = (pos: GeolocationPosition, force: boolean) => {
      if (cancelled) return;
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setPosition(next);
      setStatus(saveFailed ? 'save-failed' : 'sharing');
      const now = Date.now();
      if (!shouldWritePosition(now, lastWriteRef.current, pollRef.current, force)) return;
      lastWriteRef.current = now;
      setDoc(staffRef, { ...next, lastActive: serverTimestamp() }, { merge: true })
        .then(() => { saveFailed = false; if (!cancelled) setStatus('sharing'); })
        .catch(() => { saveFailed = true; if (!cancelled) setStatus('save-failed'); });
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      const next = statusFromGeoError(err.code);
      // A passing timeout after a good fix is not worth alarming anyone about; being denied always is.
      setStatus(prev => (prev === 'sharing' && next !== 'denied' ? prev : next));
    };

    const stillLooking = setTimeout(() => { if (!cancelled) setStatus(prev => (prev === 'starting' ? 'searching' : prev)); }, STILL_LOOKING_AFTER_MS);

    navigator.geolocation.getCurrentPosition(p => publish(p, true), onError, QUICK_FIX_OPTIONS);
    watchId = navigator.geolocation.watchPosition(p => publish(p, false), onError, LIVE_WATCH_OPTIONS);

    // If location is switched on in Settings while the app is open, pick it up without a restart.
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(result => {
      if (cancelled) return;
      permission = result;
      if (result.state === 'denied') setStatus('denied');
      result.onchange = () => {
        if (result.state === 'denied') setStatus('denied');
        else setAttempt(a => a + 1);
      };
    }).catch(() => {});

    // iOS pauses location while the app is in the background; take a fresh fix the moment it comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        navigator.geolocation.getCurrentPosition(p => publish(p, true), onError, RESUME_FIX_OPTIONS);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearTimeout(stillLooking);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (permission) permission.onchange = null;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [firestore, sellerId, staffId, attempt]);

  return { status, position, retry };
}
