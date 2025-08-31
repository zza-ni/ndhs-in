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
      navigator.serviceWorker.register('/src/service-worker.js');
      navigator.serviceWorker.register('/firebase-messaging-sw.js');
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

export async function trySaveTokenIfGranted() {
  await initFirebase();
  registerServiceWorkers();
  if (!('Notification' in window) || !messaging) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BCnsNKzhkJVouCCvFADUHBuzW6PUZTNDiuJOEfpGY-Psgn9dGX9rJBTUmyfoUbNyhHmesHJoXKehoLfZPG-LrZI',
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

export async function requestPushPermission() {
  await initFirebase();
  registerServiceWorkers();
  if (!('Notification' in window) || !messaging) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  return trySaveTokenIfGranted();
}

// auto-run minimal init once on module load
(async () => {
  await initFirebase();
  registerServiceWorkers();
  // best-effort save if already granted
  trySaveTokenIfGranted();
})();
