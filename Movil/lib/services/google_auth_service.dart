import 'dart:convert';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../services/api_service.dart';

class GoogleAuthService {
  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  /// Inicia sesión con la cuenta de Google del dispositivo y autentica con el Backend Django
  static Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) {
        // Usuario canceló la selección de cuenta
        return null;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;

      if (idToken == null) {
        throw Exception('No se pudo obtener el token de Google');
      }

      // Enviar token al Backend de Django
      final url = Uri.parse('${AppConfig.baseUrl}/usuarios/login/google/');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'id_token': idToken}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        // Guardar token en el almacenamiento seguro
        if (data['access'] != null) {
          await ApiService.saveToken(data['access']);
        }
        return data;
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['error'] ?? 'Error de autenticación con el servidor');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Cierra sesión de Google
  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
  }
}
