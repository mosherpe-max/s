'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '@/firebase/provider';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by the nearest Next.js error boundary (error.tsx).
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);
  const [mounted, setMounted] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    setMounted(true);
    const handleError = (error: FirestorePermissionError) => {
      // Signing out revokes access, so open listeners fail with permission errors.
      // That is expected and must not crash the page while it navigates to /login.
      if (auth && !auth.currentUser) return;
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [auth]);

  // Hydration Guard: Only throw on the client after mount to prevent startup crashes.
  if (mounted && error) {
    throw error;
  }

  return null;
}
