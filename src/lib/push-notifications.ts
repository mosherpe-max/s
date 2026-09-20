import { doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

// Web Push subscription keys are base64url, but the browser API wants a
// raw Uint8Array - this is the standard conversion snippet for that.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const DEVICE_ID_KEY = 'koop_push_device_id';

// Stable per-browser id, independent of any staff member - a shared
// terminal's push subscription is set up once against this id and then
// just gets pointed at by whichever staff member is currently signed in
// (see StaffMember.currentDeviceId), rather than being re-subscribed
// every login.
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export type PushSubscribeResult = 'subscribed' | 'denied' | 'unsupported' | 'unconfigured';

/**
 * Requests notification permission and subscribes to Web Push, saving the
 * subscription on a per-device doc (sellers/{sellerId}/pushDevices/{id}).
 *
 * MUST be called while the page is open in Safari, before it has ever been
 * added to the Home Screen - confirmed on-device that calling
 * Notification.requestPermission() from inside the already-installed
 * standalone PWA ejects it into Safari browser chrome on this iOS build,
 * regardless of gesture gating. There's no safe way to request this from
 * inside the installed app, so the staff-login page only shows this step
 * when navigator.standalone is false, before any Home Screen icon exists
 * for this venue. See PushDevice and StaffMember.currentDeviceId.
 */
export async function subscribeDeviceToPush(
  firestore: Firestore,
  sellerId: string
): Promise<PushSubscribeResult> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapidPublicKey) return 'unconfigured';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const deviceId = getOrCreateDeviceId();
  const deviceRef = doc(firestore, 'sellers', sellerId, 'pushDevices', deviceId);
  await setDoc(deviceRef, {
    id: deviceId,
    sellerId,
    subscription: subscription.toJSON(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  return 'subscribed';
}
