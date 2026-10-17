'use client';

import { useEffect, useState } from 'react';

// True while the on-screen keyboard is up. The visual viewport shrinks when the
// keyboard opens (including for Stripe's card fields, which live in an iframe
// and so never fire focus events in this document); the layout viewport doesn't.
export function useKeyboardOpen() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setIsOpen(window.innerHeight - vv.height * vv.scale > 150);
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return isOpen;
}
