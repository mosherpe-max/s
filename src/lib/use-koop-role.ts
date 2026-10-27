'use client';

import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { SUPER_ADMIN_ID } from '@/lib/utils';

// Who is signed in to the Koop admin: the Koop admin (super admin) or a Koop team member
// (roles_koop_team, keyed by email - the Koop admin adds people on System Config). Team members
// do the day-to-day setup work; the security rules and functions enforce what they cannot do,
// and this only decides what to show.
export function useKoopRole() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const isSuperAdmin = !!user && (user.uid === SUPER_ADMIN_ID || user.email === 'mosherpe@gmail.com');

  const teamRef = useMemoFirebase(() => {
    if (!firestore || !user?.email || isSuperAdmin) return null;
    return doc(firestore, 'roles_koop_team', user.email.toLowerCase());
  }, [firestore, user, isSuperAdmin]);
  const { data: teamRole, isLoading: isTeamLoading } = useDoc(teamRef);

  const isKoopTeam = !isSuperAdmin && !!teamRole;
  return {
    user,
    isSuperAdmin,
    isKoopTeam,
    isKoopAdmin: isSuperAdmin || isKoopTeam,
    isLoading: isUserLoading || (!!teamRef && isTeamLoading),
  };
}
