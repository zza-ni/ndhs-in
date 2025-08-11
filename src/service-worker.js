self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => cache.addAll([
      '/index.html',
      '/src/style.css',
      '/src/script.js',
      '/src/icon-192x192.png'
    ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Notification', message: event.data.text() };
    }
  }
  const title = data.title || '푸시 알림';
  const options = {
    body: data.message || '새로운 알림이 도착했습니다.',
    icon: '/src/icon-192x192.png',
    badge: '/src/icon-192x192.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
