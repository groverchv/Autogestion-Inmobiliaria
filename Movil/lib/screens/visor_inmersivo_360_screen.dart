import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:provider/provider.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../providers/auth_provider.dart';



class VisorInmersivo360Screen extends StatefulWidget {
  final String panoramaUrl;
  final String titulo;
  final int? inmuebleId;

  const VisorInmersivo360Screen({
    super.key,
    required this.panoramaUrl,
    required this.titulo,
    this.inmuebleId,
  });

  @override
  State<VisorInmersivo360Screen> createState() => _VisorInmersivo360ScreenState();
}

class _VisorInmersivo360ScreenState extends State<VisorInmersivo360Screen> with SingleTickerProviderStateMixin {
  // Panorama activo actual
  late String _panoramaActualUrl;
  int? _panoramaActualId;

  // Rotación en los 3 ejes (Yaw / Pitch / Roll)
  double _yaw = 0.0;   // Horizontal (360°)
  double _pitch = 0.0; // Vertical (Arriba / Abajo)
  double _fov = 1.0;   // Zoom / Campo de visión
  bool _vrMode = false;
  bool _gyroEnabled = true;
  StreamSubscription<GyroscopeEvent>? _gyroSub;

  // Capas de Realidad Aumentada (HUD)
  bool _mostrarCotasAR = true;
  bool _mostrarPinesBarrioAR = true;
  Map<String, dynamic>? _metaversoDatos;

  // Estados del Guía Turístico Virtual con Voz
  bool _tourActivo = false;
  int _pasoTourIndex = 0;
  List<dynamic> _pasosTour = [];
  Timer? _tourTimer;
  String _locucionActual = '';
  bool _procesandoNLP = false;
  late FlutterTts _flutterTts;

  // Reconocimiento de voz real (STT)
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _sttDisponible = false;
  bool _escuchando = false;

  // Controlador de Animación para giros cinemáticos suaves
  late AnimationController _animController;
  Animation<double>? _yawAnimation;
  Animation<double>? _pitchAnimation;
  Animation<double>? _fovAnimation;

  @override
  void initState() {
    super.initState();
    _panoramaActualUrl = widget.panoramaUrl;
    _cargarDatosMetaverso();

    _flutterTts = FlutterTts();
    _initTts();
    _initStt();


    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..addListener(() {
        setState(() {
          if (_yawAnimation != null) _yaw = _yawAnimation!.value;
          if (_pitchAnimation != null) _pitch = _pitchAnimation!.value;
          if (_fovAnimation != null) _fov = _fovAnimation!.value;
        });
      });

    _gyroSub = gyroscopeEventStream().listen((event) {
      if (_gyroEnabled && !_tourActivo && mounted) {
        setState(() {
          _yaw += event.y * 0.03;
          if (_yaw > math.pi) _yaw -= 2 * math.pi;
          if (_yaw < -math.pi) _yaw += 2 * math.pi;

          _pitch = (_pitch + event.x * 0.03).clamp(-1.0, 1.0);
        });
      }
    });
  }

  @override
  void dispose() {
    _gyroSub?.cancel();
    _tourTimer?.cancel();
    _animController.dispose();
    _flutterTts.stop();
    _speech.stop();
    super.dispose();
  }

  Future<void> _cargarDatosMetaverso() async {
    if (widget.inmuebleId == null) return;
    final api = context.read<AuthProvider>().apiService;
    final data = await api.obtenerDatosMetaverso(widget.inmuebleId!);
    if (data != null && mounted) {
      setState(() {
        _metaversoDatos = data;
        if (data['panoramas'] != null && (data['panoramas'] as List).isNotEmpty) {
          final firstPano = (data['panoramas'] as List).first;
          if (firstPano['archivo'] != null && _panoramaActualUrl.isEmpty) {
            _panoramaActualUrl = firstPano['archivo'];
            _panoramaActualId = firstPano['id'];
          }
        }
      });
    }
  }

  // ─── Animación Cinemática de Cámara Suave (Cubic Easing) ────────────────

  void _animarCamaraHacia({required double targetYaw, required double targetPitch, double targetFov = 1.0}) {
    _yawAnimation = Tween<double>(
      begin: _yaw,
      end: targetYaw,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOutCubic));

    _pitchAnimation = Tween<double>(
      begin: _pitch,
      end: targetPitch,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOutCubic));

    _fovAnimation = Tween<double>(
      begin: _fov,
      end: targetFov,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOutCubic));

    _animController.forward(from: 0.0);
  }

  // ─── Iniciar Tour Guiado Dinámico ────────────────────────────────────────
  Future<void> _iniciarTourVirtual() async {
    if (widget.inmuebleId == null) return;

    final api = context.read<AuthProvider>().apiService;
    final tourData = await api.iniciarTourVirtual(
      inmuebleId: widget.inmuebleId!,
      fotoUrl: _panoramaActualUrl,
    );

    if (tourData != null && tourData['pasos'] != null && mounted) {
      setState(() {
        _tourActivo = true;
        _pasosTour = tourData['pasos'];
        _pasoTourIndex = 0;
      });
      _ejecutarPasoTour();
    }
  }

  void _detenerTourVirtual() {
    _tourTimer?.cancel();
    setState(() {
      _tourActivo = false;
      _locucionActual = '';
    });
  }

  Future<void> _initTts() async {
    try {
      await _flutterTts.setLanguage('es-ES');
      await _flutterTts.setSpeechRate(0.48);
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.05);
    } catch (_) {}
  }

  Future<void> _initStt() async {
    _sttDisponible = await _speech.initialize(
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          if (mounted) setState(() => _escuchando = false);
        }
      },
      onError: (error) {
        if (mounted) {
          setState(() {
            _escuchando = false;
            _procesandoNLP = false;
            _locucionActual = '';
          });
        }
      },
    );
  }

  Future<void> _hablarEnVozAlta(String texto) async {
    if (texto.isEmpty) return;
    try {
      await _speech.stop();
      await _flutterTts.stop();
      await _flutterTts.speak(texto);
    } catch (_) {}
  }

  // ─── Ejecutar Paso del Tour con Narración por Voz Real ───────────────
  void _ejecutarPasoTour() {
    if (!_tourActivo || _pasoTourIndex >= _pasosTour.length) {
      _detenerTourVirtual();
      return;
    }

    final paso = _pasosTour[_pasoTourIndex];
    final double yawGrados = (paso['camara_360']?['yaw'] as num? ?? 0.0).toDouble();
    final double pitchGrados = (paso['camara_360']?['pitch'] as num? ?? 0.0).toDouble();
    final double duracionSeg = (paso['duracion_seg'] as num? ?? 6.0).toDouble();
    final int? panoId = paso['panorama_id'];
    final String locucion = paso['locucion'] ?? '';

    // Cambiar dinámicamente de panorama si el paso corresponde a otro ambiente
    if (panoId != null && _metaversoDatos?['panoramas'] != null) {
      final List panoramas = _metaversoDatos!['panoramas'];
      final targetPano = panoramas.firstWhere((p) => p['id'] == panoId, orElse: () => null);
      if (targetPano != null && targetPano['archivo'] != null) {
        _panoramaActualUrl = targetPano['archivo'];
        _panoramaActualId = targetPano['id'];
      }
    }

    setState(() {
      _locucionActual = '[${_pasoTourIndex + 1}/${_pasosTour.length}] ${paso['titulo']}: "$locucion"';
    });

    // Reproducir locución en voz alta
    if (locucion.isNotEmpty) {
      _hablarEnVozAlta(locucion);
    }

    // Animar cámara hacia el punto
    final targetYaw = (yawGrados * math.pi / 180.0).clamp(-math.pi, math.pi);
    final targetPitch = (pitchGrados / 45.0).clamp(-1.0, 1.0);
    _animarCamaraHacia(targetYaw: targetYaw, targetPitch: targetPitch, targetFov: 1.1);

    _tourTimer = Timer(Duration(milliseconds: (duracionSeg * 1000).round()), () {
      if (mounted && _tourActivo) {
        setState(() {
          _pasoTourIndex++;
        });
        _ejecutarPasoTour();
      }
    });
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.titulo,
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _tourActivo ? Icons.pause_circle_filled : Icons.record_voice_over,
              color: _tourActivo ? const Color(0xFF38BDF8) : Colors.white,
            ),
            tooltip: _tourActivo ? 'Pausar Tour Narrado' : 'Iniciar Tour Narrado con Guía',
            onPressed: () {
              if (_tourActivo) {
                _detenerTourVirtual();
              } else {
                _iniciarTourVirtual();
              }
            },
          ),
          IconButton(
            icon: Icon(_mostrarCotasAR ? Icons.straighten : Icons.straighten_outlined, color: _mostrarCotasAR ? const Color(0xFF38BDF8) : Colors.grey),
            tooltip: 'Capa Cotas en RA',
            onPressed: () => setState(() => _mostrarCotasAR = !_mostrarCotasAR),
          ),
          IconButton(
            icon: Icon(_mostrarPinesBarrioAR ? Icons.place : Icons.place_outlined, color: _mostrarPinesBarrioAR ? const Color(0xFF38BDF8) : Colors.grey),
            tooltip: 'Capa Entorno Urbano AR',
            onPressed: () => setState(() => _mostrarPinesBarrioAR = !_mostrarPinesBarrioAR),
          ),
          IconButton(
            icon: Icon(_gyroEnabled ? Icons.screen_rotation : Icons.screen_lock_rotation, color: Colors.white),
            tooltip: 'Giroscopio / Sensores',
            onPressed: () => setState(() => _gyroEnabled = !_gyroEnabled),
          ),
          IconButton(
            icon: Icon(_vrMode ? Icons.view_column : Icons.visibility, color: Colors.white),
            tooltip: 'Modo Gafas VR (Cardboard)',
            onPressed: () => setState(() => _vrMode = !_vrMode),
          ),
        ],
      ),

      body: GestureDetector(
        // Scale maneja tanto paneo (focalPointDelta) como zoom (scale) simultáneamente
        onScaleUpdate: (details) {
          if (_tourActivo) _detenerTourVirtual();
          setState(() {
            if (details.scale == 1.0) {
              _yaw -= details.focalPointDelta.dx * 0.005;
              if (_yaw > math.pi) _yaw -= 2 * math.pi;
              if (_yaw < -math.pi) _yaw += 2 * math.pi;

              _pitch = (_pitch - details.focalPointDelta.dy * 0.005).clamp(-1.0, 1.0);
            } else {
              _fov = (_fov / details.scale).clamp(0.6, 2.0);
            }
          });
        },
        child: Stack(
          children: [
            _vrMode ? _buildVRDualView() : _buildSinglePanoramaView(),

            // ─── Capa Flotante de Cotas en Realidad Aumentada (HUD) ───
            if (_mostrarCotasAR && _metaversoDatos?['cotas_ar'] != null)
              Positioned(
                top: 70,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.6)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.straighten, color: Color(0xFF38BDF8), size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'Cota AR: ${(_metaversoDatos!['cotas_ar'] as List).first['cota']}',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),

            // ─── Capa Flotante de Pines del Barrio en Realidad Aumentada ───
            if (_mostrarPinesBarrioAR && _metaversoDatos?['pines_ar_barrio'] != null)
              Positioned(
                top: 105,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.6)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.place, color: Color(0xFF38BDF8), size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'Entorno AR: ${(_metaversoDatos!['pines_ar_barrio'] as List).first['nombre']} (${(_metaversoDatos!['pines_ar_barrio'] as List).first['distancia_m']}m)',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),

            if (_locucionActual.isNotEmpty)
              Positioned(
                top: 16,
                left: 16,
                right: 16,

                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF38BDF8), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.25),
                        blurRadius: 15,
                        spreadRadius: 2,
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.record_voice_over, color: Color(0xFF38BDF8), size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _locucionActual,
                          style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.35, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

          ],
        ),
      ),
    );
  }


  // ─── Control de Cámara por Comandos Locales (0ms) ──────────────────
  void _ejecutarComandoCamara(String cmd) {
    final t = cmd.toLowerCase().trim();
    setState(() {
      if (t.contains('acerca') || t.contains('zoom') || t.contains('adelante')) {
        _fov = (_fov * 1.3).clamp(0.6, 2.5);
      } else if (t.contains('aleja') || t.contains('atras') || t.contains('abrir')) {
        _fov = (_fov / 1.3).clamp(0.6, 2.5);
      } else if (t.contains('izquierda') || t.contains('izq')) {
        _yaw -= 0.5;
        if (_yaw < -math.pi) _yaw += 2 * math.pi;
      } else if (t.contains('derecha') || t.contains('der')) {
        _yaw += 0.5;
        if (_yaw > math.pi) _yaw -= 2 * math.pi;
      } else if (t.contains('arriba') || t.contains('techo') || t.contains('sube')) {
        _pitch = (_pitch + 0.4).clamp(-1.0, 1.0);
      } else if (t.contains('abajo') || t.contains('piso') || t.contains('baja')) {
        _pitch = (_pitch - 0.4).clamp(-1.0, 1.0);
      } else if (t.contains('centrar') || t.contains('reiniciar')) {
        _yaw = 0.0;
        _pitch = 0.0;
        _fov = 1.0;
      }
    });
  }

  // ─── Activar Reconocimiento de Voz Real (STT nativo Android/iOS) ───────────
  Future<void> _iniciarCapturaVoz() async {
    // Si ya está escuchando, detener
    if (_escuchando) {
      await _speech.stop();
      setState(() {
        _escuchando = false;
        _procesandoNLP = false;
        _locucionActual = '';
      });
      return;
    }

    if (_procesandoNLP) return;

    // Si hay un tour activo, detenerlo para dar prioridad a la voz del usuario
    if (_tourActivo) {
      _detenerTourVirtual();
    }

    // Detener cualquier locución TTS en curso antes de escuchar
    await _flutterTts.stop();

    if (!_sttDisponible) {
      // Intentar inicializar nuevamente si no estaba disponible
      _sttDisponible = await _speech.initialize();
    }

    if (!_sttDisponible) {
      setState(() {
        _locucionActual = 'Micrófono no disponible en este dispositivo.';
      });
      _hablarEnVozAlta('El micrófono no está disponible en este momento.');
      return;
    }

    setState(() {
      _escuchando = true;
      _procesandoNLP = false;
      _locucionActual = 'Escuchando... Habla ahora.';
    });

    await _speech.listen(
      onResult: (result) {
        if (result.finalResult && result.recognizedWords.isNotEmpty) {
          final String comandoVoz = result.recognizedWords;
          _speech.stop();
          setState(() {
            _escuchando = false;
            _locucionActual = 'Procesando: "$comandoVoz"';
          });
          // Comandos locales de camara (sin red)
          _ejecutarComandoCamara(comandoVoz);
          // Consultar al asistente NLP del backend
          _consultarAsistente(comandoVoz);
        }
      },
      listenOptions: stt.SpeechListenOptions(
        partialResults: false,
        cancelOnError: true,
        localeId: 'es_ES',
        listenFor: const Duration(seconds: 15),
        pauseFor: const Duration(seconds: 3),
      ),
    );
  }

  // ─── Consultar Medidas y Espacio con IA Backend (NLP y Voz) ─────────────
  Future<void> _consultarAsistente(String consulta) async {
    setState(() {
      _procesandoNLP = true;
      _locucionActual = 'Analizando tu pregunta: "$consulta"...';
    });

    final api = context.read<AuthProvider>().apiService;
    final res = await api.consultarAsistenteEspacial(
      consulta: consulta,
      inmuebleId: widget.inmuebleId,
    );

    if (res != null && mounted) {
      final String respuestaTexto = res['respuesta'] ?? 'Medición registrada.';

      // Si la IA nos devuelve orientación de cámara hacia el objeto consultado, rotamos la vista 360°
      if (res['camara_360'] != null) {
        final double yawGrados = (res['camara_360']['yaw'] as num).toDouble();
        final double pitchGrados = (res['camara_360']['pitch'] as num).toDouble();
        final targetYaw = (yawGrados * math.pi / 180.0).clamp(-math.pi, math.pi);
        final targetPitch = (pitchGrados / 45.0).clamp(-1.0, 1.0);
        _animarCamaraHacia(targetYaw: targetYaw, targetPitch: targetPitch, targetFov: 1.15);
      }

      setState(() {
        _procesandoNLP = false;
        _locucionActual = respuestaTexto;
      });

      // Decir la respuesta en voz alta a través de los altavoces / auriculares
      _hablarEnVozAlta(respuestaTexto);

      // Auto-ocultar el banner de locución después de 9 segundos
      Timer(const Duration(seconds: 9), () {
        if (mounted && _locucionActual == respuestaTexto) {
          setState(() {
            _locucionActual = '';
          });
        }
      });
    } else {
      if (mounted) {
        setState(() {
          _procesandoNLP = false;
        });
      }
    }
  }






  Widget _buildSinglePanoramaView() {
    final alignX = (_yaw / math.pi).clamp(-1.0, 1.0);
    final alignY = _pitch.clamp(-1.0, 1.0);

    return Stack(
      children: [
        Positioned.fill(
          child: Transform(
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              // ignore: deprecated_member_use
              ..scale(_fov, _fov, 1.0),
            alignment: Alignment.center,
            child: Image.network(
              _panoramaActualUrl.isNotEmpty ? _panoramaActualUrl : widget.panoramaUrl,
              fit: BoxFit.cover,
              alignment: Alignment(alignX, alignY),
              errorBuilder: (context, error, stackTrace) => const Center(
                child: Text('Error al cargar panorama 360°', style: TextStyle(color: Colors.white)),
              ),
            ),
          ),
        ),

        // ─── Selector de Ambientes / Habitaciones Dinámico ───
        if (_metaversoDatos?['panoramas'] != null && (_metaversoDatos!['panoramas'] as List).length > 1)
          Positioned(
            bottom: 90,
            left: 16,
            right: 16,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: (_metaversoDatos!['panoramas'] as List).map<Widget>((p) {
                  final bool esActivo = p['id'] == _panoramaActualId || p['archivo'] == _panoramaActualUrl;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(
                        p['descripcion'] ?? 'Ambiente',
                        style: TextStyle(
                          color: esActivo ? Colors.white : Colors.grey[300],
                          fontSize: 12,
                          fontWeight: esActivo ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                      selected: esActivo,
                      selectedColor: const Color(0xFF0284C7),
                      backgroundColor: const Color(0xFF0F172A).withValues(alpha: 0.85),
                      side: BorderSide(
                        color: esActivo ? const Color(0xFF38BDF8) : const Color(0xFF334155),
                      ),
                      onSelected: (selected) {
                        if (selected && p['archivo'] != null) {
                          setState(() {
                            _panoramaActualUrl = p['archivo'];
                            _panoramaActualId = p['id'];
                          });
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

        // ─── Controles Flotantes de Cámara & Preguntas ───────────────────────

        // ─── Asistente de Voz Espacial Flotante ───
        Positioned(
          bottom: 24,
          right: 20,
          child: GestureDetector(
            onTap: _iniciarCapturaVoz,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _escuchando
                    ? const Color(0xFF10B981)
                    : _procesandoNLP
                        ? const Color(0xFFF59E0B)
                        : const Color(0xFF0284C7),
                boxShadow: [
                  BoxShadow(
                    color: (_escuchando
                            ? const Color(0xFF10B981)
                            : _procesandoNLP
                                ? const Color(0xFFF59E0B)
                                : const Color(0xFF0284C7))
                        .withValues(alpha: 0.55),
                    blurRadius: _escuchando ? 24 : 12,
                    spreadRadius: _escuchando ? 6 : 2,
                  )
                ],
              ),
              child: _procesandoNLP && !_escuchando
                  ? const Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      ),
                    )
                  : Icon(
                      _escuchando ? Icons.mic : Icons.mic_none,
                      color: Colors.white,
                      size: 30,
                    ),
            ),
          ),
        ),
      ],
    );
  }


  Widget _buildVRDualView() {

    final alignX = (_yaw / math.pi).clamp(-1.0, 1.0);
    final alignY = _pitch.clamp(-1.0, 1.0);

    return Stack(
      children: [
        Row(
          children: [
            // Ojo Izquierdo
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Transform(
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.001)
                        // ignore: deprecated_member_use
                        ..scale(_fov, _fov, 1.0),
                      alignment: Alignment.center,
                      child: Image.network(
                        widget.panoramaUrl,
                        fit: BoxFit.cover,
                        alignment: Alignment(alignX, alignY),
                      ),
                    ),
                  ),
                  const Center(
                    child: Icon(Icons.add, color: Colors.white38, size: 24),
                  ),
                ],
              ),
            ),
            Container(width: 2, color: Colors.white24),
            // Ojo Derecho
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Transform(
                      transform: Matrix4.identity()
                        ..setEntry(3, 2, 0.001)
                        // ignore: deprecated_member_use
                        ..scale(_fov, _fov, 1.0),
                      alignment: Alignment.center,
                      child: Image.network(
                        widget.panoramaUrl,
                        fit: BoxFit.cover,
                        alignment: Alignment(alignX, alignY),
                      ),
                    ),
                  ),
                  const Center(
                    child: Icon(Icons.add, color: Colors.white38, size: 24),
                  ),
                ],
              ),
            ),
          ],
        ),

        // Botonera Flotante Rápida para VR (Zoom y Preguntas)
        Positioned(
          bottom: 16,
          left: 30,
          right: 30,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              FloatingActionButton.small(
                heroTag: 'vr_zoom_in',
                backgroundColor: const Color(0xFF1E293B),
                onPressed: () => _ejecutarComandoCamara('acercate'),
                child: const Icon(Icons.zoom_in, color: Color(0xFF38BDF8)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: const Text(
                  'Modo VR: Mueve la cabeza para mirar alrededor',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                ),
              ),
              FloatingActionButton.small(
                heroTag: 'vr_zoom_out',
                backgroundColor: const Color(0xFF1E293B),
                onPressed: () => _ejecutarComandoCamara('alejate'),
                child: const Icon(Icons.zoom_out, color: Color(0xFF38BDF8)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
