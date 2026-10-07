'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { DEFAULT_PATRON_TERMS, type PatronTermsDocument } from '@/lib/patron-terms-default';

const TERMS_STORAGE_KEY = 'koop_terms_accepted_version';
const LOAD_TIMEOUT_MS = 4000;

// The Terms currently in force: whatever a Koop Admin last published at
// solution/patronTerms, or the built-in default if none has been published (or it
// can't be read, e.g. offline), so checkout never gets stuck waiting on it.
export async function loadActivePatronTerms(firestore: Firestore): Promise<PatronTermsDocument> {
  try {
    const snap = await Promise.race([
      getDoc(doc(firestore, 'solution', 'patronTerms')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS)),
    ]);
    const data = snap && snap.exists() ? snap.data() : null;
    if (data && typeof data.version === 'string' && Array.isArray(data.blocks) && data.blocks.length > 0) {
      return {
        version: data.version,
        title: typeof data.title === 'string' && data.title ? data.title : DEFAULT_PATRON_TERMS.title,
        blocks: data.blocks,
        fileName: typeof data.fileName === 'string' ? data.fileName : null,
      };
    }
  } catch {
    // Fall through to the built-in text.
  }
  return DEFAULT_PATRON_TERMS;
}

// The Terms in force, or null while they are still loading.
export function useActivePatronTerms(): PatronTermsDocument | null {
  const firestore = useFirestore();
  const [terms, setTerms] = useState<PatronTermsDocument | null>(null);

  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    loadActivePatronTerms(firestore).then((t) => { if (!cancelled) setTerms(t); });
    return () => { cancelled = true; };
  }, [firestore]);

  return terms;
}

// Tracks whether this device's patron has agreed to the current Terms, so the
// checkbox is only shown the first time (and again if a new version is published).
// The agreement is remembered on the device; each order also records the version and
// time it was placed under.
export function usePatronTerms() {
  const document = useActivePatronTerms();
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [checked, setChecked] = useState(false);

  const ready = document !== null;
  const version = document?.version ?? null;

  useEffect(() => {
    if (!version) return;
    try {
      setAlreadyAccepted(localStorage.getItem(TERMS_STORAGE_KEY) === version);
    } catch {
      // Storage blocked (e.g. private browsing): just ask each time.
      setAlreadyAccepted(false);
    }
  }, [version]);

  const canProceed = ready && (alreadyAccepted || checked);

  // Call when the patron taps Pay / Place Order with the agreement in place.
  const recordAcceptance = useCallback(() => {
    if (!version) return;
    try {
      localStorage.setItem(TERMS_STORAGE_KEY, version);
    } catch {
      // Not remembered; they'll be asked again next time.
    }
    setAlreadyAccepted(true);
  }, [version]);

  // Stored on the order as a record of what the patron agreed to and when.
  const orderFields = useCallback(
    () => ({ termsAcceptedVersion: version, termsAcceptedAt: serverTimestamp() }),
    [version]
  );

  return { document, ready, alreadyAccepted, checked, setChecked, canProceed, recordAcceptance, orderFields };
}

export type PatronTermsState = ReturnType<typeof usePatronTerms>;
