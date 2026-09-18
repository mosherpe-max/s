'use client';

import { useEffect, useState } from 'react';

/**
 * True once the user has made any direct gesture (tap/click) on this page.
 * This iOS build ejects the installed standalone PWA into Safari browser
 * chrome when a restricted browser API is touched before any user gesture
 * has occurred on the page - already confirmed for navigator.permissions
 * .query('geolocation') and Notification.permission (see LocationGate and
 * the staff pages' history). Web Audio's AudioContext is the same class of
 * API, so anything gated by this hook gets the same protection without
 * depending on a mode-specific gate screen (e.g. laneside has no
 * geolocation flow, so no equivalent of LocationGate's own tap already
 * exists there).
 */
export function useHasInteracted(): boolean {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (hasInteracted) return;
    const markInteracted = () => setHasInteracted(true);
    document.addEventListener('pointerdown', markInteracted, { once: true });
    return () => document.removeEventListener('pointerdown', markInteracted);
  }, [hasInteracted]);

  return hasInteracted;
}
