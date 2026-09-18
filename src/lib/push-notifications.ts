import { doc, updateDoc, serverTimestamp, type Firestore } from 'firebase/firestore';

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

export type PushSubscribeResult = 'subscribed' | 'denied' | 'unsupported' | 'unconfigured';

/**
 * Requests notification permission and subscribes to Web Push, then saves
 * the subscription on the staff member's own doc (self-writable per
 * firestore.rules - the shift-operational field carve-out on
 * sellers/{sellerId}/staff/{staffId}). Must be called directly from a real
 * user tap: this iOS build ejects the installed standalone PWA into Safari
 * browser chrome for permission-adjacent API calls made without one,
 * confirmed for geolocation and the Notification API - see LocationGate
 * and useHasInteracted.
 *
 * Saving on every login (not just the first time ever) means a shared
 * terminal always pushes to whoever is currently signed in on it, and a
 * staff member logging in from a different device gets it moved there.
 */
export async function subscribeToPushNotifications(
  firestore: Firestore,
  sellerId: string,
  staffId: string
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

  const staffRef = doc(firestore, 'sellers', sellerId, 'staff', staffId);
  await updateDoc(staffRef, {
    pushSubscription: subscription.toJSON(),
    pushSubscriptionUpdatedAt: serverTimestamp(),
  });

  return 'subscribed';
}
