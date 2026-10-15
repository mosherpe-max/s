// Sharing a staff member's live position with the venue (the "YOU" marker on their own map, and where
// patrons and the venue admin see them). Pure helpers, kept free of the browser so they can be tested.
// See useStaffLocation for the part that talks to the device and Firestore.

export type StaffLocationStatus =
  | 'starting'      // asked the device, no answer yet
  | 'searching'     // the device is still working out where it is
  | 'sharing'       // have a position and it is being shared
  | 'denied'        // location is turned off for this app
  | 'unavailable'   // the device cannot get a fix right now
  | 'save-failed'   // have a position but could not send it to the venue
  | 'unsupported';  // this browser has no location support

// GeolocationPositionError codes: 1 permission denied, 2 position unavailable, 3 timed out.
export function statusFromGeoError(code: number): StaffLocationStatus {
  if (code === 1) return 'denied';
  if (code === 3) return 'searching';
  return 'unavailable';
}

// The first position of a session is always sent; after that at most one every poll interval. Forced
// refreshes (coming back to the app) still keep a small gap so a flicker of visibility can't flood writes.
export const MIN_FORCED_WRITE_GAP_MS = 3000;

// How long to wait on the first fix before saying we are still looking (and offering a retry). A location
// permission prompt that nobody has answered never reports an error, so this is what notices it.
export const STILL_LOOKING_AFTER_MS = 12_000;

export function shouldWritePosition(nowMs: number, lastWriteMs: number, intervalMs: number, force = false): boolean {
  if (lastWriteMs <= 0) return true;
  const gap = nowMs - lastWriteMs;
  return force ? gap >= MIN_FORCED_WRITE_GAP_MS : gap >= intervalMs;
}

// A quick, rough fix first (a recent cached one is fine) so the map has something within seconds, then a
// precise live watch. Without the first, a cold GPS fix indoors can take a minute or more.
export const QUICK_FIX_OPTIONS = { enableHighAccuracy: false, maximumAge: 120_000, timeout: 10_000 } as const;
export const LIVE_WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 } as const;
export const RESUME_FIX_OPTIONS = { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 } as const;

export interface LocationNotice {
  title: string;
  detail: string;
  canRetry: boolean;
  tone: 'info' | 'warn';
}

// What to tell the staff member. Null when all is well and there is nothing to show.
export function locationNotice(status: StaffLocationStatus): LocationNotice | null {
  switch (status) {
    case 'sharing':
      return null;
    case 'starting':
      return { title: 'Finding your location…', detail: 'This can take a few seconds.', canRetry: false, tone: 'info' };
    case 'searching':
      return {
        title: 'Still looking for your location…',
        detail: 'If your phone asks to use your location, tap Allow. Being outdoors helps. You can also tap Try Again.',
        canRetry: true,
        tone: 'info',
      };
    case 'denied':
      return {
        title: 'Location is turned off',
        detail: 'Turn it on in your phone Settings under Privacy & Security, Location Services (allow it for Safari or this app, "While Using"), then tap Try Again.',
        canRetry: true,
        tone: 'warn',
      };
    case 'unavailable':
      return { title: "Can't get your location right now", detail: 'Check that Location Services is on and try moving outdoors, then tap Try Again.', canRetry: true, tone: 'warn' };
    case 'save-failed':
      return { title: "Location found, but it isn't reaching the venue", detail: 'Check your connection, then tap Try Again.', canRetry: true, tone: 'warn' };
    case 'unsupported':
      return { title: 'This device can’t share location', detail: 'Try a different phone or browser.', canRetry: false, tone: 'warn' };
  }
}
