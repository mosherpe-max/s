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
      'Come back to this page and tap Try again.',
    ];
  }
  return [
    'Tap the lock or tune icon next to the web address.',
    'Tap Permissions, then Location, and choose Allow.',
    'Tap Try again.',
  ];
}
