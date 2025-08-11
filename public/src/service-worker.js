const CACHE_NAME = 'pwa-cache-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/script.js',
  '/src/icon-192x192.png',
  '/src/icon-512x512.png',
];

// 서비스 워커 설치 시 핵심 리소스 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 제거
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선 전략 적용(fetch 이벤트)
// index.html은 네트워크 우선 처리, 그 외는 캐시 우선 처리
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    // 네트워크 우선: 항상 최신 index.html 요청
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 성공 시 캐시에 저장
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // 캐시 우선: 다른 리소스는 미리 캐시된 자원 사용, 없으면 네트워크 요청
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
