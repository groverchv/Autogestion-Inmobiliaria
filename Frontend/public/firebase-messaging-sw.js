// Service Worker para recibir notificaciones en segundo plano
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD-m4AZv7GVOcPZJ3Ab5bJpXvef0A_Xxeo",
  authDomain: "inmuebles-236f2.firebaseapp.com",
  projectId: "inmuebles-236f2",
  storageBucket: "inmuebles-236f2.firebasestorage.app",
  messagingSenderId: "396183281836",
  appId: "1:396183281836:web:5c12c68fa1867dde95ff09"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification ? payload.notification.title : "Inmobiliaria 360";
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : "Tienes una nueva notificación.",
    icon: "/favicon.ico"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
