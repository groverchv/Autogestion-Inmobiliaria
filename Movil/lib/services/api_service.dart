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
      throw Exception(
        data['detail'] ?? data['error'] ?? 'Credenciales incorrectas',
      );
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
  Future<List<Inmueble>> getCatalogo({
    String query = '',
    String tipoOferta = '',
  }) async {
    final token = await getToken();
    String url = '$_baseUrl/inmuebles/lista/?';
    if (query.isNotEmpty) url += 'search=$query&';
    if (tipoOferta.isNotEmpty && tipoOferta != 'TODOS') {
      url += 'publicaciones__tipo_oferta=${tipoOferta.toLowerCase()}&';
    }

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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
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

  Future<List<Map<String, dynamic>>> getTiposInmueble() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/tipos/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
      return results
          .map((t) => {'id': t['id'], 'nombre': t['nombre']?.toString() ?? ''})
          .toList();
    }
    return [];
  }

  Future<int> crearInmueble(Map<String, dynamic> payload) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/panel/lista/'),
      headers: _headers(token),
      body: jsonEncode(payload),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(utf8.decode(response.bodyBytes));
      return data['id'] as int;
    }
    throw Exception(
      'No se pudo publicar. Revisa los datos e intenta de nuevo.',
    );
  }

  Future<void> crearPublicacion({
    required int inmuebleId,
    required String tipoOferta,
    required double precio,
  }) async {
    final token = await getToken();
    await http.post(
      Uri.parse('$_baseUrl/inmuebles/panel/publicaciones/'),
      headers: _headers(token),
      body: jsonEncode({
        'inmueble': inmuebleId,
        'tipo_oferta': tipoOferta,
        'precio': precio,
        'estado': 'activa',
      }),
    );
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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
      return results.map((item) => Cita.fromJson(item)).toList();
    }
    return [];
  }

  Future<bool> agendarCita({
    required int inmuebleId,
    required String fecha,
    required String hora,
    String notas = '',
  }) async {
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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
      return results.map((item) => Contrato.fromJson(item)).toList();
    }
    return [];
  }

  /// Detalle completo de un contrato (cláusulas, partes, montos).
  Future<Map<String, dynamic>?> getContratoDetalle(int contratoId) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/contratos/$contratoId/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes))
          as Map<String, dynamic>;
    }
    return null;
  }

  /// El inquilino acepta/firma el contrato que le fue enviado.
  Future<Map<String, dynamic>> aceptarContrato(int contratoId) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/contratos/$contratoId/aceptar/'),
      headers: _headers(token),
    );
    return {
      'ok': response.statusCode == 200,
      'error': response.statusCode == 200
          ? null
          : (jsonDecode(utf8.decode(response.bodyBytes))['error'] ??
                'No se pudo firmar el contrato'),
    };
  }

  /// El inquilino rechaza el contrato indicando el motivo.
  Future<Map<String, dynamic>> rechazarContrato(
    int contratoId,
    String motivo,
  ) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/contratos/$contratoId/rechazar/'),
      headers: _headers(token),
      body: jsonEncode({'motivo': motivo}),
    );
    return {
      'ok': response.statusCode == 200,
      'error': response.statusCode == 200
          ? null
          : (jsonDecode(utf8.decode(response.bodyBytes))['error'] ??
                'No se pudo rechazar el contrato'),
    };
  }

  /// Tipos de contrato disponibles (alquiler, venta, anticrético...).
  Future<List<dynamic>> getTiposContrato() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/inmuebles/tipos-contrato/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return decoded is Map && decoded.containsKey('results')
          ? decoded['results'] as List
          : (decoded is List ? decoded : []);
    }
    return [];
  }

  /// El propietario crea un contrato y lo envía al inquilino (estado 'enviado').
  Future<Map<String, dynamic>> crearContrato(Map<String, dynamic> datos) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/contratos/crear-con-ia/'),
      headers: _headers(token),
      body: jsonEncode(datos),
    );
    final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
    return {
      'ok': response.statusCode == 201,
      'error': response.statusCode == 201
          ? null
          : (decoded is Map ? (decoded['error'] ?? 'No se pudo crear el contrato') : 'No se pudo crear el contrato'),
    };
  }

  /// Opiniones de usuarios sobre un inmueble.
  Future<List<dynamic>> getResenas(int inmuebleId) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/resenas/?inmueble=$inmuebleId'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return decoded is Map && decoded.containsKey('results')
          ? decoded['results'] as List
          : (decoded is List ? decoded : []);
    }
    return [];
  }

  /// Promedio y total de reseñas del inmueble.
  Future<Map<String, dynamic>?> getPromedioResenas(int inmuebleId) async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/usuarios/resenas/promedio/$inmuebleId/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    }
    return null;
  }

  /// Publica una reseña (calificación 1-5 + comentario).
  Future<Map<String, dynamic>> crearResena(int inmuebleId, int calificacion, String comentario) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/resenas/'),
      headers: _headers(token),
      body: jsonEncode({'inmueble': inmuebleId, 'calificacion': calificacion, 'comentario': comentario}),
    );
    return {
      'ok': response.statusCode == 200 || response.statusCode == 201,
      'error': response.statusCode == 200 || response.statusCode == 201
          ? null
          : 'Ya calificaste este inmueble o hubo un error al enviar tu reseña.',
    };
  }

  /// Balance financiero del propietario (KPIs + extracto de pagos).
  Future<Map<String, dynamic>?> getReportesPropietario() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/pagos/reportes/?personal=true'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    }
    return null;
  }

  /// Transacciones Stripe donde el usuario es pagador o propietario.
  Future<List<dynamic>> getTransacciones() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/pagos/transacciones/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return decoded is Map && decoded.containsKey('results')
          ? decoded['results'] as List
          : (decoded is List ? decoded : []);
    }
    return [];
  }

  /// Genera una URL de Stripe Checkout fresca para una transacción pendiente.
  Future<String?> crearCheckoutUrlTransaccion(int transaccionId) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/pagos/transacciones/$transaccionId/checkout-url/'),
      headers: _headers(token),
    );
    if (response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes))['checkout_url']
          as String?;
    }
    return null;
  }

  Future<List<Pago>> getMisPagos() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$_baseUrl/pagos/pagos/'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
      return results
          .map((item) => ChatItem.fromJson(item, currentUserId))
          .toList();
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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
      return results.map((item) => MensajeItem.fromJson(item)).toList();
    }
    return [];
  }

  Future<bool> enviarMensaje({
    required int chatId,
    required String contenido,
  }) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/mensajes/'),
      headers: _headers(token),
      body: jsonEncode({'chat': chatId, 'contenido': contenido}),
    );
    return response.statusCode == 200 || response.statusCode == 201;
  }

  Future<ChatItem> getOrCreateChat(int propietarioId, int currentUserId) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$_baseUrl/usuarios/chats/'),
      headers: _headers(token),
      body: jsonEncode({'participante2': propietarioId}),
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
      List results = decoded is Map && decoded.containsKey('results')
          ? decoded['results']
          : (decoded is List ? decoded : []);
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

  // ─── Auditoría IA (YOLO + OpenCV + OCR) ──────────────────────────────────
  Future<Map<String, dynamic>?> iniciarCheckin({
    required int inmuebleId,
    int? contratoId,
    required List<Map<String, String>> fotos,
    double montoGarantia = 3500.0,
  }) async {
    final token = await getToken();
    final Map<String, dynamic> bodyData = {
      'inmueble': inmuebleId,
      'fotos': fotos,
      'monto_garantia_base': montoGarantia,
    };
    if (contratoId != null) bodyData['contrato'] = contratoId;

    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/auditorias/iniciar-checkin/'),
      headers: _headers(token),
      body: jsonEncode(bodyData),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    return null;
  }

  Future<Map<String, dynamic>?> ejecutarCheckout({
    required int inmuebleId,
    int? contratoId,
    int? checkinId,
    required List<Map<String, String>> fotos,
  }) async {
    final token = await getToken();
    final Map<String, dynamic> bodyData = {
      'inmueble': inmuebleId,
      'fotos': fotos,
    };
    if (contratoId != null) bodyData['contrato'] = contratoId;
    if (checkinId != null) bodyData['checkin_id'] = checkinId;

    final response = await http.post(
      Uri.parse('$_baseUrl/inmuebles/auditorias/ejecutar-checkout/'),
      headers: _headers(token),
      body: jsonEncode(bodyData),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    return null;
  }

  // ─── Asistente Espacial 360° y Medidor NLP ──────────────────────────────
  Future<Map<String, dynamic>?> consultarAsistenteEspacial({
    required String consulta,
    int? inmuebleId,
    String? fotoUrl,
    int? panoramaId,
  }) async {
    final token = await getToken();
    final Map<String, dynamic> bodyData = {'consulta': consulta};
    if (inmuebleId != null) bodyData['inmueble'] = inmuebleId;
    if (fotoUrl != null && fotoUrl.isNotEmpty) {
      bodyData['foto_360_url'] = fotoUrl;
    }
    if (panoramaId != null) bodyData['panorama_id'] = panoramaId;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/inmuebles/asistente-espacial/consultar/'),
        headers: _headers(token),
        body: jsonEncode(bodyData),
      );
      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      // Ignorar errores de red
    }
    return null;
  }

  Future<Map<String, dynamic>?> iniciarTourVirtual({
    required int inmuebleId,
    String? fotoUrl,
  }) async {
    final token = await getToken();
    final Map<String, dynamic> bodyData = {'inmueble': inmuebleId};
    if (fotoUrl != null) bodyData['foto_360_url'] = fotoUrl;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/inmuebles/asistente-espacial/iniciar-tour/'),
        headers: _headers(token),
        body: jsonEncode(bodyData),
      );
      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      // Ignorar
    }
    return null;
  }

  // ─── Medidor táctil 3D sobre el panorama real ────────────────────────────
  Future<Map<String, dynamic>?> medirDistancia3d({
    required double u1,
    required double v1,
    required double u2,
    required double v2,
    int? inmuebleId,
    int? panoramaId,
  }) async {
    final token = await getToken();
    final Map<String, dynamic> bodyData = {
      'u1': u1,
      'v1': v1,
      'u2': u2,
      'v2': v2,
    };
    if (inmuebleId != null) bodyData['inmueble'] = inmuebleId;
    if (panoramaId != null) bodyData['panorama_id'] = panoramaId;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/inmuebles/calidad-vida/medir-distancia-3d/'),
        headers: _headers(token),
        body: jsonEncode(bodyData),
      );
      if (response.statusCode == 200 || response.statusCode == 400) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      // Ignorar errores de red
    }
    return null;
  }

  // ─── Índice de Calidad de Vida y Walk Score ──────────────────────────────
  Future<Map<String, dynamic>?> obtenerIndiceCalidadVida({
    required int inmuebleId,
    double? lat,
    double? lng,
  }) async {
    final token = await getToken();
    try {
      final queryParams = {'inmueble': inmuebleId.toString()};
      if (lat != null && lng != null) {
        queryParams['lat'] = lat.toString();
        queryParams['lng'] = lng.toString();
      }

      final uri = Uri.parse(
        '$_baseUrl/inmuebles/calidad-vida/evaluar/',
      ).replace(queryParameters: queryParams);

      final response = await http.get(uri, headers: _headers(token));

      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      // Ignorar
    }
    return null;
  }

  // ─── Súper Endpoint: Metaverso Espacial 360° + RA ─────────────────────────
  Future<Map<String, dynamic>?> obtenerDatosMetaverso(int inmuebleId) async {
    final token = await getToken();
    try {
      final uri = Uri.parse(
        '$_baseUrl/inmuebles/calidad-vida/metaverso-datos/',
      ).replace(queryParameters: {'inmueble': inmuebleId.toString()});

      final response = await http.get(uri, headers: _headers(token));

      if (response.statusCode == 200) {
        return jsonDecode(utf8.decode(response.bodyBytes));
      }
    } catch (e) {
      // Ignorar
    }
    return null;
  }
}
