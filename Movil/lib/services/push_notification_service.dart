import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Notificación Push en Segundo Plano: ${message.messageId}");
}

class PushNotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp();

      // Solicitar permisos en dispositivos (iOS y Android 13+)
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      debugPrint("Permisos FCM otorgados: ${settings.authorizationStatus}");

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Manejo en primer plano
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint("Notificación recibida en primer plano:");
        debugPrint("Título: ${message.notification?.title}");
        debugPrint("Cuerpo: ${message.notification?.body}");
      });
    } catch (e) {
      debugPrint("Advertencia: Firebase no pudo inicializarse en esta plataforma: $e");
    }
  }

  /// Registra el token FCM del dispositivo en el backend tras el login
  static Future<void> sincronizarTokenConBackend(ApiService apiService) async {
    try {
      // ignore: deprecated_member_use
      final token = await _messaging.getToken();
      if (token != null) {
        debugPrint("FCM Token Dispositivo Móvil: $token");
        await apiService.actualizarFcmToken(token);
      }
    } catch (e) {
      debugPrint("Error al registrar token FCM en backend: $e");
    }
  }
}
