'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '@/firebase/provider';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * In development it throws them so the Next.js error overlay points straight at the
 * failing query or rule. In production it only logs them: this component lives in the
 * root layout, above every error boundary, so throwing here takes down the whole app
 * with the generic "Application error" page, and a phone that reopens on the same
 * page crashes again every time. A denied read just leaves that screen without data.
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
      if (process.env.NODE_ENV !== 'development') {
        console.error('Firestore permission error:', error);
        return;
      }
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
