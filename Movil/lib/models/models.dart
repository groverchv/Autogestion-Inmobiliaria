class Usuario {
  final int id;
  final String email;
  final String firstName;
  final String lastName;
  final String rol;
  final String? foto;
  final String? telefono;
  final String? direccion;
  final String? ci;

  Usuario({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.rol,
    this.foto,
    this.telefono,
    this.direccion,
    this.ci,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      id: json['id'] ?? 0,
      email: json['email'] ?? '',
      firstName: json['first_name'] ?? '',
      lastName: json['last_name'] ?? '',
      rol: json['rol'] ?? 'usuario',
      foto: json['foto'],
      telefono: json['telefono'],
      direccion: json['direccion'],
      ci: json['ci']?.toString(),
    );
  }

  String get nombreCompleto => '$firstName $lastName'.trim();
}

class Multimedia {
  final int id;
  final String archivoUrl;
  final String tipo;
  final String titulo;

  Multimedia({
    required this.id,
    required this.archivoUrl,
    required this.tipo,
    required this.titulo,
  });

  factory Multimedia.fromJson(Map<String, dynamic> json) {
    return Multimedia(
      id: json['id'] ?? 0,
      archivoUrl: json['archivo_url'] ?? json['archivo'] ?? '',
      tipo: json['tipo'] ?? 'foto',
      titulo: json['titulo'] ?? '',
    );
  }
}

class Inmueble {
  final int id;
  final String titulo;
  final String descripcion;
  final String tipoNombre;
  final String tipoOferta;
  final String precio;
  final String ciudad;
  final String zona;
  final String direccionCompleta;
  final String estado;
  final int habitaciones;
  final int banos;
  final double superficie;
  final bool garaje;
  final bool piscina;
  final bool amoblado;
  final bool mascotasPermitidas;
  final String? imagenPrincipal;
  final List<Multimedia> galeria;
  final Usuario? propietario;
  final int? propietarioId;
  final String? propietarioNombre;
  final bool isFavorito;

  Inmueble({
    required this.id,
    required this.titulo,
    required this.descripcion,
    required this.tipoNombre,
    required this.tipoOferta,
    required this.precio,
    required this.ciudad,
    required this.zona,
    required this.direccionCompleta,
    required this.estado,
    required this.habitaciones,
    required this.banos,
    required this.superficie,
    required this.garaje,
    required this.piscina,
    required this.amoblado,
    required this.mascotasPermitidas,
    this.imagenPrincipal,
    this.galeria = const [],
    this.propietario,
    this.propietarioId,
    this.propietarioNombre,
    this.isFavorito = false,
  });

  factory Inmueble.fromJson(Map<String, dynamic> json) {
    String? img = json['imagen_principal'];
    List<Multimedia> galeriaList = [];
    if (json['multimedia'] != null && (json['multimedia'] as List).isNotEmpty) {
      galeriaList = (json['multimedia'] as List)
          .map((m) => Multimedia.fromJson(m))
          .toList();
      img ??= galeriaList.first.archivoUrl;
    }

    String ciudadStr = '';
    String zonaStr = '';
    String direccionStr = '';

    if (json['direccion'] is Map) {
      final dirMap = json['direccion'] as Map<String, dynamic>;
      ciudadStr = dirMap['ciudad'] ?? '';
      zonaStr = dirMap['zona'] ?? '';
      final calle = dirMap['calle'] ?? '';
      direccionStr =
          '$ciudadStr${zonaStr.isNotEmpty ? ', $zonaStr' : ''}${calle.isNotEmpty ? ' ($calle)' : ''}'
              .trim();
    } else if (json['direccion'] is String) {
      direccionStr = json['direccion'];
      ciudadStr = json['ciudad'] ?? '';
      zonaStr = json['zona'] ?? '';
    }

    String precioFormatted = json['precio']?.toString() ?? '0';
    if (precioFormatted.contains(',')) {
      precioFormatted = precioFormatted.replaceAll(',', '.');
    }
    final num? p = num.tryParse(precioFormatted);
    final String precioFinal = p != null
        ? p.toStringAsFixed(0)
        : precioFormatted;

    double superficieVal = 0.0;
    if (json['superficie'] != null) {
      if (json['superficie'] is num) {
        superficieVal = (json['superficie'] as num).toDouble();
      } else {
        superficieVal = double.tryParse(json['superficie'].toString()) ?? 0.0;
      }
    }

    int habVal = 0;
    if (json['habitaciones'] != null) {
      if (json['habitaciones'] is int) {
        habVal = json['habitaciones'];
      } else {
        habVal = int.tryParse(json['habitaciones'].toString()) ?? 0;
      }
    }

    int banosVal = 0;
    if (json['banos'] != null) {
      if (json['banos'] is int) {
        banosVal = json['banos'];
      } else {
        banosVal = int.tryParse(json['banos'].toString()) ?? 0;
      }
    }

    int? propId;
    String? propNombre = json['propietario_nombre'];
    if (json['propietario'] is int) {
      propId = json['propietario'];
    } else if (json['propietario'] is Map) {
      propId = json['propietario']['id'];
      propNombre ??=
          '${json['propietario']['first_name'] ?? ''} ${json['propietario']['last_name'] ?? ''}'
              .trim();
    }

    return Inmueble(
      id: json['id'] ?? 0,
      titulo: json['titulo'] ?? 'Inmueble sin título',
      descripcion: json['descripcion'] ?? '',
      tipoNombre: json['tipo_nombre'] ?? json['tipo']?['nombre'] ?? 'Propiedad',
      tipoOferta: (json['tipo_oferta'] ?? 'alquiler').toString().toUpperCase(),
      precio: precioFinal,
      ciudad: ciudadStr,
      zona: zonaStr,
      direccionCompleta: direccionStr.isNotEmpty
          ? direccionStr
          : 'Ubicación no especificada',
      estado: (json['estado'] ?? 'disponible').toString().toUpperCase(),
      habitaciones: habVal,
      banos: banosVal,
      superficie: superficieVal,
      garaje: json['garaje'] == true,
      piscina: json['piscina'] == true,
      amoblado: json['amoblado'] == true,
      mascotasPermitidas: json['mascotas_permitidas'] == true,
      imagenPrincipal: img,
      galeria: galeriaList,
      propietario: json['propietario'] is Map
          ? Usuario.fromJson(json['propietario'])
          : null,
      propietarioId: propId,
      propietarioNombre: propNombre,
      isFavorito: json['is_favorito'] == true,
    );
  }
}

class Contrato {
  final int id;
  final String codigo;
  final String tipoNombre;
  final String estado;
  final String fechaInicio;
  final String fechaFin;
  final String monto;
  final String tituloInmueble;
  final String? clienteNombre;
  final String? propietarioNombre;
  final bool firmadoPropietario;
  final bool firmadoCliente;
  final String? archivoPdf;

  Contrato({
    required this.id,
    required this.codigo,
    required this.tipoNombre,
    required this.estado,
    required this.fechaInicio,
    required this.fechaFin,
    required this.monto,
    required this.tituloInmueble,
    this.clienteNombre,
    this.propietarioNombre,
    required this.firmadoPropietario,
    required this.firmadoCliente,
    this.archivoPdf,
  });

  factory Contrato.fromJson(Map<String, dynamic> json) {
    return Contrato(
      id: json['id'] ?? 0,
      codigo: json['codigo'] ?? 'CTR-${json['id']}',
      tipoNombre:
          json['tipo_contrato_nombre'] ?? json['tipo_nombre'] ?? 'Contrato',
      estado: (json['estado'] ?? 'pendiente').toString().toUpperCase(),
      fechaInicio: json['fecha_inicio'] ?? '',
      fechaFin: json['fecha_fin'] ?? '',
      monto: json['monto']?.toString() ?? '0.00',
      tituloInmueble:
          json['inmueble_titulo'] ?? json['inmueble']?['titulo'] ?? 'Inmueble',
      clienteNombre: json['cliente_nombre'],
      propietarioNombre: json['propietario_nombre'],
      firmadoPropietario: json['firmado_propietario'] == true,
      firmadoCliente: json['firmado_cliente'] == true,
      archivoPdf: json['archivo_pdf'],
    );
  }
}

class Pago {
  final int id;
  final String monto;
  final String tipoPago;
  final String estado;
  final String fechaPago;
  final String concepto;
  final String? comprobanteUrl;

  Pago({
    required this.id,
    required this.monto,
    required this.tipoPago,
    required this.estado,
    required this.fechaPago,
    required this.concepto,
    this.comprobanteUrl,
  });

  factory Pago.fromJson(Map<String, dynamic> json) {
    return Pago(
      id: json['id'] ?? 0,
      monto: json['monto']?.toString() ?? '0.00',
      tipoPago: json['tipo_pago_nombre'] ?? json['tipo_pago'] ?? 'General',
      estado: (json['estado'] ?? 'completado').toString().toUpperCase(),
      fechaPago: json['fecha_pago'] ?? json['creado'] ?? '',
      concepto:
          json['concepto'] ??
          json['descripcion'] ??
          'Pago de servicios inmobiliarios',
      comprobanteUrl: json['comprobante'],
    );
  }
}

class Cita {
  final int id;
  final String fecha;
  final String hora;
  final String estado;
  final String tituloInmueble;
  final String solicitanteNombre;
  final String notas;

  Cita({
    required this.id,
    required this.fecha,
    required this.hora,
    required this.estado,
    required this.tituloInmueble,
    required this.solicitanteNombre,
    required this.notas,
  });

  factory Cita.fromJson(Map<String, dynamic> json) {
    return Cita(
      id: json['id'] ?? 0,
      fecha: json['fecha'] ?? '',
      hora: json['hora'] ?? '',
      estado: (json['estado'] ?? 'pendiente').toString().toUpperCase(),
      tituloInmueble:
          json['inmueble_titulo'] ?? json['inmueble']?['titulo'] ?? 'Inmueble',
      solicitanteNombre:
          json['cliente_nombre'] ?? json['usuario_nombre'] ?? 'Usuario',
      notas: json['notas'] ?? json['motivo'] ?? '',
    );
  }
}

class ChatItem {
  final int id;
  final int otroUsuarioId;
  final String otroUsuarioNombre;
  final String? otroUsuarioFoto;
  final String ultimoMensaje;
  final String ultimaFecha;
  final int noLeidos;
  final int? inmuebleId;
  final String? inmuebleTitulo;

  ChatItem({
    required this.id,
    required this.otroUsuarioId,
    required this.otroUsuarioNombre,
    this.otroUsuarioFoto,
    required this.ultimoMensaje,
    required this.ultimaFecha,
    required this.noLeidos,
    this.inmuebleId,
    this.inmuebleTitulo,
  });

  factory ChatItem.fromJson(Map<String, dynamic> json, int currentUserId) {
    final dynamic p1Raw = json['participante1'];
    final dynamic p2Raw = json['participante2'];

    final int p1Id = p1Raw is Map
        ? (p1Raw['id'] ?? 0)
        : (p1Raw is int ? p1Raw : int.tryParse(p1Raw?.toString() ?? '0') ?? 0);
    final int p2Id = p2Raw is Map
        ? (p2Raw['id'] ?? 0)
        : (p2Raw is int ? p2Raw : int.tryParse(p2Raw?.toString() ?? '0') ?? 0);

    final bool soyP1 = p1Id == currentUserId;
    final int otherId = soyP1 ? p2Id : p1Id;

    String otherName = soyP1
        ? (json['participante2_nombre'] ?? '')
        : (json['participante1_nombre'] ?? '');

    if (otherName.trim().isEmpty) {
      final other = soyP1 ? p2Raw : p1Raw;
      if (other is Map) {
        otherName = '${other['first_name'] ?? ''} ${other['last_name'] ?? ''}'
            .trim();
        if (otherName.isEmpty) otherName = other['email'] ?? '';
      }
    }

    if (otherName.trim().isEmpty) {
      final otherEmail = soyP1
          ? (json['participante2_email'] ?? '')
          : (json['participante1_email'] ?? '');
      otherName = otherEmail.isNotEmpty ? otherEmail : 'Propietario / Usuario';
    }

    final dynamic inmuebleRaw = json['inmueble'];
    final int? inmuebleId = inmuebleRaw is Map
        ? (inmuebleRaw['id'] as num?)?.toInt()
        : (inmuebleRaw is int
              ? inmuebleRaw
              : int.tryParse(inmuebleRaw?.toString() ?? ''));

    return ChatItem(
      id: json['id'] ?? 0,
      otroUsuarioId: otherId,
      otroUsuarioNombre: otherName.trim(),
      otroUsuarioFoto: json['otro_usuario_foto'],
      ultimoMensaje: json['ultimo_mensaje']?['contenido'] ?? '',
      ultimaFecha:
          json['ultimo_mensaje']?['creado'] ?? json['actualizado'] ?? '',
      noLeidos: json['no_leidos'] ?? 0,
      inmuebleId: inmuebleId,
      inmuebleTitulo: json['inmueble_titulo'],
    );
  }
}

class MensajeItem {
  final int id;
  final int remitenteId;
  final String contenido;
  final String fecha;
  final bool leido;

  MensajeItem({
    required this.id,
    required this.remitenteId,
    required this.contenido,
    required this.fecha,
    required this.leido,
  });

  factory MensajeItem.fromJson(Map<String, dynamic> json) {
    return MensajeItem(
      id: json['id'] ?? 0,
      remitenteId: json['remitente'] is Map
          ? json['remitente']['id']
          : (json['remitente'] ?? 0),
      contenido: json['contenido'] ?? '',
      fecha: json['creado'] ?? '',
      leido: json['leido'] == true,
    );
  }
}

class NotificacionItem {
  final int id;
  final String titulo;
  final String mensaje;
  final String fecha;
  final bool leida;
  final String origen;

  NotificacionItem({
    required this.id,
    required this.titulo,
    required this.mensaje,
    required this.fecha,
    required this.leida,
    required this.origen,
  });

  factory NotificacionItem.fromJson(Map<String, dynamic> json) {
    return NotificacionItem(
      id: json['id'] ?? 0,
      titulo: json['titulo'] ?? 'Notificación',
      mensaje: json['mensaje'] ?? '',
      fecha: json['creado'] ?? '',
      leida: json['leida'] == true,
      origen: json['origen'] ?? 'sistema',
    );
  }
}
