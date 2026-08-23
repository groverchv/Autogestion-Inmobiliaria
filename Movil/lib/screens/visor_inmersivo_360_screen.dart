import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sensors_plus/sensors_plus.dart';
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

  // Controlador de Animación para giros cinemáticos suaves
  late AnimationController _animController;
  Animation<double>? _yawAnimation;
  Animation<double>? _pitchAnimation;
  Animation<double>? _fovAnimation;

  @override
  void initState() {
    super.initState();
    _cargarDatosMetaverso();

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
    super.dispose();
  }

  Future<void> _cargarDatosMetaverso() async {
    if (widget.inmuebleId == null) return;
    final api = context.read<AuthProvider>().apiService;
    final data = await api.obtenerDatosMetaverso(widget.inmuebleId!);
    if (data != null && mounted) {
      setState(() {
        _metaversoDatos = data;
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

  // ─── Iniciar Tour Guiado con Voz ─────────────────────────────────────────
  Future<void> _iniciarTourVirtual() async {
    if (widget.inmuebleId == null) return;

    final api = context.read<AuthProvider>().apiService;
    final tourData = await api.iniciarTourVirtual(
      inmuebleId: widget.inmuebleId!,
      fotoUrl: widget.panoramaUrl,
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

  void _ejecutarPasoTour() {
    if (!_tourActivo || _pasoTourIndex >= _pasosTour.length) {
      _detenerTourVirtual();
      return;
    }

    final paso = _pasosTour[_pasoTourIndex];
    final double yawGrados = (paso['camara_360']?['yaw'] as num? ?? 0.0).toDouble();
    final double pitchGrados = (paso['camara_360']?['pitch'] as num? ?? 0.0).toDouble();
    final double duracionSeg = (paso['duracion_seg'] as num? ?? 5.5).toDouble();

    setState(() {
      _locucionActual = paso['locucion'] ?? '';
    });

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
            icon: Icon(_mostrarPinesBarrioAR ? Icons.place : Icons.place_outlined, color: _mostrarPinesBarrioAR ? const Color(0xFF10B981) : Colors.grey),
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
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.6)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.place, color: Color(0xFF10B981), size: 16),
                      const SizedBox(width: 6),
                      Text(
                        'Entorno AR: ${(_metaversoDatos!['pines_ar_barrio'] as List).first['nombre']} (${(_metaversoDatos!['pines_ar_barrio'] as List).first['distancia_m']}m)',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),

            if (_tourActivo && _locucionActual.isNotEmpty)
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

  // ─── Consultar Medidas y Espacio con IA Backend ──────────────────────
  Future<void> _consultarAsistente(String consulta) async {
    final api = context.read<AuthProvider>().apiService;
    final res = await api.consultarAsistenteEspacial(
      consulta: consulta,
      inmuebleId: widget.inmuebleId,
    );

    if (res != null && mounted) {
      // Si la IA nos devuelve orientación de cámara, giramos suavemente
      if (res['camara_360'] != null) {
        final double yawGrados = (res['camara_360']['yaw'] as num).toDouble();
        final double pitchGrados = (res['camara_360']['pitch'] as num).toDouble();
        setState(() {
          _yaw = (yawGrados * math.pi / 180.0).clamp(-math.pi, math.pi);
          _pitch = (pitchGrados / 45.0).clamp(-1.0, 1.0);
          _fov = 1.2;
        });
      }

      showModalBottomSheet(
        context: context,
        backgroundColor: const Color(0xFF0F172A),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Color(0xFF38BDF8), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    res['elemento'] ?? 'Medición Espacial 360°',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                res['respuesta'] ?? '',
                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 16),
              if (res['dimensiones'] != null)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (res['dimensiones']['largo_m'] != null)
                      _chipMedida('Largo: ${res['dimensiones']['largo_m']} m'),
                    if (res['dimensiones']['ancho_m'] != null)
                      _chipMedida('Ancho: ${res['dimensiones']['ancho_m']} m'),
                    if (res['dimensiones']['alto_m'] != null)
                      _chipMedida('Alto: ${res['dimensiones']['alto_m']} m'),
                    if (res['dimensiones']['area_m2'] != null)
                      _chipMedida('Área: ${res['dimensiones']['area_m2']} m²', isArea: true),
                  ],
                ),
            ],
          ),
        ),
      );
    }
  }

  Widget _chipMedida(String label, {bool isArea = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isArea ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
    );
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
              widget.panoramaUrl,
              fit: BoxFit.cover,
              alignment: Alignment(alignX, alignY),
              errorBuilder: (context, error, stackTrace) => const Center(
                child: Text('Error al cargar panorama 360°', style: TextStyle(color: Colors.white)),
              ),
            ),
          ),
        ),

        // ─── Controles Flotantes de Cámara & Preguntas ───────────────────────
        Positioned(
          bottom: 20,
          left: 16,
          right: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Barra de Sugerencias de Preguntas
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _botonPregunta('¿Cuánto mide la puerta?'),
                    _botonPregunta('¿Cuánto mide la ventana?'),
                    _botonPregunta('¿Cuánto es de largo el patio?'),
                    _botonPregunta('¿Cabe refrigerador de 90 cm?'),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Botonera de Control de Cámara 360°
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF38BDF8), size: 20),
                      onPressed: () => _ejecutarComandoCamara('izquierda'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_upward, color: Color(0xFF38BDF8), size: 20),
                      onPressed: () => _ejecutarComandoCamara('arriba'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_downward, color: Color(0xFF38BDF8), size: 20),
                      onPressed: () => _ejecutarComandoCamara('abajo'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_forward, color: Color(0xFF38BDF8), size: 20),
                      onPressed: () => _ejecutarComandoCamara('derecha'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.zoom_in, color: Color(0xFF38BDF8), size: 22),
                      onPressed: () => _ejecutarComandoCamara('acercate'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.zoom_out, color: Color(0xFF38BDF8), size: 22),
                      onPressed: () => _ejecutarComandoCamara('alejate'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _botonPregunta(String texto) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: ElevatedButton(
        onPressed: () => _consultarAsistente(texto),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1E293B),
          foregroundColor: Colors.white,
          side: const BorderSide(color: Color(0xFF38BDF8)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        child: Text(texto, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
      ),
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
