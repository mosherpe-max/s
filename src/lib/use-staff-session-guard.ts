'use client';

import { useEffect } from 'react';
import { useUser } from '@/firebase';

const STAFF_SESSION_KEYS = [
  'koop_is_admin_session', 'koop_staff_id', 'koop_staff_name', 'koop_staff_role',
  'koop_staff_session_start', 'koop_staff_session_id',
];

// A staff terminal must be signed in through the staff PIN login. A device still holding an
// anonymous session from before that existed (or a patron's phone that wandered onto this URL)
// can't read the venue's orders, so send it back to the PIN screen instead of showing an
// empty terminal. Venue admins viewing a terminal are signed in with their own account, which
// isn't anonymous, so they are left alone.
export function useStaffSessionGuard(sellerId: string) {
  const { user, isUserLoading } = useUser();
  const isAnonymous = !!user?.isAnonymous;

  useEffect(() => {
    if (isUserLoading || !isAnonymous) return;
    try { STAFF_SESSION_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
    const loginPath = `/sellers/${sellerId}/staff-login`;
    if (window.location.pathname.endsWith('/staff-login')) window.location.reload();
    else window.location.assign(loginPath);
  }, [isUserLoading, isAnonymous, sellerId]);
}
