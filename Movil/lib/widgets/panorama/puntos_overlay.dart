import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../services/panorama/orientacion_tracker.dart';
import '../../services/panorama/plan_captura.dart';

/// Overlay central de la captura: orbes flotantes anclados al mundo en la
/// dirección de cada punto pendiente, la diana fija del centro, el anillo
/// de progreso de la espera y las flechas guía hacia el objetivo actual.
class PuntosOverlay extends StatelessWidget {
  final Orientacion ori;
  final List<PuntoCaptura> plan;
  final double yawInicial;
  final int indiceActual;
  final double progresoHold; // 0..1 — anillo que se llena en la espera
  final bool alineado;
  final bool estable;

  const PuntosOverlay({
    super.key,
    required this.ori,
    required this.plan,
    required this.yawInicial,
    required this.indiceActual,
    required this.progresoHold,
    required this.alineado,
    required this.estable,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        size: Size.infinite,
        painter: _PuntosPainter(
          ori: ori,
          plan: plan,
          yawInicial: yawInicial,
          indiceActual: indiceActual,
          progresoHold: progresoHold,
          alineado: alineado,
          estable: estable,
        ),
      ),
    );
  }
}

class _PuntosPainter extends CustomPainter {
  final Orientacion ori;
  final List<PuntoCaptura> plan;
  final double yawInicial;
  final int indiceActual;
  final double progresoHold;
  final bool alineado;
  final bool estable;

  // FOV aproximado de la cámara trasera en retrato. Los orbes fuera del
  // encuadre se anclan a los bordes con flecha, no desaparecen.
  static const double fovH = 62.0;
  static const double fovV = 46.0;
  static const double margen = 26.0;

  _PuntosPainter({
    required this.ori,
    required this.plan,
    required this.yawInicial,
    required this.indiceActual,
    required this.progresoHold,
    required this.alineado,
    required this.estable,
  });

  static const _verde = Color(0xFF10B981);
  static const _celeste = Color(0xFF38BDF8);
  static const _ambar = Color(0xFFFBBF24);

  @override
  void paint(Canvas canvas, Size size) {
    final centro = Offset(size.width / 2, size.height / 2);
    _dibujarOrbes(canvas, size, centro);
    _dibujarGuia(canvas, size, centro);
    _dibujarDiana(canvas, centro);
  }

  /// Orbes mundo-locked: cada punto pendiente se proyecta según el
  /// desplazamiento angular respecto a la orientación actual.
  void _dibujarOrbes(Canvas canvas, Size size, Offset centro) {
    for (int i = indiceActual; i < plan.length; i++) {
      final p = plan[i];
      final diffYaw = ori.diffYawHacia(yawObjetivo(plan, i, yawInicial));
      final diffPitch = p.pitch - ori.pitch;
      final esActual = i == indiceActual;
      final esProximo = i == indiceActual + 1;

      double x = centro.dx + (diffYaw / (fovH / 2)) * (size.width / 2);
      double y = centro.dy - (diffPitch / (fovV / 2)) * (size.height / 2);
      final fuera = x < margen || x > size.width - margen ||
          y < margen || y > size.height - margen;
      if (fuera) {
        if (!esActual) continue; // solo el objetivo actual se ancla al borde
        x = x.clamp(margen, size.width - margen);
        y = y.clamp(margen, size.height - margen);
      }

      final pos = Offset(x, y);
      final radio = esActual ? 16.0 : (esProximo ? 9.0 : 6.0);
      final color = esActual
          ? (alineado ? _verde : _celeste)
          : Colors.white.withValues(alpha: esProximo ? 0.55 : 0.3);

      if (esActual) {
        // Halo pulsante del objetivo actual
        final halo = Paint()
          ..color = color.withValues(alpha: 0.2)
          ..style = PaintingStyle.fill;
        canvas.drawCircle(pos, radio + 10, halo);
        final aro = Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5;
        canvas.drawCircle(pos, radio + 5, aro);
      }

      final relleno = Paint()..color = color;
      canvas.drawCircle(pos, radio, relleno);
      if (esActual) {
        canvas.drawCircle(pos, 4, Paint()..color = Colors.white);
      }
    }
  }

  /// Flechas hacia el objetivo actual con magnitud: 3 chevrones de lejos,
  /// 1 de cerca; desaparecen al alinear.
  void _dibujarGuia(Canvas canvas, Size size, Offset centro) {
    if (indiceActual >= plan.length) return;
    final p = plan[indiceActual];
    final diffYaw = ori.diffYawHacia(yawObjetivo(plan, indiceActual, yawInicial));
    final diffPitch = p.pitch - ori.pitch;
    if (diffYaw.abs() < 8 && diffPitch.abs() < 10) return;

    final pintura = Paint()
      ..color = Colors.white.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    final niveles = diffYaw.abs() > 30 || diffPitch.abs() > 30
        ? 3
        : (diffYaw.abs() > 12 || diffPitch.abs() > 14 ? 2 : 1);

    void chevron(Offset base, double angulo) {
      for (int n = 0; n < niveles; n++) {
        final d = 30.0 + n * 16.0;
        final c = Offset(
          base.dx + math.cos(angulo) * d,
          base.dy + math.sin(angulo) * d,
        );
        final path = Path();
        const s = 9.0;
        // chevron apuntando en dirección `angulo`
        path.moveTo(
          c.dx - math.cos(angulo) * s + math.cos(angulo + math.pi / 2) * s,
          c.dy - math.sin(angulo) * s + math.sin(angulo + math.pi / 2) * s,
        );
        path.lineTo(c.dx + math.cos(angulo) * s, c.dy + math.sin(angulo) * s);
        path.lineTo(
          c.dx - math.cos(angulo) * s + math.cos(angulo - math.pi / 2) * s,
          c.dy - math.sin(angulo) * s + math.sin(angulo - math.pi / 2) * s,
        );
        canvas.drawPath(path, pintura);
      }
    }

    const r = 110.0;
    if (diffYaw.abs() >= 8) {
      chevron(centro, diffYaw > 0 ? 0 : math.pi);
    }
    if (diffPitch.abs() >= 10) {
      // En pantalla, pitch positivo = hacia arriba
      chevron(centro, diffPitch > 0 ? -math.pi / 2 : math.pi / 2);
    }
    // Marca de anclaje alrededor de la diana para leer la distancia total
    final distancia = math.sqrt(diffYaw * diffYaw + diffPitch * diffPitch);
    if (distancia > 60) {
      final texto = TextPainter(
        text: TextSpan(
          text: '${distancia.round()}°',
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      texto.paint(canvas, centro + const Offset(-12, r + 12));
    }
  }

  /// Diana central: aro exterior, cruz y anillo de progreso de la espera.
  void _dibujarDiana(Canvas canvas, Offset centro) {
    final colorAnillo = !alineado
        ? Colors.white.withValues(alpha: 0.6)
        : (estable ? _verde : _ambar);
    final aro = Paint()
      ..color = colorAnillo
      ..style = PaintingStyle.stroke
      ..strokeWidth = alineado ? 4 : 2;
    canvas.drawCircle(centro, 52, aro);

    if (alineado && estable) {
      // Anillo de progreso de los 700 ms de espera
      final progresoPaint = Paint()
        ..color = _verde
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: centro, radius: 62),
        -math.pi / 2,
        progresoHold * 2 * math.pi,
        false,
        progresoPaint,
      );
      final fill = Paint()..color = _verde.withValues(alpha: 0.18);
      canvas.drawCircle(centro, 52, fill);
    }

    // Cruz de mira
    final cruz = Paint()
      ..color = Colors.white.withValues(alpha: 0.9)
      ..strokeWidth = 2;
    const c = 14.0;
    canvas.drawLine(centro + const Offset(-c, 0), centro + const Offset(-4, 0), cruz);
    canvas.drawLine(centro + const Offset(4, 0), centro + const Offset(c, 0), cruz);
    canvas.drawLine(centro + const Offset(0, -c), centro + const Offset(0, -4), cruz);
    canvas.drawLine(centro + const Offset(0, 4), centro + const Offset(0, c), cruz);
    canvas.drawCircle(
      centro,
      2.5,
      Paint()..color = alineado ? _verde : Colors.white,
    );
  }

  @override
  bool shouldRepaint(covariant _PuntosPainter old) => true; // stream ~50 Hz
}
