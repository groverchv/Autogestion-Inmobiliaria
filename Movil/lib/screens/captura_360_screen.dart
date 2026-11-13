import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:image/image.dart' as img;
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/image_stitcher_service.dart';
import '../services/panorama/almacen_sesion.dart';
import '../services/panorama/detector_desenfoque.dart';
import '../services/panorama/orientacion_tracker.dart';
import '../services/panorama/plan_captura.dart';
import '../widgets/panorama/captura_hud.dart';
import '../widgets/panorama/puntos_overlay.dart';
import '../widgets/panorama/tutorial_captura.dart';

/// Captura 360° guiada por sensores: orbes flotantes anclados al mundo,
/// disparo automático al mantener la mira alineada ~700 ms, gate de
/// estabilidad anti-borrosas y sesión persistida en disco para reanudar.
class Captura360Screen extends StatefulWidget {
  final Inmueble inmueble;

  const Captura360Screen({super.key, required this.inmueble});

  @override
  State<Captura360Screen> createState() => _Captura360ScreenState();
}

class _Captura360ScreenState extends State<Captura360Screen> {
  CameraController? _cameraController;
  final _tracker = OrientacionTracker();
  StreamSubscription<Orientacion>? _oriSub;
  final _storage = const FlutterSecureStorage();

  // Plan de captura
  int _modoTomas = 16;
  late List<PuntoCaptura> _plan = planDe(16);
  int _indice = 0;
  final List<Uint8List> _capturas = [];
  double? _yawInicial; // se fija con la primera lectura válida
  double? _yawInicialSesion; // restaurado al reanudar una sesión en disco

  // Orientación en vivo
  Orientacion _ori = const Orientacion(
    yaw: 0,
    pitch: 0,
    roll: 0,
    estabilidad: 1,
    magConfiable: true,
  );

  // Disparo automático
  bool _capturaAuto = true;
  DateTime? _alineadoDesde;
  double _progresoHold = 0.0;
  static const _esperaAutoMs = 700;
  static const _umbralEstable = 0.45; // RMS gyro rad/s

  // Estados de proceso
  bool _sinPermiso = false;
  bool _camaraLista = false;
  bool _isCapturing = false;
  bool _isStitching = false;
  bool _isUploading = false;
  bool _mostrarTutorial = false;
  bool _torch = false;
  Uint8List? _panoramicResult;
  String? _panoServidorUrl;
  String? _statusMessage;
  int _rechazosBlur = 0;
  int _flashTick = 0; // incrementa → dispara el flash visual de obturador
  String? _faseMsg;
  int _faseActual = 0;
  Timer? _faseTimer;
  bool _avisoMagMostrado = false;

  // Dispositivo sin giroscopio/magnetómetro (web, PC, móviles básicos):
  // los orbes no pueden mostrarse → se indica captura manual.
  bool _sinSensores = false;
  Timer? _sensorTimer;

  // Guía por voz
  final FlutterTts _tts = FlutterTts();
  bool _vozActiva = true;

  static const _verde = Color(0xFF10B981);

  bool get _alineado {
    if (_indice >= _plan.length || _yawInicial == null) return false;
    final p = _plan[_indice];
    return _ori.diffYawHacia(yawObjetivo(_plan, _indice, _yawInicial!)).abs() <
            8.0 &&
        (p.pitch - _ori.pitch).abs() < 10.0;
  }

  bool get _estable => _ori.estabilidad < _umbralEstable;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      await _tts.setLanguage('es-ES');
      await _tts.setSpeechRate(0.55);
    } catch (_) {}
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      setState(() => _sinPermiso = true);
      return;
    }

    // ¿Hay una sesión de este inmueble interrumpida a mitad?
    final sesion = await AlmacenSesionCaptura.cargar(widget.inmueble.id);
    if (sesion != null && sesion.tomas.isNotEmpty && mounted) {
      final reanudar = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Captura incompleta',
              style: TextStyle(color: Colors.white)),
          content: Text(
            'Tienes ${sesion.tomas.length} tomas guardadas de una sesión anterior. ¿Continuar donde quedó o empezar de cero?',
            style: const TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Empezar de cero',
                  style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryDark),
              child: const Text('Continuar',
                  style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
      if (reanudar == true) {
        _modoTomas = sesion.modo;
        _plan = planDe(_modoTomas);
        _capturas.addAll(sesion.tomas);
        _indice = sesion.tomas.length.clamp(0, _plan.length);
        _yawInicialSesion = sesion.yawInicial;
      } else {
        await AlmacenSesionCaptura.limpiar(widget.inmueble.id);
      }
    }

    // Tutorial solo la primera vez
    final visto = await _storage.read(key: 'tutorial360_visto');
    if (visto != '1' && mounted) {
      setState(() => _mostrarTutorial = true);
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _statusMessage = 'No se encontró cámara');
        return;
      }
      _cameraController = CameraController(
        cameras.first,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await _cameraController!.initialize();
      if (!mounted) return;
      setState(() => _camaraLista = true);
    } catch (e) {
      setState(() => _statusMessage = 'Error al inicializar cámara: $e');
      return;
    }

    _tracker.iniciar();
    _oriSub = _tracker.stream.listen(_onOrientacion);
    // Si en 3.5 s no llegó lectura de orientación válida, el dispositivo
    // no tiene los sensores: activar la guía de captura manual.
    _sensorTimer = Timer(const Duration(milliseconds: 3500), () {
      if (mounted && _yawInicial == null) {
        setState(() => _sinSensores = true);
      }
    });
  }

  void _onOrientacion(Orientacion o) {
    if (!mounted) return;
    _sensorTimer?.cancel();
    _yawInicial ??= _yawInicialSesion ?? o.yaw;
    setState(() {
      _ori = o;
      if (_alineado && _estable) {
        _alineadoDesde ??= DateTime.now();
        _progresoHold = (DateTime.now()
                    .difference(_alineadoDesde!)
                    .inMilliseconds /
                _esperaAutoMs)
            .clamp(0.0, 1.0);
      } else {
        _alineadoDesde = null;
        _progresoHold = 0.0;
      }
    });
    if (!o.magConfiable && !_avisoMagMostrado) {
      _avisoMagMostrado = true;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Interferencia magnética — aléjate de objetos metálicos'),
          duration: Duration(seconds: 3),
        ),
      );
    }
    if (_alineado &&
        _estable &&
        _progresoHold >= 1.0 &&
        _capturaAuto &&
        !_isCapturing &&
        !_isStitching &&
        _indice < _plan.length) {
      _alineadoDesde = null;
      _capturarPuntoActual();
    }
  }

  void _cambiarModo(int tomas) {
    if (_capturas.isNotEmpty) return;
    setState(() {
      _modoTomas = tomas;
      _plan = planDe(tomas);
      _indice = 0;
    });
  }

  Future<void> _capturarPuntoActual() async {
    if (_cameraController == null ||
        !_cameraController!.value.isInitialized ||
        _isCapturing) {
      return;
    }
    setState(() => _isCapturing = true);

    try {
      final photo = await _cameraController!.takePicture();
      var bytes = await photo.readAsBytes();
      final decoded = img.decodeImage(bytes);
      if (decoded != null && decoded.height > 900) {
        bytes = Uint8List.fromList(
          img.encodeJpg(img.copyResize(decoded, height: 900), quality: 85),
        );
      }

      // Control de nitidez: toma movida → se repite la misma dirección
      final nitidez = await evaluarNitidez(bytes);
      if (nitidez < umbralNitidez && _rechazosBlur < 2 && mounted) {
        _rechazosBlur++;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('La toma salió borrosa — repite apuntando al orbe'),
            backgroundColor: Color(0xFFF59E0B),
            duration: Duration(seconds: 2),
          ),
        );
        return;
      }
      _rechazosBlur = 0;

      _capturas.add(bytes);
      AlmacenSesionCaptura.guardarToma(
        widget.inmueble.id,
        _indice,
        _modoTomas,
        bytes,
        yawInicial: _yawInicial ?? 0,
      );

      HapticFeedback.mediumImpact();
      SystemSound.play(SystemSoundType.click);
      setState(() {
        _flashTick++;
        _indice++;
        _anunciarFase();
      });

      if (_indice >= _plan.length) {
        _procesarPanoramica();
      } else {
        _anunciarSiguiente();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Error al capturar foto: $e'),
            backgroundColor: AppColors.error),
      );
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }

  /// Guía por voz: anuncia la dirección del siguiente objetivo si está lejos.
  Future<void> _hablar(String texto) async {
    if (!_vozActiva || !mounted) return;
    try {
      await _tts.speak(texto);
    } catch (_) {}
  }

  void _anunciarSiguiente() {
    if (_yawInicial == null || _indice >= _plan.length) return;
    final diff =
        _ori.diffYawHacia(yawObjetivo(_plan, _indice, _yawInicial!));
    if (diff.abs() < 30) return; // ya casi apunta, no hace falta voz
    final p = _plan[_indice];
    final vertical = p.pitch > 20
        ? ' y sube el móvil'
        : (p.pitch < -20 ? ' y baja el móvil' : '');
    _hablar('Gira a tu ${diff > 0 ? 'derecha' : 'izquierda'}$vertical');
  }

  /// Banner de transición entre filas del modo 32 (centro → techo → suelo).
  void _anunciarFase() {
    if (_modoTomas != 32) return;
    final fase = _indice < 16 ? 0 : (_indice < 24 ? 1 : 2);
    if (fase == _faseActual) return;
    _faseActual = fase;
    _faseTimer?.cancel();
    setState(() {
      _faseMsg = fase == 1
          ? 'Fila 2 de 3 — ahora apunta al techo'
          : 'Fila 3 de 3 — ahora apunta al suelo';
    });
    _hablar(_faseMsg!);
    _faseTimer = Timer(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _faseMsg = null);
    });
  }

  Future<void> _repetirUltima() async {
    if (_capturas.isEmpty || _isCapturing || _isStitching) return;
    await AlmacenSesionCaptura.borrarToma(widget.inmueble.id, _indice - 1);
    setState(() {
      _capturas.removeLast();
      _indice--;
      _rechazosBlur = 0;
    });
  }

  Future<void> _toggleTorch() async {
    try {
      final nuevo = !_torch;
      await _cameraController
          ?.setFlashMode(nuevo ? FlashMode.torch : FlashMode.always);
      setState(() => _torch = nuevo);
    } catch (_) {}
  }

  Future<void> _procesarPanoramica() async {
    setState(() {
      _isStitching = true;
      _statusMessage = 'Uniendo ${_plan.length} tomas con stitching real...';
    });

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
        await AlmacenSesionCaptura.limpiar(widget.inmueble.id);
        return;
      }
      setState(() =>
          _statusMessage = 'El servidor no pudo unirlas; uniendo en el dispositivo...');
    } catch (_) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Sin conexión al servidor; uniendo localmente...');
    }

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
      await AlmacenSesionCaptura.limpiar(widget.inmueble.id);
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
        filename:
            'panorama_${widget.inmueble.id}_${DateTime.now().millisecondsSinceEpoch}.jpg',
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
        SnackBar(
            content: Text('Error al subir: $e'),
            backgroundColor: AppColors.error),
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

  void _reiniciar() {
    AlmacenSesionCaptura.limpiar(widget.inmueble.id);
    setState(() {
      _indice = 0;
      _faseActual = 0;
      _capturas.clear();
      _panoramicResult = null;
      _panoServidorUrl = null;
      _statusMessage = null;
      _rechazosBlur = 0;
      _yawInicial = null;
    });
  }

  @override
  void dispose() {
    _faseTimer?.cancel();
    _sensorTimer?.cancel();
    _oriSub?.cancel();
    _tts.stop();
    _tracker.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  // ───────────────────────────── UI ─────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_sinPermiso) return _buildSinPermiso();
    if (_panoramicResult != null || _panoServidorUrl != null) {
      return _buildResultado();
    }

    final alineado = _alineado;
    final estable = _estable;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Vista de cámara
          if (_camaraLista)
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

          // 2. Orbes mundo-locked + diana + guía
          if (_camaraLista && _yawInicial != null)
            PuntosOverlay(
              ori: _ori,
              plan: _plan,
              yawInicial: _yawInicial!,
              indiceActual: _indice,
              progresoHold: _progresoHold,
              alineado: alineado,
              estable: estable,
            ),

          // 3. Flash visual del obturador
          ..._buildFlash(),

          // 4. Mensaje guía bajo la diana
          Positioned(
            bottom: 150,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.65),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  _textoGuia(alineado, estable),
                  style: TextStyle(
                    color: alineado
                        ? (estable ? _verde : const Color(0xFFFBBF24))
                        : Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),

          // 5. HUD superior
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
                      icon: const Icon(Icons.close,
                          color: Colors.white, size: 28),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            widget.inmueble.titulo,
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          BarraPuntos(
                            total: _plan.length,
                            completados: _indice,
                            filas: _modoTomas == 32 ? 3 : 1,
                          ),
                        ],
                      ),
                    ),
                    if (_capturas.isEmpty)
                      Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white24),
                            ),
                            child: DropdownButton<int>(
                              value: _modoTomas,
                              dropdownColor: const Color(0xFF1E293B),
                              underline: const SizedBox(),
                              icon: const Icon(Icons.tune,
                                  color: Colors.white, size: 16),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold),
                              items: const [
                                DropdownMenuItem(
                                    value: 16,
                                    child: Text('16 Tomas (360° Rápido)')),
                                DropdownMenuItem(
                                    value: 32,
                                    child:
                                        Text('32 Tomas (360° Esférico)')),
                              ],
                              onChanged: (v) {
                                if (v != null) _cambiarModo(v);
                              },
                            ),
                          ),
                          const SizedBox(height: 6),
                          GestureDetector(
                            onTap: _sinSensores
                                ? null
                                : () => setState(
                                    () => _capturaAuto = !_capturaAuto),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: (_capturaAuto && !_sinSensores)
                                    ? _verde.withValues(alpha: 0.25)
                                    : Colors.black54,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: (_capturaAuto && !_sinSensores)
                                      ? _verde
                                      : Colors.white24,
                                ),
                              ),
                              child: Text(
                                (_capturaAuto && !_sinSensores)
                                    ? 'AUTO'
                                    : 'MANUAL',
                                style: TextStyle(
                                  color: (_capturaAuto && !_sinSensores)
                                      ? _verde
                                      : Colors.white70,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.white70),
                        onPressed: _reiniciar,
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _plan.isEmpty ? 0 : _indice / _plan.length,
                    backgroundColor: Colors.white24,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),

          // 6. Nivel de horizonte (arriba a la derecha, bajo el header)
          Positioned(
            top: 130,
            right: 20,
            child: NivelHorizonte(roll: _ori.roll),
          ),

          // 7. Banner de fase (modo 32)
          if (_faseMsg != null)
            Positioned(
              top: 140,
              left: 0,
              right: 0,
              child: Center(child: BannerFase(texto: _faseMsg!)),
            ),

          // 8. Barra inferior: miniatura-retake | captura | flash
          Positioned(
            bottom: 36,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                SizedBox(
                  width: 52,
                  child: _capturas.isNotEmpty
                      ? MiniaturaRetake(
                          imagen: _capturas.last, onRepetir: _repetirUltima)
                      : const SizedBox(),
                ),
                InkWell(
                  onTap: _isCapturing ? null : _capturarPuntoActual,
                  borderRadius: BorderRadius.circular(50),
                  child: Container(
                    width: 76,
                    height: 76,
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: alineado ? _verde : Colors.white,
                        width: 4,
                      ),
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: alineado ? _verde : Colors.white,
                      ),
                      child: _isCapturing
                          ? const Center(
                              child: CircularProgressIndicator(
                                  color: Colors.black))
                          : Icon(
                              Icons.camera_alt,
                              size: 32,
                              color:
                                  alineado ? Colors.white : Colors.black,
                            ),
                    ),
                  ),
                ),
                SizedBox(
                  width: 52,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(
                          _torch ? Icons.flash_on : Icons.flash_off,
                          color:
                              _torch ? const Color(0xFFFBBF24) : Colors.white54,
                          size: 30,
                        ),
                        onPressed: _toggleTorch,
                      ),
                      IconButton(
                        icon: Icon(
                          _vozActiva
                              ? Icons.volume_up
                              : Icons.volume_off,
                          color: _vozActiva
                              ? AppColors.primary
                              : Colors.white54,
                          size: 26,
                        ),
                        tooltip: 'Guía por voz',
                        onPressed: () =>
                            setState(() => _vozActiva = !_vozActiva),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 9. Overlay de stitching
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
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),

          // 10. Tutorial primera vez
          if (_mostrarTutorial)
            TutorialCaptura(
              onTerminar: () {
                _storage.write(key: 'tutorial360_visto', value: '1');
                setState(() => _mostrarTutorial = false);
              },
            ),
        ],
      ),
    );
  }

  List<Widget> _buildFlash() {
    if (_flashTick == 0) return const [];
    return [
      TweenAnimationBuilder<double>(
        key: ValueKey(_flashTick),
        tween: Tween(begin: 0.75, end: 0),
        duration: const Duration(milliseconds: 260),
        builder: (ctx, opacidad, _) => IgnorePointer(
          child: Container(color: Colors.white.withValues(alpha: opacidad)),
        ),
      ),
    ];
  }

  String _textoGuia(bool alineado, bool estable) {
    if (_sinSensores) {
      return 'Gira con el cuerpo y toca el botón de cámara para cada toma';
    }
    if (alineado && estable) {
      return _capturaAuto
          ? '¡Perfecto! Mantén firme, capturando...'
          : '¡Perfecto! Mantén firme y captura';
    }
    if (alineado && !estable) return 'Mantén más firme el móvil';
    final p = _plan[_indice.clamp(0, _plan.length - 1)];
    if (p.pitch > 10) return 'Apunta al orbe en el TECHO';
    if (p.pitch < -10) return 'Apunta al orbe en el SUELO';
    return 'Sigue las flechas hasta el orbe';
  }

  Widget _buildSinPermiso() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.no_photography,
                  color: Colors.white38, size: 64),
              const SizedBox(height: 16),
              const Text(
                'Se necesita la cámara para capturar el recorrido 360°',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 16),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => openAppSettings(),
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryDark),
                child: const Text('Abrir ajustes',
                    style: TextStyle(color: Colors.white)),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Volver',
                    style: TextStyle(color: Colors.white54)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultado() {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Panorámica 360° Generada',
            style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          Expanded(
            child: Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: InteractiveViewer(
                  maxScale: 5,
                  child: _panoServidorUrl != null
                      ? CachedNetworkImage(imageUrl: _panoServidorUrl!, fit: BoxFit.contain)
                      : Image.memory(_panoramicResult!, fit: BoxFit.contain),
                ),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(bottom: 4),
            child: Text(
              'Desliza para inspeccionar las uniones',
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
          ),
          if (_panoServidorUrl != null)
            const Padding(
              padding: EdgeInsets.only(bottom: 4),
              child: Text(
                'Unida con stitching real (OpenCV) y publicada',
                style: TextStyle(color: _verde, fontSize: 12),
              ),
            ),
          Container(
            padding: const EdgeInsets.all(20),
            color: const Color(0xFF1E293B),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _reiniciar,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Repetir Captura',
                        style: TextStyle(color: Colors.white)),
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
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2))
                        : Text(
                            _panoServidorUrl != null
                                ? 'Listo'
                                : 'Guardar y Publicar 360°',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold),
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
