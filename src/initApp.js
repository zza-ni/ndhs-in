// Global app initializer: Firebase, Analytics, SW registration, FCM token sync
import { initializeApp } from "firebase/app";
import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "firebase/analytics";
import { getMessaging, getToken } from "firebase/messaging";
import { deleteToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCeqeuQkTb3wioxIogkn7hcUQz9FP2K1XA",
  authDomain: "ndhs-bob.firebaseapp.com",
  projectId: "ndhs-bob",
  storageBucket: "ndhs-bob.firebasestorage.app",
  messagingSenderId: "109335510565",
  appId: "1:109335510565:web:8777eb5e791089da23c9cc",
  measurementId: "G-32BMZXN9CQ",
};

let app;
let messaging;

function registerServiceWorkers() {
  if ("serviceWorker" in navigator) {
    try {
      // Root-scoped SW for PWA control
      navigator.serviceWorker.register("/service-worker.js").then((reg) => {
        // force update and activate immediately
        try {
          reg.update();
        } catch {}
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && reg.waiting) {
              reg.waiting.postMessage("SKIP_WAITING");
            }
          });
        });
        let reloading = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          try {
            sessionStorage.setItem("appReloading", "1");
            const el = document.getElementById("preloader");
            if (el) el.classList.add("visible");
          } catch {}
          location.reload();
        });
      });
    } catch {}
    // Unregister legacy firebase-messaging SW if present (active/waiting/installing)
    try {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          const urls = [
            reg?.active?.scriptURL,
            reg?.waiting?.scriptURL,
            reg?.installing?.scriptURL,
          ].filter(Boolean);
          if (urls.some((u) => u.endsWith("/firebase-messaging-sw.js"))) {
            try {
              reg.unregister();
            } catch {}
          }
        });
      });
    } catch {}
  }
}

async function initFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    analyticsSupported().then((ok) => {
      if (ok) getAnalytics(app);
    });
  }
  if (!messaging) {
    try {
      messaging = getMessaging();
    } catch {
      // ignore in unsupported envs
    }
  }
}

function getDeviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id =
        crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("deviceId", id);
    }
    return id;
  } catch {
    return undefined;
  }
}

function saveTokenToServer(token) {
  const deviceId = getDeviceId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform = typeof navigator !== "undefined" ? navigator.platform : "";
  return fetch("/api/saveToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, deviceId, ua, platform }),
  }).then((r) => r.json());
}

// 웹 푸시 비활성화: 구독 저장 엔드포인트 제거

// Helpers
const isInstalledPWA = () => {
  try {
    const dm =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone =
      typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      navigator.standalone;
    const twa =
      typeof document !== "undefined" &&
      document.referrer &&
      document.referrer.startsWith("android-app://");
    return Boolean(dm || iosStandalone || twa);
  } catch {
    return false;
  }
};
const isApple = () => {
  try {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  } catch {
    return false;
  }
};

export async function trySaveTokenIfGranted() {
  await initFirebase();
  registerServiceWorkers();
  if (!("Notification" in window) || !messaging) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BCnsNKzhkJVouCCvFADUHBuzW6PUZTNDiuJOEfpGY-Psgn9dGX9rJBTUmyfoUbNyhHmesHJoXKehoLfZPG-LrZI",
      serviceWorkerRegistration: registration,
    });
    if (!currentToken) return false;
    const saved = localStorage.getItem("savedPushToken");
    if (currentToken !== saved) {
      await saveTokenToServer(currentToken);
      localStorage.setItem("savedPushToken", currentToken);
      localStorage.setItem("pushRegistered", "true");
    }
    return true;
  } catch {
    return false;
  }
}

// 웹 푸시 비활성화: 관련 로직 제거

export async function requestPushPermission() {
  await initFirebase();
  registerServiceWorkers();
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // 웹 푸시 비활성화: FCM 경로만 사용

  if (!messaging) return false;
  const registration = await navigator.serviceWorker.ready;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BCnsNKzhkJVouCCvFADUHBuzW6PUZTNDiuJOEfpGY-Psgn9dGX9rJBTUmyfoUbNyhHmesHJoXKehoLfZPG-LrZI",
      serviceWorkerRegistration: registration,
    });
    if (!currentToken) return false;
    const saved = localStorage.getItem("savedPushToken");
    if (currentToken !== saved) {
      await saveTokenToServer(currentToken);
      localStorage.setItem("savedPushToken", currentToken);
      localStorage.setItem("pushRegistered", "true");
    }
    return true;
  } catch {
    return false;
  }
}

export async function tryEnsurePushRegistered() {
  const fcmOk = await trySaveTokenIfGranted();
  return !!fcmOk;
}

// 푸시 끄기: FCM 토큰 삭제 및 로컬 상태 초기화
export async function disablePush() {
  await initFirebase();
  try {
    if (!messaging) return;
    const registration = await navigator.serviceWorker.ready;
    // deleteToken can take options in some envs; call plain then fallback
    let deleted = false;
    try {
      deleted = await deleteToken(messaging);
    } catch {
      // try with registration scope (older SDKs ignore options)
      try {
        deleted = await deleteToken(messaging, {
          serviceWorkerRegistration: registration,
        });
      } catch {}
    }
  } finally {
    try {
      localStorage.removeItem("savedPushToken");
      localStorage.removeItem("pushRegistered");
    } catch {}
  }
}

// auto-run minimal init once on module load
(async () => {
  await initFirebase();
  registerServiceWorkers();
  // best-effort save if already granted
  try {
    localStorage.removeItem("savedWebSub");
  } catch {}
  tryEnsurePushRegistered();
})();
