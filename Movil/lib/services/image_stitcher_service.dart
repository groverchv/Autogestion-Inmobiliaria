import 'dart:typed_data';
import 'package:image/image.dart' as img;

/// Servicio para unir múltiples tomas horizontales y esféricas (arriba/centro/abajo) en una panorámica continua
class ImageStitcherService {
  /// Une una lista de imágenes tomadas en secuencia esférica o panorámica
  static Future<Uint8List> stitchSphericalPanoramas(
    List<Uint8List> imagesBytes, {
    int columns = 16,
    int rows = 1,
  }) async {
    if (imagesBytes.isEmpty) {
      throw Exception('No hay imágenes capturadas para procesar.');
    }

    if (imagesBytes.length == 1) {
      return imagesBytes.first;
    }

    // Decodificar imágenes
    List<img.Image> decodedList = [];
    for (var bytes in imagesBytes) {
      final decoded = img.decodeImage(bytes);
      if (decoded != null) {
        decodedList.add(decoded);
      }
    }

    if (decodedList.isEmpty) {
      throw Exception('Error al decodificar las imágenes.');
    }

    if (rows <= 1) {
      // ─── Modo Panorámico Horizontal 360° (16 o 24 tomas) ───
      final targetHeight = decodedList.first.height;
      int totalWidth = 0;

      List<img.Image> resizedList = [];
      for (var image in decodedList) {
        if (image.height != targetHeight) {
          final resized = img.copyResize(image, height: targetHeight);
          resizedList.add(resized);
          totalWidth += resized.width;
        } else {
          resizedList.add(image);
          totalWidth += image.width;
        }
      }

      final panoramaCanvas = img.Image(width: totalWidth, height: targetHeight);
      int currentX = 0;
      for (var image in resizedList) {
        img.compositeImage(
          panoramaCanvas,
          image,
          dstX: currentX,
          dstY: 0,
        );
        currentX += image.width;
      }
      return Uint8List.fromList(img.encodeJpg(panoramaCanvas, quality: 85));
    } else {
      // ─── Modo Esférico 2:1 Equirrectangular con Blending Suave (IA-ready) ───
      // Lienzo 2048x1024 para evitar OutOfMemory en dispositivos móviles y
      // garantizar compatibilidad directa con el visor 360° (Pannellum / Panorama).
      const totalWidth = 2048;
      const totalHeight = 1024;
      final mitad = columns ~/ 2;

      final centroEnd = columns.clamp(0, decodedList.length);
      final arribaEnd = (columns + mitad).clamp(0, decodedList.length);

      final centro = decodedList.sublist(0, centroEnd);
      final arriba = decodedList.sublist(centroEnd, arribaEnd);
      final abajo = decodedList.sublist(arribaEnd);

      final sphericalCanvas = img.Image(width: totalWidth, height: totalHeight);

      /// Dibuja una fila de imágenes a lo ancho de [totalWidth] con difuminado
      /// suave (feathering) en las uniones para eliminar cortes bruscos.
      void dibujarFilaConBlending(
        List<img.Image> fotos,
        int yInicio,
        int altoFila,
      ) {
        if (fotos.isEmpty) return;
        final n = fotos.length;
        final step = totalWidth / n;
        final overlap = (step * 0.14).round().clamp(8, 48);
        final tileW = step.ceil() + overlap;

        final tiles = <img.Image>[
          for (final f in fotos)
            img.copyResize(
              f,
              width: tileW,
              height: altoFila,
              interpolation: img.Interpolation.linear,
            ),
        ];

        for (int i = 0; i < n; i++) {
          final tile = tiles[i];
          final startX = (i * step).round();
          for (int y = 0; y < altoFila; y++) {
            final dstY = yInicio + y;
            if (dstY < 0 || dstY >= totalHeight) continue;
            for (int x = 0; x < tileW; x++) {
              final dstX = (startX + x) % totalWidth;
              final srcPx = tile.getPixel(x, y);
              if (i > 0 && x < overlap) {
                final alpha = x / overlap;
                final dstPx = sphericalCanvas.getPixel(dstX, dstY);
                final r = (dstPx.r * (1 - alpha) + srcPx.r * alpha).round();
                final g = (dstPx.g * (1 - alpha) + srcPx.g * alpha).round();
                final b = (dstPx.b * (1 - alpha) + srcPx.b * alpha).round();
                sphericalCanvas.setPixelRgb(dstX, dstY, r, g, b);
              } else {
                sphericalCanvas.setPixelRgb(
                  dstX,
                  dstY,
                  srcPx.r.toInt(),
                  srcPx.g.toInt(),
                  srcPx.b.toInt(),
                );
              }
            }
          }
        }
      }

      if (arriba.isEmpty && abajo.isEmpty) {
        // Si el usuario generó con solo el anillo central, expandir suavemente
        // el anillo central y rellenar techo/suelo con los bordes difuminados.
        const midY = 170;
        const midH = 684;
        dibujarFilaConBlending(centro, midY, midH);
        for (int x = 0; x < totalWidth; x++) {
          final topPx = sphericalCanvas.getPixel(x, midY);
          final botPx = sphericalCanvas.getPixel(x, midY + midH - 1);
          for (int y = 0; y < midY; y++) {
            sphericalCanvas.setPixelRgb(
                x, y, topPx.r.toInt(), topPx.g.toInt(), topPx.b.toInt());
          }
          for (int y = midY + midH; y < totalHeight; y++) {
            sphericalCanvas.setPixelRgb(
                x, y, botPx.r.toInt(), botPx.g.toInt(), botPx.b.toInt());
          }
        }
      } else {
        final topHeight = totalHeight ~/ 3;
        final midHeight = totalHeight ~/ 3;
        final botHeight = totalHeight - topHeight - midHeight;

        dibujarFilaConBlending(
          arriba.isNotEmpty ? arriba : centro,
          0,
          topHeight,
        );
        dibujarFilaConBlending(centro, topHeight, midHeight);
        dibujarFilaConBlending(
          abajo.isNotEmpty ? abajo : centro,
          topHeight + midHeight,
          botHeight,
        );
      }

      return Uint8List.fromList(img.encodeJpg(sphericalCanvas, quality: 88));
    }
  }

  /// Wrapper compatible con métodos previos
  static Future<Uint8List> stitchHorizontalPanoramas(List<Uint8List> imagesBytes) async {
    return stitchSphericalPanoramas(imagesBytes, columns: imagesBytes.length, rows: 1);
  }
}

/// Entry point top-level para `compute()`: corre el stitching fuera del
/// hilo de UI (decodificar y unir 16-32 imágenes congela la pantalla).
Future<Uint8List> stitchSphericalIsolate(Map<String, dynamic> args) {
  return ImageStitcherService.stitchSphericalPanoramas(
    args['imgs'] as List<Uint8List>,
    columns: args['columns'] as int,
    rows: args['rows'] as int,
  );
}
