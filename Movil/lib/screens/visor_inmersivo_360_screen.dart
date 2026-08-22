import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';

class VisorInmersivo360Screen extends StatefulWidget {
  final String panoramaUrl;
  final String titulo;

  const VisorInmersivo360Screen({
    super.key,
    required this.panoramaUrl,
    required this.titulo,
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

  Widget _buildSinglePanoramaView() {
    // Normalizar yaw a rango [-1.0, 1.0] para la alineación del fondo
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
        Positioned(
          bottom: 24,
          left: 20,
          right: 20,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.threesixty, color: Colors.white, size: 18),
                SizedBox(width: 8),
                Text(
                  'Gira o desliza en todas las direcciones (360°/180°)',
                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVRDualView() {
    final alignX = (_yaw / math.pi).clamp(-1.0, 1.0);
    final alignY = _pitch.clamp(-1.0, 1.0);

    return Row(
      children: [
        // Ojo Izquierdo
        Expanded(
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  widget.panoramaUrl,
                  fit: BoxFit.cover,
                  alignment: Alignment(alignX, alignY),
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
                child: Image.network(
                  widget.panoramaUrl,
                  fit: BoxFit.cover,
                  alignment: Alignment(alignX, alignY),
                ),
              ),
              const Center(
                child: Icon(Icons.add, color: Colors.white38, size: 24),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
