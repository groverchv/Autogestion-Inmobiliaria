import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Constantes del sistema y endpoints de API con detección inteligente de plataforma
class AppConfig {
  /// Host de API inyectado en compilación:
  ///   flutter run --dart-define=API_HOST=192.168.1.50
  ///   flutter build apk --dart-define=API_HOST=api.midominio.bo
  /// Contra producción:
  ///   flutter run -d web-server --web-port=5200 --dart-define=API_HOST=https://inmuebles3d.duckdns.org/api
  static const String _envHost = String.fromEnvironment('API_HOST');

  /// Backend productivo en EC2 (nginx + Let's Encrypt).
  static const String prodUrl = 'https://inmuebles3d.duckdns.org/api';

  /// Obtiene dinámicamente la URL base. Por defecto apunta al servidor en la nube en AWS (inmuebles3d.duckdns.org)
  static String get baseUrl {
    if (_envHost.isNotEmpty) {
      return _envHost.startsWith('http') ? _envHost : 'http://$_envHost:8000/api';
    }
    // Siempre apunta al servidor online en la nube de producción
    return prodUrl;
  }

  static const String appTitle = 'Inmobiliaria Nobleve 360';
}

/// Paleta Premium Dark Mode con degradados y alto contraste para visibilidad óptima
class AppColors {
  // Primarios & Acentos Vibrantes
  static const Color primary = Color(0xFF38BDF8); // Azul Neón Cielo
  static const Color primaryDark = Color(0xFF0284C7);
  static const Color accent = Color(0xFF818CF8); // Índigo Neón

  // Fondos Oscuros con Profundidad
  static const Color background = Color(0xFF090D16); // Fondo profundo
  static const Color backgroundSecondary = Color(0xFF0F172A); // Fondo de capas
  static const Color surface = Color(0xFF1E293B); // Superficie de tarjetas
  static const Color surfaceElevated = Color(0xFF334155); // Superficie elevada

  // Tipografías de Alto Contraste en Fondo Oscuro
  static const Color textPrimary = Color(0xFFF8FAFC); // Blanco Puro / Casi Blanco
  static const Color textSecondary = Color(0xFF94A3B8); // Gris Claro Legible
  static const Color textMuted = Color(0xFF64748B); // Gris Suave

  // Bordes & Separadores Oscuros
  static const Color border = Color(0xFF334155);
  static const Color borderSubtle = Color(0xFF1E293B);

  // Estados & Badges
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFF43F5E);
  static const Color warning = Color(0xFFFBBF24);

  // ─── Degradados Profesionales Premium ───
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0284C7), Color(0xFF38BDF8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient darkHeaderGradient = LinearGradient(
    colors: [Color(0xFF0F172A), Color(0xFF090D16)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient purpleGradient = LinearGradient(
    colors: [Color(0xFF7C3AED), Color(0xFFA855F7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
