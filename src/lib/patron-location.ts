export interface PatronLocation {
  latitude: number;
  longitude: number;
}

// Service modes where staff come find the patron by GPS (lanes use a lane number instead).
export function needsPatronLocation(menuType: unknown): boolean {
  return menuType === 'Beverage Cart' || menuType === 'Clubhouse';
}

// One position read for the moment a patron pays. Resolves to null (never rejects)
// if location is denied, unavailable or too slow, so checkout is never blocked on it.
// Call it straight from the tap handler so the browser treats it as user-initiated.
export function requestPatronLocation(timeoutMs = 8000): Promise<PatronLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

// How a patron turns location back on after blocking it. Browsers can't reopen the
// permission prompt once it's been denied, so this is the way back.
export function getLocationFixSteps(): string[] {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPad|iPhone|iPod/.test(ua)) {
    return [
      'Open the Settings app.',
      'Tap Privacy & Security, then Location Services.',
      'Find Safari Websites (or Koop if you use it from your Home Screen) and choose While Using the App.',
      'Back in Safari, tap the aA button in the address bar, then Website Settings, then Location, and choose Allow. (Safari remembers a "Don\'t Allow" for each website, even after Location Services is turned on.)',
      'Reload this page, then tap Try again.',
    ];
  }
  return [
    'Tap the lock or tune icon next to the web address.',
    'Tap Permissions, then Location, and choose Allow.',
    'Tap Try again.',
  ];
}

export const DRIVING_RANGE = 'Driving Range';
export const DEFAULT_HOLE_COUNT = 18;

// The places a patron can say they are when they won't share location:
// each hole number, then the driving range if the course has one.
export function getHoleOptions(holeCount?: number, hasDrivingRange?: boolean): string[] {
  const count = holeCount && holeCount > 0 ? holeCount : DEFAULT_HOLE_COUNT;
  const holes = Array.from({ length: count }, (_, i) => String(i + 1));
  return hasDrivingRange ? [...holes, DRIVING_RANGE] : holes;
}

export function formatHole(hole: string): string {
  return hole === DRIVING_RANGE ? DRIVING_RANGE : `Hole ${hole}`;
}

// Where on the hole a patron is, when they told us a hole instead of sharing location. Optional: a tee box, the
// fairway and a green are hundreds of yards apart, and a cart usually meets a group at a tee or a green.
export const HOLE_POSITIONS = ['Tee', 'Fairway', 'Green'] as const;
export type HolePosition = (typeof HOLE_POSITIONS)[number];
export const isHolePosition = (v: unknown): v is HolePosition => typeof v === 'string' && (HOLE_POSITIONS as readonly string[]).includes(v);

// "Hole 7 · Green", or just "Hole 7" when they didn't say where on the hole. The driving range has no tee or green.
export function formatHolePlace(hole: string, position?: unknown): string {
  return hole !== DRIVING_RANGE && isHolePosition(position) ? `${formatHole(hole)} · ${position}` : formatHole(hole);
}

// About how long a group takes to play one hole. A course can set its own (seller.minutesPerHole).
export const DEFAULT_MINUTES_PER_HOLE = 13;

export type HoleAge = 'fresh' | 'moved-on' | 'ahead';
export interface HoleAgeStatus { level: HoleAge; label: string | null; holesAhead: number }

// How much to trust a hole the patron gave us, by how long ago they said it. After about one hole's worth of time the group
// has probably moved on; after two they are probably two or more holes ahead. Only an estimate (pace varies), so the wording
// is soft. Does not apply to the driving range, where people stay put.
export function holeAgeStatus(minutesAgo: number | null, hole?: string, minutesPerHole?: number): HoleAgeStatus {
  const pace = minutesPerHole && minutesPerHole > 0 ? minutesPerHole : DEFAULT_MINUTES_PER_HOLE;
  if (minutesAgo === null || !hole || hole === DRIVING_RANGE || minutesAgo < pace) return { level: 'fresh', label: null, holesAhead: 0 };
  const holesAhead = Math.floor(minutesAgo / pace);
  return holesAhead >= 2
    ? { level: 'ahead', label: `Probably ${holesAhead}+ holes ahead`, holesAhead }
    : { level: 'moved-on', label: 'May have moved on', holesAhead };
}
