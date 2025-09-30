// Firebase Messaging (background notifications)
importScripts(
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js"
);

try {
  const firebaseConfig = {
    apiKey: "AIzaSyCeqeuQkTb3wioxIogkn7hcUQz9FP2K1XA",
    authDomain: "ndhs-bob.firebaseapp.com",
    projectId: "ndhs-bob",
    storageBucket: "ndhs-bob.firebasestorage.app",
    messagingSenderId: "109335510565",
    appId: "1:109335510565:web:8777eb5e791089da23c9cc",
    measurementId: "G-32BMZXN9CQ",
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
    const title = d.title || "";
    const body = d.body || "";
    if (!title && !body) return;
    const options = {
      body,
      icon: d.icon || "/src/icon-192x192.png",
      badge: d.badge || "/src/icon-192x192.png",
      tag: d.tag || "ndhs-bob-global",
      renotify: d.renotify === "true" ? true : false,
      data: { url: d.url || "/" },
    };
    // 강력 중복 방지: 같은 태그/내용의 알림이 이미 표시 중이면 스킵, 또는 최근 2초 내 동일 메시지 스킵
    const now = Date.now();
    const id = `${title}\n${body}\n${options.data.url}`;
    self.__lastNoti = self.__lastNoti || { id: "", ts: 0 };
    if (self.__lastNoti.id === id && now - self.__lastNoti.ts < 2000) return;
    (async () => {
      try {
        const existing = await self.registration.getNotifications({
          tag: options.tag,
        });
        if (existing && existing.length > 0) return; // 이미 같은 태그 표시 중이면 스킵
      } catch {}
      self.__lastNoti = { id, ts: now };
      await self.registration.showNotification(title || "알림", options);
    })();
  });
} catch (e) {
  // ignore messaging setup failures in SW
}

// Bump cache to clear any previously cached /data/* entries
const CACHE_NAME = "ndhs-bob-cache-v4";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/src/style.css",
  "/src/main.jsx",
  "/src/icon-192x192.png",
  "/src/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Allow clients to trigger immediate activation
self.addEventListener("message", (event) => {
  if (event?.data === "SKIP_WAITING" || event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // 1) api.ndhs.app → 항상 네트워크 (캐시 저장/사용 X)
  if (url.hostname === "api.ndhs.app") {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2) /data → 네트워크 우선 (최신 데이터 보장), 실패 시 캐시 백업
  if (url.pathname.startsWith("/data/")) {
    event.respondWith(
      (async () => {
        try {
          // Bypass HTTP cache to always fetch fresh JSON
          let fetchTarget = event.request;
          let cacheKeyRequest = event.request;
          if (url.pathname === "/data/20251001.json") {
            const busted = new URL(url.toString());
            busted.searchParams.set("v", "2");
            fetchTarget = busted.toString();
            cacheKeyRequest = new Request(busted.toString());
          }
          const networkResp = await fetch(fetchTarget, { cache: "no-store" });
          try {
            // .json 경로일 경우, 응답의 Content-Type이 application/json일 때만 캐시 저장
            const isJsonPath = url.pathname.includes(".json");
            const ct =
              (networkResp.headers &&
                networkResp.headers.get("content-type")) ||
              "";
            if (!isJsonPath || /application\/json/i.test(ct)) {
              const copy = networkResp.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(cacheKeyRequest, copy));
            }
          } catch {}
          return networkResp;
        } catch {
          // Offline or failed → serve last cached version if present
          const cached = await caches.match(cacheKeyRequest);
          if (cached) return cached;
          // As a last resort, let it fail
          return fetch(fetchTarget);
        }
      })()
    );
    return;
  }

  // 3) cdn.ndhs.app → 캐시 우선 (없으면 네트워크 후 캐시에 저장)
  if (url.hostname === "cdn.ndhs.app") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          try {
            // .json 경로 캐시 시 Content-Type 확인
            const isJsonPath = url.pathname.includes(".json");
            const ct = (resp.headers && resp.headers.get("content-type")) || "";
            if (!isJsonPath || /application\/json/i.test(ct)) {
              const copy = resp.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, copy));
            }
          } catch {}
          return resp;
        });
      })
    );
    return;
  }

  // 4) 그 외 → 캐시 미사용 (항상 네트워크)
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw =
    (event.notification &&
      event.notification.data &&
      event.notification.data.url) ||
    "/";
  const targetUrl = new URL(raw, self.location.origin).toString();
  event.waitUntil(
    (async () => {
      try {
        const clientList = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        if (clientList && clientList.length) {
          // Prefer navigating an existing client for reliability
          const client = clientList[0];
          try {
            if (client.navigate) {
              await client.navigate(targetUrl);
            } else if (client.postMessage) {
              client.postMessage({ type: "OPEN_URL", url: targetUrl });
            }
          } catch {}
          return client.focus && client.focus();
        }
      } catch {}
      // No clients found → open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })()
  );
});
