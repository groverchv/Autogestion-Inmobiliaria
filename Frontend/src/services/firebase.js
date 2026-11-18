import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicialización Singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Solicita permisos y obtiene el FCM token para notificaciones push en la web
 */
export async function requestFirebaseNotificationPermission() {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Messaging no está soportado en este navegador.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const currentToken = await getToken(messaging, { vapidKey });
      return currentToken;
    } else {
      console.warn('Permiso para notificaciones web no concedido.');
      return null;
    }
  } catch (error) {
    console.error('Error al obtener el token de notificaciones push:', error);
    return null;
  }
}

/**
 * Escucha notificaciones push en primer plano (foreground)
 */
export async function onForegroundMessage(callback) {
  try {
    const supported = await isSupported();
    if (!supported) return () => {};
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      if (callback) callback(payload);
    });
  } catch (error) {
    console.error('Error al registrar listener de notificaciones en foreground:', error);
    return () => {};
  }
}
