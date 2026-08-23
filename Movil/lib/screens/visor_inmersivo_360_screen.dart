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

class _VisorInmersivo360ScreenState extends State<VisorInmersivo360Screen> {
  // Rotación en los 3 ejes (Yaw / Pitch / Roll)
  double _yaw = 0.0;   // Horizontal (360°)
  double _pitch = 0.0; // Vertical (Arriba / Abajo)
  double _fov = 1.0;   // Zoom / Campo de visión
  bool _vrMode = false;
  bool _gyroEnabled = true;
  StreamSubscription<GyroscopeEvent>? _gyroSub;

  @override
  void initState() {
    super.initState();
    _gyroSub = gyroscopeEventStream().listen((event) {
      if (_gyroEnabled && mounted) {
        setState(() {
          // Giro horizontal por eje Y o Z
          _yaw += event.y * 0.03;
          if (_yaw > math.pi) _yaw -= 2 * math.pi;
          if (_yaw < -math.pi) _yaw += 2 * math.pi;

          // Giro vertical (Pitch) por eje X (mirar al techo / suelo)
          _pitch = (_pitch + event.x * 0.03).clamp(-1.0, 1.0);
        });
      }
    });
  }

  @override
  void dispose() {
    _gyroSub?.cancel();
    super.dispose();
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
        child: _vrMode ? _buildVRDualView() : _buildSinglePanoramaView(),
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
