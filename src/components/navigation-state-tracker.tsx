'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

/**
 * NavigationStateTracker
 * 
 * Handles PWA session persistence. It tracks the user's location (Menu or Tracking) 
 * and stores it in localStorage. If the user closes the PWA and returns via the 
 * root URL (home screen icon), they are automatically redirected back to their 
 * last active screen.
 * 
 * QR Code Exception: If a user scans a QR code, they land on a specific URL 
 * (e.g. /sellers/[id]/order). This landing overrides the saved state and 
 * becomes the new "active" session URL.
 */
// We only track "patron" experience pages (Menu, Tracking, Onboarding Success)
// We explicitly IGNORE the landing page, login, staff sign-in, and all administrative routes
function isPatronPath(path: string): boolean {
  const isInternal =
    path.startsWith('/admin') ||
    path.startsWith('/login') ||
    path.startsWith('/sales') ||
    path.startsWith('/sellers') && (path.includes('/bevcart') || path.includes('/clubhouse') || path.includes('/laneside') || path.includes('/staff-login'));

  return !isInternal && path !== '/';
}

export function NavigationStateTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCheckPerformed = useRef(false);

  // 1. PERSISTENCE: Save navigation state on every change
  useEffect(() => {
    if (!pathname) return;

    if (isPatronPath(pathname)) {
      const fullUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      localStorage.setItem('koop_resume_url', fullUrl);
      console.log('[Navigation] Persisting active session:', fullUrl);
    }
  }, [pathname, searchParams]);

  // 2. RESTORATION: Resume session on initial load at root
  useEffect(() => {
    // Only perform the resume check once when the app is first mounted
    if (initialCheckPerformed.current) return;
    initialCheckPerformed.current = true;

    // Restoration only triggers if the user lands on the root (PWA start URL)
    // If they land on any other page (like a QR scan URL), we respect that navigation
    if (pathname === '/') {
      const resumeUrl = localStorage.getItem('koop_resume_url');
      if (!resumeUrl) return;

      // Guards against stale values saved before a path was excluded here
      // (e.g. staff-login) - self-heals instead of hijack-redirecting forever.
      const resumePath = resumeUrl.split('?')[0];
      if (!isPatronPath(resumePath)) {
        localStorage.removeItem('koop_resume_url');
        return;
      }

      console.log('[Navigation] Resuming last active session:', resumeUrl);
      // Use replace to avoid polluting the history stack with the landing page
      router.replace(resumeUrl);
    }
  }, [pathname, router]);

  return null;
}
