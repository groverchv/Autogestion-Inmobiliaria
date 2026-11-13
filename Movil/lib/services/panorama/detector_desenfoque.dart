import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

/// Varianza del Laplaciano sobre un thumbnail en grises: estándar simple
/// para detectar fotos movidas/borrosas. Corre en isolate (compute) para
/// no bloquear la UI entre tomas.
Future<double> evaluarNitidez(Uint8List bytes) => compute(_laplaciana, bytes);

double _laplaciana(Uint8List bytes) {
  img.Image? decoded;
  try {
    decoded = img.decodeImage(bytes);
  } catch (_) {
    return 0; // bytes truncados/corruptos → se trata como toma inválida
  }
  if (decoded == null) return 0;
  final thumb = img.copyResize(decoded, width: 240);

  final w = thumb.width;
  final h = thumb.height;
  double luma(img.Image im, int x, int y) {
    final p = im.getPixel(x, y);
    return 0.299 * p.r.toDouble() + 0.587 * p.g.toDouble() + 0.114 * p.b.toDouble();
  }

  double suma = 0, suma2 = 0;
  int n = 0;
  for (int y = 1; y < h - 1; y++) {
    for (int x = 1; x < w - 1; x++) {
      final lap = luma(thumb, x - 1, y) +
          luma(thumb, x + 1, y) +
          luma(thumb, x, y - 1) +
          luma(thumb, x, y + 1) -
          4 * luma(thumb, x, y);
      suma += lap;
      suma2 += lap * lap;
      n++;
    }
  }
  if (n == 0) return 0;
  final media = suma / n;
  return suma2 / n - media * media;
}

/// Umbral conservador: solo rechaza tomas claramente movidas — paredes
/// uniformes bien enfocadas también dan varianza baja, así que se permite
/// reintentar antes de aceptar con advertencia.
const umbralNitidez = 25.0;
