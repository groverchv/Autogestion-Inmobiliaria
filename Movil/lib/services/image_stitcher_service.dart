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
      // ─── Modo Esférico Completo (Grid de Filas x Columnas: Techo, Centro, Suelo) ───
      final cellWidth = decodedList.first.width;
      final cellHeight = decodedList.first.height;
      final totalWidth = cellWidth * columns;
      final totalHeight = cellHeight * rows;

      final sphericalCanvas = img.Image(width: totalWidth, height: totalHeight);

      for (int i = 0; i < decodedList.length; i++) {
        final row = i ~/ columns;
        final col = i % columns;

        if (row < rows && col < columns) {
          final resized = (decodedList[i].width != cellWidth || decodedList[i].height != cellHeight)
              ? img.copyResize(decodedList[i], width: cellWidth, height: cellHeight)
              : decodedList[i];

          img.compositeImage(
            sphericalCanvas,
            resized,
            dstX: col * cellWidth,
            dstY: row * cellHeight,
          );
        }
      }

      return Uint8List.fromList(img.encodeJpg(sphericalCanvas, quality: 85));
    }
  }

  /// Wrapper compatible con métodos previos
  static Future<Uint8List> stitchHorizontalPanoramas(List<Uint8List> imagesBytes) async {
    return stitchSphericalPanoramas(imagesBytes, columns: imagesBytes.length, rows: 1);
  }
}
