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
  // 데이터 전용 메시지만 수동 표시(FCM 자동 표시 비활성화)
  messaging.onBackgroundMessage((payload) => {
    if (!payload || payload.notification) return; // notification payload는 수동 표시 안 함
    const d = payload.data || {};
    const title = d.title || '';
    const body = d.body || '';
    if (!title && !body) return;
    const options = {
      body,
      icon: d.icon || '/src/icon-192x192.png',
      badge: d.badge || '/src/icon-192x192.png',
      tag: d.tag || 'ndhs-bob-global',
      renotify: d.renotify === 'true' ? true : false,
      data: { url: d.url || '/' },
    };
    // 강력 중복 방지: 같은 태그/내용의 알림이 이미 표시 중이면 스킵, 또는 최근 2초 내 동일 메시지 스킵
    const now = Date.now();
    const id = `${title}\n${body}\n${options.data.url}`;
    self.__lastNoti = self.__lastNoti || { id: '', ts: 0 };
    if (self.__lastNoti.id === id && now - self.__lastNoti.ts < 2000) return;
    (async () => {
      try {
        const existing = await self.registration.getNotifications({ tag: options.tag });
        if (existing && existing.length > 0) return; // 이미 같은 태그 표시 중이면 스킵
      } catch {}
      self.__lastNoti = { id, ts: now };
      await self.registration.showNotification(title || '알림', options);
    })();
  });
} catch (e) {
  // ignore messaging setup failures in SW
}

const CACHE_NAME = 'ndhs-bob-cache-v3';
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

// Allow clients to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event?.data === 'SKIP_WAITING' || event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;


  // Always network for all api.ndhs.in requests (no cache)
  if (/^https?:\/\/api\.ndhs\.in\//.test(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for cdn.ndhs.in (always cache)
  if (/^https?:\/\/cdn\.ndhs\.in\//.test(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          });
      })
    );
    return;
  }

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
