'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * TEMPORARY diagnostic overlay for the standalone-PWA-losing-full-screen
 * investigation. Shows the live value of the flags iOS/WebKit itself uses
 * to decide display mode, updated on an interval so a screenshot at any
 * point in the staff flow shows the actual state at that moment - instead
 * of inferring it from what the UI looks like. Remove once the root cause
 * is found and fixed.
 */
export function StandaloneDebugBadge() {
  const pathname = usePathname();
  const [info, setInfo] = useState({
    navStandalone: 'n/a',
    displayModeStandalone: 'n/a',
    visualViewportH: 0,
    innerH: 0,
  });

  useEffect(() => {
    const read = () => {
      setInfo({
        navStandalone: typeof (window.navigator as any).standalone === 'boolean'
          ? String((window.navigator as any).standalone)
          : 'unsupported',
        displayModeStandalone: window.matchMedia
          ? String(window.matchMedia('(display-mode: standalone)').matches)
          : 'n/a',
        visualViewportH: Math.round(window.visualViewport?.height ?? 0),
        innerH: window.innerHeight,
      });
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.75)',
        color: '#0f0',
        fontSize: 9,
        fontFamily: 'monospace',
        padding: '2px 4px',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      SA:{info.navStandalone} DM:{info.displayModeStandalone} VV:{info.visualViewportH} IH:{info.innerH} {pathname}
    </div>
  );
}
