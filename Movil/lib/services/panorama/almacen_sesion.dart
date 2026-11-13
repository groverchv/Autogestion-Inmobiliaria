import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Persiste cada toma en disco apenas se captura: si la app se cierra o
/// interrumpe (llamada, batería), la sesión se reanuda sin perder fotos.
class SesionCaptura {
  final int modo;
  final List<Uint8List> tomas;

  /// Rumbo donde inició la sesión: los objetivos son relativos a él —
  /// sin este dato las tomas reanudadas quedarían desalineadas.
  final double yawInicial;

  const SesionCaptura({
    required this.modo,
    required this.tomas,
    this.yawInicial = 0,
  });
}

class AlmacenSesionCaptura {
  static Future<Directory> _dir(int inmuebleId) async {
    final base = await getTemporaryDirectory();
    return Directory('${base.path}/pano360_$inmuebleId');
  }

  static Future<SesionCaptura?> cargar(int inmuebleId) async {
    try {
      final dir = await _dir(inmuebleId);
      final manifest = File('${dir.path}/manifest.json');
      if (!await manifest.exists()) return null;
      final data = jsonDecode(await manifest.readAsString());
      final archivos = (await dir.list().toList())
          .whereType<File>()
          .where((f) => f.path.endsWith('.jpg'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
      final tomas = <Uint8List>[
        for (final f in archivos) await f.readAsBytes(),
      ];
      if (tomas.isEmpty) return null;
      return SesionCaptura(
        modo: data['modo'] ?? tomas.length,
        tomas: tomas,
        yawInicial: (data['yawInicial'] as num?)?.toDouble() ?? 0,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> guardarToma(
    int inmuebleId,
    int indice,
    int modo,
    Uint8List bytes, {
    double yawInicial = 0,
  }) async {
    try {
      final dir = await _dir(inmuebleId);
      await dir.create(recursive: true);
      await File('${dir.path}/toma_${indice.toString().padLeft(2, '0')}.jpg')
          .writeAsBytes(bytes, flush: true);
      await File('${dir.path}/manifest.json').writeAsString(jsonEncode(
          {'modo': modo, 'total': indice + 1, 'yawInicial': yawInicial}));
    } catch (_) {
      // La persistencia es best-effort: la sesión en memoria sigue válida.
    }
  }

  static Future<void> borrarToma(int inmuebleId, int indice) async {
    try {
      final dir = await _dir(inmuebleId);
      final f = File('${dir.path}/toma_${indice.toString().padLeft(2, '0')}.jpg');
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  static Future<void> limpiar(int inmuebleId) async {
    try {
      final dir = await _dir(inmuebleId);
      if (await dir.exists()) await dir.delete(recursive: true);
    } catch (_) {}
  }
}
