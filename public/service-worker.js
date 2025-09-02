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
  // 중복 방지: notification 키가 있는 경우 FCM이 자체 표시하므로 수동 표시하지 않음
  messaging.onBackgroundMessage((payload) => {
    if (payload && payload.notification) return; // auto-displayed by FCM
    const t = payload?.data?.title;
    const b = payload?.data?.body;
    if (!t && !b) return; // 데이터 없음 → 표시 안 함
  const options = {
      body: b || '',
      icon: payload?.data?.icon || '/src/icon-192x192.png',
      data: { url: payload?.data?.url || '/' },
    };
  self.registration.showNotification(t || '알림', options);
  });
} catch (e) {
  // ignore messaging setup failures in SW
}

const CACHE_NAME = 'ndhs-bob-cache-v2';
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
// Web Push 비활성화: 일반 push 이벤트 핸들러 제거됨 (FCM messaging.onBackgroundMessage만 사용)

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
