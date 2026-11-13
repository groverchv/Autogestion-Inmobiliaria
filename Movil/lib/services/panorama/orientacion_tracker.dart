import 'dart:async';
import 'dart:collection';
import 'dart:math' as math;

import 'package:sensors_plus/sensors_plus.dart';

/// Estado de orientación consumido por la UI de captura 360.
class Orientacion {
  /// Rumbo 0-360° (fusión gyro + magnetómetro, corrección continua anti-deriva).
  final double yaw;

  /// Inclinación vertical -90..+90 (positivo = apuntando al techo).
  final double pitch;

  /// Inclinación lateral en grados — 0 = horizonte nivelado.
  final double roll;

  /// RMS del gyro en rad/s sobre ~300 ms: mide el temblor del pulso.
  /// < 0.4 = firme; >= 0.4 = inestable.
  final double estabilidad;

  /// false cuando el magnetómetro salta (interior con metal/vigas):
  /// el filtro deja de usarlo para no arrastrar el rumbo.
  final bool magConfiable;

  const Orientacion({
    required this.yaw,
    required this.pitch,
    required this.roll,
    required this.estabilidad,
    required this.magConfiable,
  });

  /// Diferencia angular firmada hacia [objetivoYaw] en [-180, 180].
  double diffYawHacia(double objetivoYaw) =>
      ((objetivoYaw - yaw + 540.0) % 360.0) - 180.0;
}

/// Fusiona giroscopio (reactivo) + acelerómetro (pitch/roll absolutos por
/// gravedad) + magnetómetro (rumbo absoluto con compensación de inclinación).
/// Sin referencia absoluta el yaw del giroscopio deriva en segundos.
class OrientacionTracker {
  final _controlador = StreamController<Orientacion>.broadcast();

  StreamSubscription<GyroscopeEvent>? _gyroSub;
  StreamSubscription<AccelerometerEvent>? _accelSub;
  StreamSubscription<MagnetometerEvent>? _magSub;

  double _yaw = 0.0;
  double _pitch = 0.0;
  double _roll = 0.0;
  double _accelPitch = 0.0;
  double _accelX = 0.0, _accelY = 0.0, _accelZ = 0.0;
  bool _accelDisponible = false;
  double _magYaw = 0.0;
  bool _magDisponible = false;

  // Ventana de ~300 ms para estabilidad (giro ~50 Hz → 15 muestras).
  final Queue<double> _ventanaGyro = Queue<double>();
  // Ventana de rumbo magnético para detectar interferencia (~1 s).
  final Queue<double> _ventanaMag = Queue<double>();

  double _estabilidad = 0.0;
  bool _magConfiable = true;

  Stream<Orientacion> get stream => _controlador.stream;

  void iniciar() {
    _accelSub = accelerometerEventStream().listen((e) {
      _accelX = e.x;
      _accelY = e.y;
      _accelZ = e.z;
      final roll = math.atan2(e.y, e.z);
      _accelPitch = math.atan2(
            -e.x,
            e.y * math.sin(roll) + e.z * math.cos(roll),
          ) *
          180.0 /
          math.pi;
      // Nivel de horizonte en retrato: giro de gravedad sobre el eje que
      // apunta al sujeto. 0° = teléfono derecho respecto al horizonte.
      _roll = math.atan2(-e.x, -e.y) * 180.0 / math.pi;
      _accelDisponible = true;
    });

    _magSub = magnetometerEventStream().listen((e) {
      final roll = math.atan2(_accelY, _accelZ);
      final pitchC = math.atan2(
        -_accelX,
        _accelY * math.sin(roll) + _accelZ * math.cos(roll),
      );
      final xh = e.x * math.cos(pitchC) + e.z * math.sin(pitchC);
      final yh = e.x * math.sin(roll) * math.sin(pitchC) +
          e.y * math.cos(roll) -
          e.z * math.sin(roll) * math.cos(pitchC);
      if (xh == 0 && yh == 0) return;
      var heading = math.atan2(-yh, xh) * 180.0 / math.pi;
      if (heading < 0) heading += 360.0;
      _magYaw = heading;
      _magDisponible = true;

      _ventanaMag.addLast(heading);
      if (_ventanaMag.length > 50) _ventanaMag.removeFirst();
      if (_ventanaMag.length >= 25) {
        // Varianza circular del rumbo: si salta mucho con el móvil quieto,
        // hay interferencia magnética y se deja de confiar en la brújula.
        double sx = 0, sy = 0;
        for (final h in _ventanaMag) {
          sx += math.cos(h * math.pi / 180.0);
          sy += math.sin(h * math.pi / 180.0);
        }
        final r = math.sqrt(sx * sx + sy * sy) / _ventanaMag.length;
        final dispersion = math.sqrt(-2 * math.log(r.clamp(0.001, 1.0))) *
            180.0 /
            math.pi;
        _magConfiable = dispersion < 18.0;
      }
    });

    _gyroSub = gyroscopeEventStream().listen((e) {
      final deltaYaw = e.y * (180.0 / math.pi) * 0.02;
      final deltaPitch = e.x * (180.0 / math.pi) * 0.02;

      _yaw += deltaYaw;
      if (_magDisponible && _magConfiable) {
        final err = ((_magYaw - _yaw + 540.0) % 360.0) - 180.0;
        _yaw += err * 0.03;
      }
      _yaw = _yaw % 360.0;
      if (_yaw < 0) _yaw += 360.0;

      _pitch += deltaPitch;
      if (_accelDisponible) {
        _pitch = 0.95 * _pitch + 0.05 * _accelPitch;
      }
      _pitch = _pitch.clamp(-75.0, 75.0);

      final mag = math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z);
      _ventanaGyro.addLast(mag);
      if (_ventanaGyro.length > 15) _ventanaGyro.removeFirst();
      if (_ventanaGyro.isNotEmpty) {
        final suma = _ventanaGyro.fold<double>(0, (a, b) => a + b * b);
        _estabilidad = math.sqrt(suma / _ventanaGyro.length);
      }

      if (!_controlador.isClosed) {
        _controlador.add(Orientacion(
          yaw: _yaw,
          pitch: _pitch,
          roll: _roll,
          estabilidad: _estabilidad,
          magConfiable: _magConfiable || !_magDisponible,
        ));
      }
    });
  }

  void dispose() {
    _gyroSub?.cancel();
    _accelSub?.cancel();
    _magSub?.cancel();
    _controlador.close();
  }
}
