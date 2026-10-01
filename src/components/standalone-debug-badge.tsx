'use client';

import { useEffect, useState } from 'react';

// TEMPORARY DIAGNOSTIC - remove once the staff-terminal standalone-ejection
// bug is root-caused. Every JS-side theory tested so far (geolocation, the
// window.open GPS tab, router.push's pushState, a delayed window.location
// navigation, an immediate window.location navigation, a fully fresh
// install with no cached manifest) has been directly disproven on-device -
// the break is 100% reproducible regardless. Without Mac access there's no
// Safari remote Web Inspector available, so this expands the on-screen
// probe to surface what DevTools would normally show: the full URL (catches
// a silent protocol/host change a bare pathname would hide), whether the
// browser's own Navigation Timing API recorded a redirect, document.referrer,
// and any JS errors/unhandled rejections, all without needing a computer.
export function StandaloneDebugBadge() {
  const [info, setInfo] = useState<{
    standalone: string;
    displayModeMedia: string;
    manifestHref: string;
    href: string;
    referrer: string;
    navType: string;
    redirectCount: string;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setErrors((prev) => [...prev, `error: ${event.message} @ ${event.filename}:${event.lineno}`].slice(-5));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      setErrors((prev) => [...prev, `unhandledrejection: ${String(event.reason)}`].slice(-5));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      setInfo({
        standalone: String((window.navigator as any).standalone),
        displayModeMedia: String(window.matchMedia?.('(display-mode: standalone)').matches),
        manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '(none)',
        href: window.location.href,
        referrer: document.referrer || '(none)',
        navType: nav?.type ?? '(unknown)',
        redirectCount: nav ? String(nav.redirectCount) : '(unknown)',
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
        background: 'rgba(0,0,0,0.9)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: '8px',
        padding: '4px 6px',
        pointerEvents: 'none',
        lineHeight: 1.35,
        wordBreak: 'break-all',
        maxHeight: '45vh',
        overflow: 'hidden',
      }}
    >
      <div>href: {info.href}</div>
      <div>referrer: {info.referrer}</div>
      <div>nav.type: {info.navType} | redirectCount: {info.redirectCount}</div>
      <div>navigator.standalone: {info.standalone} | display-mode media: {info.displayModeMedia}</div>
      <div>manifest href: {info.manifestHref}</div>
      {errors.length > 0 && (
        <div style={{ color: '#f55' }}>
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
    </div>
  );
}
