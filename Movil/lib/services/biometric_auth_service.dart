import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricAuthService {
  static final LocalAuthentication _auth = LocalAuthentication();
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static const String _keyBiometricsEnabled = 'biometrics_enabled';
  static const String _keySavedEmail = 'saved_user_email';
  static const String _keySavedRefreshToken = 'saved_refresh_token';

  /// Comprueba si el dispositivo tiene hardware biométrico y huellas registradas.
  static Future<bool> canAuthenticate() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate =
          canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException {
      return false;
    }
  }

  /// Verifica si el usuario activó la autenticación biométrica en la app.
  static Future<bool> isBiometricsEnabled() async {
    final enabled = await _storage.read(key: _keyBiometricsEnabled);
    return enabled == 'true';
  }

  /// Guarda las credenciales para inicio rápido con huella.
  static Future<void> enableBiometrics({
    required String email,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyBiometricsEnabled, value: 'true');
    await _storage.write(key: _keySavedEmail, value: email);
    await _storage.write(key: _keySavedRefreshToken, value: refreshToken);
  }

  /// Desactiva la autenticación biométrica.
  static Future<void> disableBiometrics() async {
    await _storage.delete(key: _keyBiometricsEnabled);
    await _storage.delete(key: _keySavedEmail);
    await _storage.delete(key: _keySavedRefreshToken);
  }

  /// Obtiene el token de refresco guardado para el login por huella.
  static Future<String?> getSavedRefreshToken() async {
    return await _storage.read(key: _keySavedRefreshToken);
  }

  /// Lanza el diálogo nativo del sistema para escanear la huella.
  static Future<bool> authenticateWithBiometrics() async {
    try {
      final bool authenticated = await _auth.authenticate(
        localizedReason: 'Escanea tu huella dactilar para acceder a Inmobiliaria 360',
      );
      return authenticated;
    } on PlatformException {
      return false;
    }
  }
}
