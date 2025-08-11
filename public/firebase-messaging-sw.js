importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

const firebaseConfig = {
            apiKey: "AIzaSyCeqeuQkTb3wioxIogkn7hcUQz9FP2K1XA",
            authDomain: "ndhs-bob.firebaseapp.com",
            projectId: "ndhs-bob",
            storageBucket: "ndhs-bob.firebasestorage.app",
            messagingSenderId: "109335510565",
            appId: "1:109335510565:web:8777eb5e791089da23c9cc",
            measurementId: "G-32BMZXN9CQ"
        };

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 및 알림 처리
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/src/icon-192x192.png',
  };

  self.registration.showNotification(title, options);
});