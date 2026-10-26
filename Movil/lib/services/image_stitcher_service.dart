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
      // ─── Modo Esférico (orden de captura: centro → arriba → abajo) ───
      // Grid columns x 3: fila central = las primeras `columns` tomas;
      // techo y suelo llevan `columns/2` tomas cada una, estiradas a 2
      // celdas para cubrir el ancho completo sin huecos negros.
      final cellWidth = decodedList.first.width;
      final cellHeight = decodedList.first.height;
      final totalWidth = cellWidth * columns;
      final totalHeight = cellHeight * 3;
      final mitad = columns ~/ 2;

      final centro = decodedList.sublist(0, columns);
      final arriba = decodedList.sublist(
        columns,
        (columns + mitad).clamp(0, decodedList.length),
      );
      final abajo = decodedList.sublist(
        (columns + mitad).clamp(0, decodedList.length),
      );

      final sphericalCanvas = img.Image(width: totalWidth, height: totalHeight);

      img.Image aCelda(img.Image im, {int factorAncho = 1}) {
        return img.copyResize(
          im,
          width: cellWidth * factorAncho,
          height: cellHeight,
        );
      }

      for (int i = 0; i < arriba.length; i++) {
        img.compositeImage(
          sphericalCanvas,
          aCelda(arriba[i], factorAncho: 2),
          dstX: i * cellWidth * 2,
          dstY: 0,
        );
      }
      for (int i = 0; i < centro.length; i++) {
        img.compositeImage(
          sphericalCanvas,
          aCelda(centro[i]),
          dstX: i * cellWidth,
          dstY: cellHeight,
        );
      }
      for (int i = 0; i < abajo.length; i++) {
        img.compositeImage(
          sphericalCanvas,
          aCelda(abajo[i], factorAncho: 2),
          dstX: i * cellWidth * 2,
          dstY: cellHeight * 2,
        );
      }

      return Uint8List.fromList(img.encodeJpg(sphericalCanvas, quality: 85));
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
