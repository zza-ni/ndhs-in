const CACHE_NAME = 'v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/src/style.css',
  '/src/script.js',
  '/src/icon-192x192.png',
  '/src/icon-512x512.png',
];

// 설치 단계에서 중요한 리소스 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 단계에서 이전 캐시 제거
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// 요청 시 캐시 우선 처리 후 네트워크 fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // 성공 응답만 캐시에 저장 (옵션)
        if(networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // 오프라인 fallback 처리 필요시 여기에 작성
      });
    })
  );
});
