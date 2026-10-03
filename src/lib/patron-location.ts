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
