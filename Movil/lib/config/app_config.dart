import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Constantes del sistema y endpoints de API con detección inteligente de plataforma
class AppConfig {
  /// Obtiene dinámicamente la URL base según la plataforma de ejecución
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:8000/api';
    }
    return 'http://192.168.0.16:8000/api';
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
