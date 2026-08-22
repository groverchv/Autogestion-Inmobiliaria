import 'dart:async';
import 'package:flutter/material.dart';
import 'package:sensors_plus/sensors_plus.dart';

class Visor3DPlanoScreen extends StatefulWidget {
  final String titulo;

  const Visor3DPlanoScreen({super.key, required this.titulo});

  @override
  State<Visor3DPlanoScreen> createState() => _Visor3DPlanoScreenState();
}

class _Visor3DPlanoScreenState extends State<Visor3DPlanoScreen> {
  double _rotX = 0.5;
  double _rotY = 0.5;
  double _scale = 1.0;
  bool _modoAR = false;
  StreamSubscription<GyroscopeEvent>? _gyroSub;

  @override
  void initState() {
    super.initState();
    _gyroSub = gyroscopeEventStream().listen((event) {
      if (_modoAR && mounted) {
        setState(() {
          _rotX += event.x * 0.02;
          _rotY += event.y * 0.02;
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
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          'Plano 3D / Realidad Aumentada - ${widget.titulo}',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: Icon(_modoAR ? Icons.view_in_ar : Icons.apartment, color: _modoAR ? Colors.greenAccent : Colors.white),
            tooltip: 'Modo Realidad Aumentada (AR)',
            onPressed: () {
              setState(() => _modoAR = !_modoAR);
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // Render 3D Interactivo
          Center(
            child: GestureDetector(
              onScaleUpdate: (details) {
                setState(() {
                  if (details.scale == 1.0) {
                    if (!_modoAR) {
                      _rotY += details.focalPointDelta.dx * 0.01;
                      _rotX -= details.focalPointDelta.dy * 0.01;
                    }
                  } else {
                    _scale = (_scale * details.scale).clamp(0.6, 2.5);
                  }
                });
              },
              // ignore: deprecated_member_use
              child: Transform(
                // ignore: deprecated_member_use
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001)
                  ..rotateX(_rotX)
                  ..rotateY(_rotY)
                  // ignore: deprecated_member_use
                  ..scale(_scale, _scale, _scale),
                alignment: Alignment.center,
                child: _buildModelo3DIsometrico(),
              ),
            ),
          ),

          // Controles flotantes
          Positioned(
            bottom: 24,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B).withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _modoAR ? 'RA Activa: Gira el celular para explorar' : 'Arrastra para rotar en 3D / Pellizca para zoom',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      setState(() {
                        _rotX = 0.5;
                        _rotY = 0.5;
                        _scale = 1.0;
                      });
                    },
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Centrar', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModelo3DIsometrico() {
    return Container(
      width: 220,
      height: 220,
      decoration: BoxDecoration(
        color: const Color(0xFF0284C7).withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF38BDF8), width: 3),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF38BDF8).withValues(alpha: 0.3),
            blurRadius: 30,
            spreadRadius: 5,
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.home_work, size: 64, color: Color(0xFF38BDF8)),
          const SizedBox(height: 12),
          Text(
            widget.titulo,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
          ),
          const SizedBox(height: 6),
          const Text(
            'MODELO ISOMÉTRICO 3D',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, letterSpacing: 1.2),
          ),
        ],
      ),
    );
  }
}
