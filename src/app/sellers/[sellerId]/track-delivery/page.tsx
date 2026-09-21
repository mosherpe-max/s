
'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import type { SolutionConfig } from '@/lib/types';
import { MapPin } from 'lucide-react';

const ROUTE_BY_ROLE: Record<string, string> = {
  'Beverage Cart': 'bevcart',
  'Clubhouse': 'clubhouse',
  'Lane Delivery': 'laneside',
};

/**
 * Opened automatically (window.open, a fresh tab) the moment staff select
 * Beverage Cart or Clubhouse at login - never manually, and never inside the
 * installed standalone app. Confirmed on-device that any geolocation call
 * from inside that installed app ejects it into Safari chrome every time,
 * even a single gesture-gated getCurrentPosition() with no permission dialog
 * ever shown, granted or not - so live GPS can only come from here.
 *
 * Starts watchPosition immediately (no separate tap - staff shouldn't have
 * to do anything after login) and then hands this same tab off to the real
 * dashboard using the exact staff session (same sessionId) the login tab
 * already wrote to Firestore, so neither tab supersedes the other. The
 * geolocation watch is never explicitly cleared, so it keeps running under
 * the dashboard page that replaces this one in the same tab.
 */
export default function TrackDeliveryPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();

  const staffId = searchParams.get('staffId') || '';
  const staffName = searchParams.get('staffName') || '';
  const role = searchParams.get('role') || '';
  const sessionId = searchParams.get('sessionId') || '';

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: solutionConfig } = useDoc<SolutionConfig>(configRef);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Read via a ref so the long-lived watchPosition callback below (started
  // once, never recreated) always throttles against the current admin
  // setting rather than whatever it was on the first render.
  const pollIntervalMsRef = useRef(15000);
  useEffect(() => {
    pollIntervalMsRef.current = (solutionConfig?.driverGpsPollIntervalSeconds || 15) * 1000;
  }, [solutionConfig?.driverGpsPollIntervalSeconds]);

  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          if (!firestore || !staffId) return;
          // watchPosition can fire far more often than the admin's
          // configured broadcast interval (multiple times a second in some
          // conditions), so it stays running for freshness but only writes
          // to Firestore once per interval - keeping the driver GPS Poll
          // Interval admin setting meaningful again after the redesign
          // that replaced the old setInterval+getCurrentPosition polling.
          const now = Date.now();
          if (now - lastWriteRef.current < pollIntervalMsRef.current) return;
          lastWriteRef.current = now;
          setDoc(doc(firestore, 'sellers', sellerId, 'staff', staffId), {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            lastActive: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    if (!staffId || !staffName || !role || !sessionId) {
      setStatusMessage("Missing session details - please close this tab and try again from the staff login screen.");
      return;
    }

    localStorage.setItem('koop_is_admin_session', 'false');
    localStorage.setItem('koop_staff_id', staffId);
    localStorage.setItem('koop_staff_name', staffName);
    localStorage.setItem('koop_staff_role', role);
    localStorage.setItem('koop_staff_session_start', Date.now().toString());
    localStorage.setItem('koop_venue_id', sellerId);
    localStorage.setItem('koop_staff_session_id', sessionId);
    localStorage.removeItem('koop_staff_last_hidden');

    router.replace(`/sellers/${sellerId}/${ROUTE_BY_ROLE[role] || 'bevcart'}`);
  }, [firestore, sellerId, staffId, staffName, role, sessionId, router]);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#213147] text-white p-8 text-center">
      <div className="bg-primary/10 p-6 rounded-[2rem] mb-6">
        <MapPin className="h-12 w-12 text-primary animate-pulse" />
      </div>
      <h1 className="font-headline text-xl font-black uppercase tracking-tight mb-3">Starting Your Shift</h1>
      <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs">
        {statusMessage || 'One moment...'}
      </p>
    </div>
  );
}
