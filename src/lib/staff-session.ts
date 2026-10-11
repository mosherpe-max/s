// Staff sign in through the server (the `staffLogin` function), which returns a token whose
// user id looks like staff_{venueId}_{staffId}. Those users aren't venue admins, even though
// they aren't anonymous either.
export const isStaffUid = (uid: string | null | undefined): boolean => !!uid && uid.startsWith('staff_');
