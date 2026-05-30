
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * DEPRECATED: This route has been moved to /src/app/login/page.tsx
 * to resolve route group resolution issues and parallel page conflicts.
 */
export default function DeprecatedAuthLoginPage() {
  useEffect(() => {
    redirect('/login');
  }, []);
  
  return null;
}
