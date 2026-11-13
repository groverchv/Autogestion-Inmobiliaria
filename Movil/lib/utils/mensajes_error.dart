import 'dart:async';
import 'dart:io';

import '../services/api_service.dart';

/// Traduce cualquier error técnico a una frase que una persona sin
/// conocimientos de tecnología entiende y sabe qué hacer con ella.
/// Regla: el usuario NUNCA ve "Exception", códigos ni nombres de clases.
String mensajeError(Object e) {
  final texto = e.toString();
  if (e is ApiException) {
    // Los ApiException ya traen mensaje en español llano.
    final m = texto.replaceFirst(RegExp(r'^.*ApiException:?\s*'), '');
    return m.isEmpty ? _generico : m;
  }
  if (e is SocketException || texto.contains('SocketException')) {
    return 'No hay internet. Revisa tu WiFi o datos móviles e intenta de nuevo.';
  }
  if (e is TimeoutException || texto.contains('TimeoutException')) {
    return 'La conexión está muy lenta. Espera un momento e intenta de nuevo.';
  }
  if (texto.contains('401') || texto.contains('Unauthorized')) {
    return 'Tu sesión se cerró. Vuelve a ingresar con tu correo y contraseña.';
  }
  if (texto.contains('404')) {
    return 'No encontramos lo que buscabas. Puede que ya no exista.';
  }
  if (texto.contains('500') || texto.contains('502') || texto.contains('503')) {
    return 'El servidor tiene un problema temporal. Intenta de nuevo en unos minutos.';
  }
  return _generico;
}

const _generico = 'Algo salió mal. Intenta de nuevo; si sigue fallando, '
    'contáctanos por WhatsApp y te ayudamos.';
