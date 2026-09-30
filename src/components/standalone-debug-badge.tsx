'use client';

import { useEffect, useState } from 'react';

// TEMPORARY DIAGNOSTIC - remove once the staff-terminal standalone-ejection
// bug is root-caused. Shows, on every screen, exactly what the browser
// reports about its own display mode and manifest at that instant, so we
// can compare readings from a known-good screen (staff-login) against a
// screen where the app has broken into Safari chrome (bevcart/clubhouse/
// laneside), in the same test run, without needing Safari remote debugging.
export function StandaloneDebugBadge() {
  const [info, setInfo] = useState<{
    standalone: string;
    displayModeMedia: string;
    manifestHref: string;
    path: string;
  } | null>(null);

  useEffect(() => {
    const update = () => {
      setInfo({
        standalone: String((window.navigator as any).standalone),
        displayModeMedia: String(window.matchMedia?.('(display-mode: standalone)').matches),
        manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '(none)',
        path: window.location.pathname,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!info) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: '9px',
        padding: '4px 6px',
        pointerEvents: 'none',
        lineHeight: 1.4,
        wordBreak: 'break-all',
      }}
    >
      path: {info.path} | navigator.standalone: {info.standalone} | display-mode:standalone media: {info.displayModeMedia} | manifest href: {info.manifestHref}
    </div>
  );
}
