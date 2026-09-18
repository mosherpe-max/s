self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Displays the payload sent by the Cloud Functions side (notifyStaffOnNewOrder,
// checkLateOrders) - this is what makes Web Push actually show up in the OS
// notification center, including while the app is backgrounded or the screen
// is off. The click handler below already existed and just works once this
// fires: iOS/Safari plays its own default notification sound automatically,
// no custom audio needed here.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Koop', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Koop', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  // Compare by pathname only (not the full URL string) so an already-open
  // standalone window still counts as "open" even if its query string
  // differs from the notification's target - an exact-string match was
  // missing that and falling through to openWindow(), which on iOS opens
  // in Safari instead of focusing the running standalone app.
  const targetPath = new URL(urlToOpen, self.location.origin).pathname;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (new URL(client.url).pathname === targetPath && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});