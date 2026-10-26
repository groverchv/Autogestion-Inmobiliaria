import 'dart:async';
import 'dart:math' as math;
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/image_stitcher_service.dart';

class Captura360Screen extends StatefulWidget {
  final Inmueble inmueble;

  const Captura360Screen({super.key, required this.inmueble});

  @override
  State<Captura360Screen> createState() => _Captura360ScreenState();
}

class _Captura360ScreenState extends State<Captura360Screen> {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  StreamSubscription<GyroscopeEvent>? _gyroSubscription;
  StreamSubscription<AccelerometerEvent>? _accelSubscription;
  StreamSubscription<MagnetometerEvent>? _magSubscription;

  // Modos de captura: 16 tomas estándar o 32 tomas esféricas (con inclinación vertical)
  int _modoTomas = 16; // 16 o 32
  int _puntosCompletados = 0;
  final List<Uint8List> _capturas = [];
  
  // Orientación en tiempo real: giroscopio (reactivo) corregido con
  // acelerómetro (pitch absoluto por gravedad) y magnetómetro (rumbo
  // absoluto) — sin referencia absoluta el yaw deriva en segundos.
  double _currentYaw = 0.0;   // Ángulo horizontal en grados [0 - 360]
  double _currentPitch = 0.0; // Inclinación vertical en grados [-90 a +90]
  double _targetYaw = 0.0;
  double _targetPitch = 0.0;
  double _accelPitch = 0.0;
  double _accelX = 0.0, _accelY = 0.0, _accelZ = 0.0;
  double _magYaw = 0.0;
  bool _magDisponible = false;
  bool _accelDisponible = false;
  
  bool _isCapturing = false;
  bool _isStitching = false;
  bool _isUploading = false;
  Uint8List? _panoramicResult;
  String? _panoServidorUrl;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _initCameraAndSensors();
  }

  Future<void> _initCameraAndSensors() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      setState(() => _statusMessage = 'Permiso de cámara denegado');
      return;
    }

    try {
      _cameras = await availableCameras();
      if (_cameras != null && _cameras!.isNotEmpty) {
        _cameraController = CameraController(
          _cameras!.first,
          ResolutionPreset.high,
          enableAudio: false,
        );

        await _cameraController!.initialize();
        if (mounted) setState(() {});
      }

      // Pitch absoluto por gravedad (no deriva): inclinación del borde
      // superior del móvil hacia adelante/atrás en modo retrato.
      _accelSubscription = accelerometerEventStream().listen((event) {
        _accelX = event.x;
        _accelY = event.y;
        _accelZ = event.z;
        final roll = math.atan2(event.y, event.z);
        _accelPitch =
            math.atan2(-event.x, event.y * math.sin(roll) + event.z * math.cos(roll)) *
                180.0 /
                math.pi;
        _accelDisponible = true;
      });

      // Rumbo absoluto por magnetómetro con compensación de inclinación
      // (heading de brújula en grados 0-360).
      _magSubscription = magnetometerEventStream().listen((event) {
        final roll = math.atan2(_accelY, _accelZ);
        final pitchC = math.atan2(
          -_accelX,
          _accelY * math.sin(roll) + _accelZ * math.cos(roll),
        );
        final xh = event.x * math.cos(pitchC) + event.z * math.sin(pitchC);
        final yh = event.x * math.sin(roll) * math.sin(pitchC) +
            event.y * math.cos(roll) -
            event.z * math.sin(roll) * math.cos(pitchC);
        if (xh == 0 && yh == 0) return;
        var heading = math.atan2(-yh, xh) * 180.0 / math.pi;
        if (heading < 0) heading += 360.0;
        _magYaw = heading;
        _magDisponible = true;
      });

      _gyroSubscription = gyroscopeEventStream().listen((GyroscopeEvent event) {
        final double deltaYaw = event.y * (180.0 / 3.14159) * 0.02;
        final double deltaPitch = event.x * (180.0 / 3.14159) * 0.02;
        if (mounted) {
          setState(() {
            _currentYaw += deltaYaw;
            // Filtro complementario: corrección suave hacia el rumbo
            // magnético absoluto para eliminar la deriva del giroscopio.
            if (_magDisponible) {
              final err = ((_magYaw - _currentYaw + 540.0) % 360.0) - 180.0;
              _currentYaw += err * 0.03;
            }
            _currentYaw = _currentYaw % 360.0;
            if (_currentYaw < 0) _currentYaw += 360.0;

            _currentPitch += deltaPitch;
            if (_accelDisponible) {
              _currentPitch = 0.95 * _currentPitch + 0.05 * _accelPitch;
            }
            _currentPitch = _currentPitch.clamp(-75.0, 75.0);
          });
        }
      });
    } catch (e) {
      setState(() => _statusMessage = 'Error al inicializar cámara: $e');
    }
  }

  @override
  void dispose() {
    _gyroSubscription?.cancel();
    _accelSubscription?.cancel();
    _magSubscription?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  void _cambiarModoTomas(int tomas) {
    if (_capturas.isNotEmpty) return;
    setState(() {
      _modoTomas = tomas;
      _targetYaw = 0.0;
      _targetPitch = 0.0;
      _puntosCompletados = 0;
    });
  }

  Future<void> _capturarPuntoActual() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized || _isCapturing) {
      return;
    }

    setState(() {
      _isCapturing = true;
    });

    try {
      final XFile photo = await _cameraController!.takePicture();
      var bytes = await photo.readAsBytes();
      // Downscale a 900px de alto: reduce RAM (32 tomas) y el upload
      // al backend sin afectar la calidad visible del resultado.
      final decoded = img.decodeImage(bytes);
      if (decoded != null && decoded.height > 900) {
        bytes = Uint8List.fromList(
          img.encodeJpg(img.copyResize(decoded, height: 900), quality: 85),
        );
      }
      _capturas.add(bytes);

      setState(() {
        _puntosCompletados++;
        if (_modoTomas == 16) {
          _targetYaw = (_targetYaw + (360.0 / 16)) % 360.0;
          _targetPitch = 0.0;
        } else {
          // Modo 32 tomas: 16 tomas anillo central + 8 tomas arriba + 8 tomas abajo
          if (_puntosCompletados < 16) {
            _targetYaw = (_targetYaw + (360.0 / 16)) % 360.0;
            _targetPitch = 0.0;
          } else if (_puntosCompletados < 24) {
            _targetYaw = ((_puntosCompletados - 16) * (360.0 / 8)) % 360.0;
            _targetPitch = 35.0; // Inclinación hacia arriba
          } else {
            _targetYaw = ((_puntosCompletados - 24) * (360.0 / 8)) % 360.0;
            _targetPitch = -35.0; // Inclinación hacia abajo
          }
        }
      });

      if (_puntosCompletados >= _modoTomas) {
        _procesarPanoramica();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al capturar foto: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isCapturing = false;
        });
      }
    }
  }

  Future<void> _procesarPanoramica() async {
    setState(() {
      _isStitching = true;
      _statusMessage = 'Uniendo $_modoTomas tomas con stitching real...';
    });

    // 1) Stitching real en el backend (OpenCV: homografía + blending)
    try {
      final api = context.read<AuthProvider>().apiService;
      final res = await api.stitchPanorama360(
        inmuebleId: widget.inmueble.id,
        captures: _capturas,
        descripcion: 'Recorrido 360 - ${widget.inmueble.titulo}',
      );
      if (!mounted) return;
      if (res != null && res['archivo'] != null) {
        setState(() {
          _panoServidorUrl = res['archivo'].toString();
          _isStitching = false;
          _statusMessage = null;
        });
        return;
      }
      setState(() {
        _statusMessage =
            'El servidor no pudo unirlas; uniendo en el dispositivo...';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _statusMessage = 'Sin conexión al servidor; uniendo localmente...';
      });
    }

    // 2) Fallback: stitcher local de concatenación en un isolate
    //    (fuera del hilo de UI; inferior al stitching real de OpenCV)
    try {
      final panorama = await compute(
        stitchSphericalIsolate,
        {'imgs': _capturas, 'columns': 16, 'rows': _modoTomas == 32 ? 3 : 1},
      );
      if (!mounted) return;
      setState(() {
        _panoramicResult = panorama;
        _isStitching = false;
        _statusMessage = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isStitching = false;
        _statusMessage = 'Error en el procesamiento 360°';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _subirAlBackend() async {
    if (_panoramicResult == null) return;

    setState(() {
      _isUploading = true;
      _statusMessage = 'Subiendo al servidor y Cloudinary...';
    });

    try {
      final api = context.read<AuthProvider>().apiService;
      final success = await api.uploadPanorama360(
        inmuebleId: widget.inmueble.id,
        imageBytes: _panoramicResult!,
        filename: 'panorama_${widget.inmueble.id}_${DateTime.now().millisecondsSinceEpoch}.jpg',
        titulo: 'Recorrido 360 - ${widget.inmueble.titulo}',
      );

      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recorrido 360° subido exitosamente'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.of(context).pop();
      } else {
        throw Exception('El servidor no pudo procesar la subida.');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al subir: $e'), backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _statusMessage = null;
        });
      }
    }
  }

  void _reiniciarCaptura() {
    setState(() {
      _puntosCompletados = 0;
      _targetYaw = 0.0;
      _targetPitch = 0.0;
      _capturas.clear();
      _panoramicResult = null;
      _panoServidorUrl = null;
      _statusMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_panoramicResult != null || _panoServidorUrl != null) {
      return _buildVistaPreviaResult();
    }

    // Diferencia angular hacia el objetivo
    double diffYaw = (_targetYaw - _currentYaw).abs();
    if (diffYaw > 180) diffYaw = 360 - diffYaw;
    final bool isAlineadoHorizontal = diffYaw < 8.0;
    
    final bool isAlineadoVertical = (_targetPitch - _currentPitch).abs() < 10.0;
    final bool isAlineado = isAlineadoHorizontal && isAlineadoVertical;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ─── 1. Vista de Cámara en Vivo ───
          if (_cameraController != null && _cameraController!.value.isInitialized)
            Positioned.fill(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            )
          else
            const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),

          // ─── 2. HUD Superior: Progreso y Selector de Densidad (16 o 32 Tomas) ───
          Positioned(
            top: 44,
            left: 16,
            right: 16,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 28),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            widget.inmueble.titulo,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Toma $_puntosCompletados de $_modoTomas',
                            style: const TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    if (_capturas.isEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: DropdownButton<int>(
                          value: _modoTomas,
                          dropdownColor: const Color(0xFF1E293B),
                          underline: const SizedBox(),
                          icon: const Icon(Icons.tune, color: Colors.white, size: 16),
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          items: const [
                            DropdownMenuItem(value: 16, child: Text('16 Tomas (360° Rápido)')),
                            DropdownMenuItem(value: 32, child: Text('32 Tomas (360° Esférico)')),
                          ],
                          onChanged: (val) {
                            if (val != null) _cambiarModoTomas(val);
                          },
                        ),
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white70),
                        onPressed: _reiniciarCaptura,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _puntosCompletados / _modoTomas,
                    backgroundColor: Colors.white24,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),

          // ─── 3. Diana y Guía Giroscópica Omnidireccional ───
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isAlineado ? const Color(0xFF10B981) : Colors.white.withValues(alpha: 0.5),
                      width: isAlineado ? 4 : 2,
                    ),
                    color: isAlineado ? const Color(0xFF10B981).withValues(alpha: 0.25) : Colors.transparent,
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Icon(
                        isAlineado ? Icons.check_circle : Icons.gps_fixed,
                        color: isAlineado ? const Color(0xFF10B981) : Colors.white70,
                        size: 48,
                      ),
                      if (!isAlineado)
                        Positioned(
                          top: _targetPitch > 0 ? 10 : (_targetPitch < 0 ? 90 : null),
                          child: Icon(
                            _targetPitch > 0 ? Icons.arrow_upward : (_targetPitch < 0 ? Icons.arrow_downward : Icons.rotate_right),
                            color: const Color(0xFF38BDF8),
                            size: 24,
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    isAlineado
                        ? '¡Perfecto! Mantén firme y captura'
                        : (_targetPitch > 10
                            ? 'Inclina hacia ARRIBA (Techo)'
                            : (_targetPitch < -10
                                ? 'Inclina hacia ABAJO (Suelo)'
                                : 'Gira el móvil para alinear la mira')),
                    style: TextStyle(
                      color: isAlineado ? const Color(0xFF10B981) : Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ─── 4. Botón de Captura Inferior ───
          Positioned(
            bottom: 36,
            left: 0,
            right: 0,
            child: Center(
              child: InkWell(
                onTap: _isCapturing ? null : _capturarPuntoActual,
                borderRadius: BorderRadius.circular(50),
                child: Container(
                  width: 76,
                  height: 76,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isAlineado ? const Color(0xFF10B981) : Colors.white,
                      width: 4,
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isAlineado ? const Color(0xFF10B981) : Colors.white,
                    ),
                    child: _isCapturing
                        ? const Center(child: CircularProgressIndicator(color: Colors.black))
                        : Icon(
                            Icons.camera_alt,
                            size: 32,
                            color: isAlineado ? Colors.white : Colors.black,
                          ),
                  ),
                ),
              ),
            ),
          ),

          // ─── 5. Loading Overlay durante Stitching ───
          if (_isStitching)
            Container(
              color: Colors.black.withValues(alpha: 0.8),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: Color(0xFF38BDF8)),
                    const SizedBox(height: 20),
                    Text(
                      _statusMessage ?? 'Procesando...',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVistaPreviaResult() {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Panorámica 360° Generada', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _panoServidorUrl != null
                    ? Image.network(_panoServidorUrl!, fit: BoxFit.contain)
                    : Image.memory(_panoramicResult!, fit: BoxFit.contain),
              ),
            ),
          ),
          if (_panoServidorUrl != null)
            const Padding(
              padding: EdgeInsets.only(bottom: 4),
              child: Text(
                'Unida con stitching real (OpenCV) y publicada',
                style: TextStyle(color: Color(0xFF10B981), fontSize: 12),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(20),
            color: const Color(0xFF1E293B),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _reiniciarCaptura,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Repetir Captura', style: TextStyle(color: Colors.white)),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _panoServidorUrl != null
                        ? () => Navigator.of(context).pop()
                        : (_isUploading ? null : _subirAlBackend),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _isUploading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(
                            _panoServidorUrl != null ? 'Listo' : 'Guardar y Publicar 360°',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
