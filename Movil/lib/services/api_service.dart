import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/models.dart';

class ApiService {
  final _storage = const FlutterSecureStorage();
  String _baseUrl = AppConfig.baseUrl;

  void setBaseUrl(String url) {
    _baseUrl = url.replaceAll(RegExp(r'/$'), '');
  }

  String get baseUrl => _baseUrl;

  Future<void> saveToken(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }

  Future<void> clearAuth() async {
    await _storage.deleteAll();
  }

  Map<String, String> _headers(String? token) => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  // ─── Autenticación & Perfil ──────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/login/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 200) {
      final access = data['access'] ?? data['tokens']?['access'];
      final refresh = data['refresh'] ?? data['tokens']?['refresh'];
      if (access != null) {
        await saveToken(access, refresh ?? '');
      }
      return data;
    } else {
      throw Exception(data['detail'] ?? data['error'] ?? 'Credenciales incorrectas');
    }
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/registro/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(userData),
    );

    final data = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode == 201 || response.statusCode == 200) {
      return data;
    } else {
      String msg = 'Error en el registro';
      if (data is Map) {
        final errs = data.entries.map((e) => '${e.key}: ${e.value}').join('\n');
        if (errs.isNotEmpty) msg = errs;
      }
      throw Exception(msg);
    }
  }

  Future<Usuario> getProfile() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/me/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      return Usuario.fromJson(data);
    } else {
      throw Exception('No se pudo cargar el perfil');
    }
  }

  Future<Usuario> updateProfile(Map<String, dynamic> data) async {
    final token = await getToken();
    final response = await http.patch(
      Uri.parse('$_baseUrl/usuarios/me/'),
      headers: _headers(token),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return Usuario.fromJson(jsonDecode(utf8.decode(response.bodyBytes)));
    } else {
      throw Exception('Error al actualizar el perfil');
    }
  }

  Future<Map<String, int>> getBadges() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/lista/badges/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      return {
        'notificaciones': (data['notificaciones'] as num?)?.toInt() ?? 0,
        'mensajes': (data['mensajes'] as num?)?.toInt() ?? 0,
      };
    }
    return {'notificaciones': 0, 'mensajes': 0};
  }

  // ─── Catálogo & Inmuebles ────────────────────────────────────────────
  Future<List<Inmueble>> getCatalogo({String query = '', String tipoOferta = ''}) async {
    final token = await getToken();
    String url = '$_baseUrl/inmuebles/lista/?';
    if (query.isNotEmpty) url += 'search=$query&';
    if (tipoOferta.isNotEmpty && tipoOferta != 'TODOS') url += 'publicaciones__tipo_oferta=${tipoOferta.toLowerCase()}&';

    final response = await http.get(Uri.parse(url), headers: _headers(token));
    if (response.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = [];
      if (decoded is Map && decoded.containsKey('results')) {
        results = decoded['results'];
      } else if (decoded is List) {
        results = decoded;
      }
      return results.map((item) => Inmueble.fromJson(item)).toList();
    }
    throw Exception('Error al obtener el catálogo');
  }

  Future<Inmueble> getInmuebleDetalle(int id) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/lista/$id/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return Inmueble.fromJson(jsonDecode(utf8.decode(response.bodyBytes)));
    }
    throw Exception('Error al cargar detalle del inmueble');
  }

  Future<Inmueble> updateInmueble(int id, Map<String, dynamic> data) async {
    final token = await getToken();
    final response = await http.patch(
      Uri.parse('$_baseUrl/inmuebles/lista/$id/'),
      headers: _headers(token),
      body: jsonEncode(data),
    );

    if (response.statusCode == 200) {
      return Inmueble.fromJson(jsonDecode(utf8.decode(response.bodyBytes)));
    }
    final errorBody = utf8.decode(response.bodyBytes);
    throw Exception('Error (${response.statusCode}): $errorBody');
  }

  Future<bool> deleteInmueble(int id) async {
    final token = await getToken();
    final response = await http.delete(
      Uri.parse('$_baseUrl/inmuebles/lista/$id/'),
      headers: _headers(token),
    );
    return response.statusCode == 204 || response.statusCode == 200;
  }

  Future<List<Inmueble>> getMisInmuebles() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/mis_inmuebles/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = [];
      if (decoded is Map && decoded.containsKey('results')) {
        results = decoded['results'];
      } else if (decoded is List) {
        results = decoded;
      }
      return results.map((item) => Inmueble.fromJson(item)).toList();
    }
    throw Exception('Error al obtener mis inmuebles');
  }

  Future<List<Inmueble>> getFavoritos() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/favoritos/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) {
        if (item['inmueble'] is Map) {
          return Inmueble.fromJson(item['inmueble']);
        }
        return Inmueble.fromJson(item);
      }).toList();
    }
    return [];
  }

  Future<bool?> toggleFavorito(int inmuebleId) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/favoritos/toggle/'),
      headers: _headers(token),
      body: jsonEncode({'inmueble': inmuebleId}),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      if (data is Map && data.containsKey('is_favorito')) {
        return data['is_favorito'] == true;
      }
      return true;
    }
    return null;
  }

  // ─── Citas ───────────────────────────────────────────────────────────
  Future<List<Cita>> getMisCitas() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/citas/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => Cita.fromJson(item)).toList();
    }
    return [];
  }

  Future<bool> agendarCita({required int inmuebleId, required String fecha, required String hora, String notas = ''}) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/citas/'),
      headers: _headers(token),
      body: jsonEncode({
        'inmueble': inmuebleId,
        'fecha': fecha,
        'hora': hora,
        'motivo': notas,
      }),
    );
    return response.statusCode == 200 || response.statusCode == 201;
  }

  // ─── Contratos & Pagos ───────────────────────────────────────────────
  Future<List<Contrato>> getMisContratos() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/contratos/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => Contrato.fromJson(item)).toList();
    }
    return [];
  }

  Future<List<Pago>> getMisPagos() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/pagos/pagos/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => Pago.fromJson(item)).toList();
    }
    return [];
  }

  // ─── Mensajería & Chats ──────────────────────────────────────────────
  Future<List<ChatItem>> getChats(int currentUserId) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/chats/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => ChatItem.fromJson(item, currentUserId)).toList();
    }
    return [];
  }

  Future<List<MensajeItem>> getMensajesChat(int chatId) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/mensajes/?chat=$chatId'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => MensajeItem.fromJson(item)).toList();
    }
    return [];
  }

  Future<bool> enviarMensaje({required int chatId, required String contenido}) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/mensajes/'),
      headers: _headers(token),
      body: jsonEncode({
        'chat': chatId,
        'contenido': contenido,
      }),
    );
    return response.statusCode == 200 || response.statusCode == 201;
  }

  Future<ChatItem> getOrCreateChat(int propietarioId, int currentUserId) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/chats/'),
      headers: _headers(token),
      body: jsonEncode({
        'participante2': propietarioId,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return ChatItem.fromJson(decoded, currentUserId);
    }
    throw Exception('Error al iniciar conversación con el propietario');
  }

  // ─── Notificaciones ──────────────────────────────────────────────────
  Future<List<NotificacionItem>> getNotificaciones() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/notificaciones/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results') ? decoded['results'] : (decoded is List ? decoded : []);
      return results.map((item) => NotificacionItem.fromJson(item)).toList();
    }
    return [];
  }

  // ─── Subida Multimedia (Cloudinary vía Backend) ─────────────────────────
  Future<Multimedia?> subirMultimediaArchivo({
    required int inmuebleId,
    required List<int> fileBytes,
    required String filename,
    required String tipo,
    bool esPrincipal = false,
    String descripcion = '',
  }) async {
    final token = await getToken();
    final uri = Uri.parse('$_baseUrl/inmuebles/multimedia/');
    final request = http.MultipartRequest('POST', uri);

    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    request.fields['inmueble'] = inmuebleId.toString();
    request.fields['tipo'] = tipo;
    request.fields['principal'] = esPrincipal ? 'true' : 'false';
    if (descripcion.isNotEmpty) {
      request.fields['descripcion'] = descripcion;
    }

    final multipartFile = http.MultipartFile.fromBytes(
      'archivo',
      fileBytes,
      filename: filename,
    );
    request.files.add(multipartFile);

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 201 || response.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return Multimedia.fromJson(decoded);
    }
    return null;
  }

  Future<bool> uploadPanorama360({
    required int inmuebleId,
    required List<int> imageBytes,
    required String filename,
    String titulo = 'Recorrido 360',
  }) async {
    final res = await subirMultimediaArchivo(
      inmuebleId: inmuebleId,
      fileBytes: imageBytes,
      filename: filename,
      tipo: 'panorama_360',
      descripcion: titulo,
    );
    return res != null;
  }

  Future<bool> eliminarMultimedia(int mediaId) async {
    final token = await getToken();
    final response = await http.delete(
      Uri.parse('$_baseUrl/inmuebles/multimedia/$mediaId/'),
      headers: _headers(token),
    );
    return response.statusCode == 204 || response.statusCode == 200;
  }
}
