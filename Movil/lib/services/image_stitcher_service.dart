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
      // ─── Modo Esférico 2:1 Equirrectangular (centro → arriba → abajo) ───
      // Lienzo 2048x1024 para evitar OutOfMemory en dispositivos móviles y
      // garantizar compatibilidad directa con el visor 360° (Pannellum / Panorama).
      const totalWidth = 2048;
      const totalHeight = 1024;
      final cellHeight = totalHeight ~/ 3;
      final mitad = columns ~/ 2;

      final centroEnd = columns.clamp(0, decodedList.length);
      final arribaEnd = (columns + mitad).clamp(0, decodedList.length);

      final centro = decodedList.sublist(0, centroEnd);
      final arriba = decodedList.sublist(centroEnd, arribaEnd);
      final abajo = decodedList.sublist(arribaEnd);

      final sphericalCanvas = img.Image(width: totalWidth, height: totalHeight);

      img.Image aCelda(img.Image im, {int width = 256, int height = 341}) {
        return img.copyResize(
          im,
          width: width,
          height: height,
          interpolation: img.Interpolation.linear,
        );
      }

      final topHeight = cellHeight;
      final midHeight = cellHeight;
      final botHeight = totalHeight - topHeight - midHeight;

      if (arriba.isNotEmpty) {
        final wTop = (totalWidth / arriba.length).ceil();
        for (int i = 0; i < arriba.length; i++) {
          img.compositeImage(
            sphericalCanvas,
            aCelda(arriba[i], width: wTop, height: topHeight),
            dstX: (i * totalWidth ~/ arriba.length),
            dstY: 0,
          );
        }
      }
      if (centro.isNotEmpty) {
        final wMid = (totalWidth / centro.length).ceil();
        for (int i = 0; i < centro.length; i++) {
          img.compositeImage(
            sphericalCanvas,
            aCelda(centro[i], width: wMid, height: midHeight),
            dstX: (i * totalWidth ~/ centro.length),
            dstY: topHeight,
          );
        }
      }
      if (abajo.isNotEmpty) {
        final wBot = (totalWidth / abajo.length).ceil();
        for (int i = 0; i < abajo.length; i++) {
          img.compositeImage(
            sphericalCanvas,
            aCelda(abajo[i], width: wBot, height: botHeight),
            dstX: (i * totalWidth ~/ abajo.length),
            dstY: topHeight + midHeight,
          );
        }
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
