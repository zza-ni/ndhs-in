// Firebase Messaging (background notifications)
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

try {
  const firebaseConfig = {
    apiKey: "AIzaSyCeqeuQkTb3wioxIogkn7hcUQz9FP2K1XA",
    authDomain: "ndhs-bob.firebaseapp.com",
    projectId: "ndhs-bob",
    storageBucket: "ndhs-bob.firebasestorage.app",
    messagingSenderId: "109335510565",
    appId: "1:109335510565:web:8777eb5e791089da23c9cc",
    measurementId: "G-32BMZXN9CQ"
  };
  // Guard multiple init across updates
  if (!self.firebase?.apps?.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || '알림';
    const options = {
      body: payload?.notification?.body || '',
      icon: payload?.notification?.icon || '/src/icon-192x192.png',
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  // ignore messaging setup failures in SW
}

const CACHE_NAME = 'ndhs-bob-cache-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/main.jsx',
  '/src/icon-192x192.png',
  '/src/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    // Network-first for SPA navigations; fallback to cached index.html
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for other GET requests with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

// Generic Web Push handler (for iOS Safari PWA and other browsers using the W3C Push API)
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || '알림';
    const options = {
      body: data.body || '',
      icon: data.icon || '/src/icon-192x192.png',
      badge: data.badge || '/src/icon-192x192.png',
      data: { url: data.click_action || data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // ignore malformed push payloads
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage && client.postMessage({ type: 'OPEN_URL', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
