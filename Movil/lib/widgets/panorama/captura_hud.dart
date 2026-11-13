import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../config/app_config.dart';

/// Franja de puntos del progreso: verdes capturados, celeste pulsando el
/// actual, grises pendientes. En modo 32 agrupa por fila (centro/techo/suelo).
class BarraPuntos extends StatelessWidget {
  final int total;
  final int completados;
  final int filas; // 1 o 3

  const BarraPuntos({
    super.key,
    required this.total,
    required this.completados,
    this.filas = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < total; i++) ...[
          if (filas == 3 && i == 16 || filas == 3 && i == 24)
            const SizedBox(width: 8),
          Container(
            width: i == completados ? 9 : 6,
            height: i == completados ? 9 : 6,
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: i < completados
                  ? const Color(0xFF10B981)
                  : (i == completados
                      ? const Color(0xFF38BDF8)
                      : Colors.white38),
            ),
          ),
        ],
      ],
    );
  }
}

/// Línea de nivel de horizonte: rota según el roll del dispositivo y avisa
/// cuando la inclinación lateral supera lo tolerable para el stitching.
class NivelHorizonte extends StatelessWidget {
  final double roll;

  const NivelHorizonte({super.key, required this.roll});

  @override
  Widget build(BuildContext context) {
    final desnivelado = roll.abs() > 10;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 56,
          height: 4,
          decoration: BoxDecoration(
            color: desnivelado ? const Color(0xFFFBBF24) : const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(2),
          ),
          transform: Matrix4.rotationZ(roll * 3.14159 / 180.0),
        ),
        if (desnivelado)
          const Padding(
            padding: EdgeInsets.only(top: 3),
            child: Text(
              'Nivela el móvil',
              style: TextStyle(color: Color(0xFFFBBF24), fontSize: 10),
            ),
          ),
      ],
    );
  }
}

/// Miniatura de la última toma; al tocarla abre diálogo de revisión con
/// opción de repetirla (elimina la toma y devuelve el objetivo un paso).
class MiniaturaRetake extends StatelessWidget {
  final Uint8List imagen;
  final VoidCallback onRepetir;

  const MiniaturaRetake({super.key, required this.imagen, required this.onRepetir});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => showDialog(
        context: context,
        builder: (ctx) => Dialog(
          backgroundColor: AppColors.surface,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(imagen, fit: BoxFit.contain),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white38),
                        ),
                        child: const Text('Se ve bien',
                            style: TextStyle(color: Colors.white)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          onRepetir();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                        ),
                        icon: const Icon(Icons.refresh,
                            color: Colors.white, size: 18),
                        label: const Text('Repetir toma',
                            style: TextStyle(color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF10B981), width: 2),
          image: DecorationImage(image: MemoryImage(imagen), fit: BoxFit.cover),
        ),
        child: const Align(
          alignment: Alignment.bottomRight,
          child: Padding(
            padding: EdgeInsets.all(2),
            child: Icon(Icons.zoom_in, color: Colors.white, size: 14),
          ),
        ),
      ),
    );
  }
}

/// Banner transitorio de fase para el modo 32 tomas: "Fila 2/3 — techo".
class BannerFase extends StatelessWidget {
  final String texto;

  const BannerFase({super.key, required this.texto});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0284C7).withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        texto,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 15,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
