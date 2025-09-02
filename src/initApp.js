// Global app initializer: Firebase, Analytics, SW registration, FCM token sync
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyCeqeuQkTb3wioxIogkn7hcUQz9FP2K1XA',
  authDomain: 'ndhs-bob.firebaseapp.com',
  projectId: 'ndhs-bob',
  storageBucket: 'ndhs-bob.firebasestorage.app',
  messagingSenderId: '109335510565',
  appId: '1:109335510565:web:8777eb5e791089da23c9cc',
  measurementId: 'G-32BMZXN9CQ',
};

let app;
let messaging;

function registerServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
  // Root-scoped SW for PWA control
  navigator.serviceWorker.register('/service-worker.js');
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

function saveTokenToServer(token) {
  return fetch('/api/saveToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then((r) => r.json());
}

function saveSubscriptionToServer(subscription, userId) {
  return fetch('/api/saveSubscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, userId: userId || null }),
  }).then((r) => r.json());
}

// Helpers
const isInstalledPWA = () => {
  try {
    const dm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = typeof navigator !== 'undefined' && 'standalone' in navigator && navigator.standalone;
    const twa = typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://');
    return Boolean(dm || iosStandalone || twa);
  } catch {
    return false;
  }
};
const isApple = () => {
  try { return /iPhone|iPad|iPod/i.test(navigator.userAgent || ''); } catch { return false; }
};
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export async function trySaveTokenIfGranted() {
  await initFirebase();
  registerServiceWorkers();
  if (!('Notification' in window) || !messaging) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const currentToken = await getToken(messaging, {
      vapidKey: 'BCnsNKzhkJVouCCvFADUHBuzW6PUZTNDiuJOEfpGY-Psgn9dGX9rJBTUmyfoUbNyhHmesHJoXKehoLfZPG-LrZI',
      serviceWorkerRegistration: registration,
    });
    if (!currentToken) return false;
    const saved = localStorage.getItem('savedPushToken');
    if (currentToken !== saved) {
      await saveTokenToServer(currentToken);
      localStorage.setItem('savedPushToken', currentToken);
      localStorage.setItem('pushRegistered', 'true');
    }
    return true;
  } catch {
    return false;
  }
}

export async function trySaveWebSubIfGranted() {
  try {
    if (!('Notification' in window) || !('PushManager' in window)) return false;
    if (!isInstalledPWA()) return false; // iOS Safari requires installed PWA for push
    if (Notification.permission !== 'granted') return false;
    const vapidPub = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_VAPID_PUBLIC_KEY) || '';
    if (!vapidPub) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const subscription = sub || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPub) }));
    if (!subscription) return false;
    const saved = localStorage.getItem('savedWebSub');
    const endpoint = subscription.endpoint;
    if (endpoint && saved !== endpoint) {
      await saveSubscriptionToServer(subscription);
      localStorage.setItem('savedWebSub', endpoint);
      localStorage.setItem('pushRegistered', 'true');
    }
    return true;
  } catch {
    return false;
  }
}

export async function requestPushPermission() {
  await initFirebase();
  registerServiceWorkers();
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  // Prefer Web Push on installed iOS PWA when available
  if (isApple() && isInstalledPWA() && 'PushManager' in window) {
    const ok = await trySaveWebSubIfGranted();
    if (ok) return true;
    // fallthrough to FCM if web push path failed
  }

  if (!messaging) return false;
  const registration = await navigator.serviceWorker.ready;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BCnsNKzhkJVouCCvFADUHBuzW6PUZTNDiuJOEfpGY-Psgn9dGX9rJBTUmyfoUbNyhHmesHJoXKehoLfZPG-LrZI',
      serviceWorkerRegistration: registration,
    });
    if (!currentToken) return false;
    const saved = localStorage.getItem('savedPushToken');
    if (currentToken !== saved) {
      await saveTokenToServer(currentToken);
      localStorage.setItem('savedPushToken', currentToken);
      localStorage.setItem('pushRegistered', 'true');
    }
    return true;
  } catch {
    return false;
  }
}

export async function tryEnsurePushRegistered() {
  // Try both paths; succeed if either registers
  const webOk = await trySaveWebSubIfGranted();
  if (webOk) return true;
  const fcmOk = await trySaveTokenIfGranted();
  return !!fcmOk;
}

// auto-run minimal init once on module load
(async () => {
  await initFirebase();
  registerServiceWorkers();
  // best-effort save if already granted
  tryEnsurePushRegistered();
})();
