import { collection, deleteField, doc, getDocs, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';

export interface PinMigrationResult {
  moved: number;
  failed: { path: string; message: string }[];
}

// Moves every staff login PIN off the staff records (which patrons' browsers can read) and into
// sellers/{id}/staffSecrets (venue admin and Koop admin only). Run by the Koop admin from their
// own signed-in browser. A record that fails doesn't stop the rest, and re-running only touches
// records that still carry a PIN.
export async function migrateStaffPins(firestore: Firestore): Promise<PinMigrationResult> {
  const result: PinMigrationResult = { moved: 0, failed: [] };
  const sellers = await getDocs(collection(firestore, 'sellers'));
  for (const seller of sellers.docs) {
    let staff;
    try {
      staff = await getDocs(collection(firestore, 'sellers', seller.id, 'staff'));
    } catch (e: any) {
      result.failed.push({ path: `sellers/${seller.id}/staff`, message: e?.message || 'Could not read staff' });
      continue;
    }
    for (const member of staff.docs) {
      const pin = member.data().pin;
      if (typeof pin !== 'string' || !pin) continue;
      try {
        const batch = writeBatch(firestore);
        batch.set(
          doc(firestore, 'sellers', seller.id, 'staffSecrets', member.id),
          { pin, updatedAt: serverTimestamp() },
          { merge: true }
        );
        batch.update(member.ref, { pin: deleteField() });
        await batch.commit();
        result.moved++;
      } catch (e: any) {
        result.failed.push({ path: member.ref.path, message: e?.message || 'Write failed' });
      }
    }
  }
  return result;
}
