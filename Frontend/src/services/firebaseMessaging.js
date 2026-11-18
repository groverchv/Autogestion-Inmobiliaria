import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import axios from "axios";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Inicializar Firebase App de manera segura (Singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Solicita permisos de notificación al navegador y registra el token FCM en el Backend Django.
 */
export async function solicitarPermisoNotificaciones() {
  try {
    const soportado = await isSupported();
    if (!soportado) {
      console.warn("FCM no es soportado por este navegador.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permiso de notificaciones denegado por el usuario.");
      return null;
    }

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      // Enviar token al backend Django si hay sesión activa
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const tokenAuth = localStorage.getItem("access_token");
      if (tokenAuth) {
        await axios.post(
          `${apiUrl}/usuarios/actualizar-fcm-token/`,
          { fcm_token: currentToken },
          { headers: { Authorization: `Bearer ${tokenAuth}` } }
        ).catch(() => {});
      }
      return currentToken;
    } else {
      console.warn("No se pudo obtener el token de registro FCM.");
      return null;
    }
  } catch (error) {
    console.error("Error al suscribir notificaciones Push:", error);
    return null;
  }
}

/**
 * Listener para mensajes en primer plano
 */
export async function escucharMensajesEnPrimerPlano(onMessageCallback) {
  const soportado = await isSupported();
  if (!soportado) return;
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    if (onMessageCallback) {
      onMessageCallback(payload);
    }
  });
}
