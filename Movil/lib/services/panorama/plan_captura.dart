/// Punto objetivo de una toma. [yawOffset] es relativo al rumbo donde el
/// usuario inició la captura (no obliga a buscar el norte).
class PuntoCaptura {
  final double yawOffset;
  final double pitch;

  /// Fila a la que pertenece: 0 centro, 1 techo, 2 suelo (modo 32).
  final int fila;

  const PuntoCaptura(this.yawOffset, this.pitch, {this.fila = 0});
}

/// Plan de captura esférico (centro + techo + suelo):
/// - 16 tomas: anillo central (8) + techo (4 a +35°) + suelo (4 a -35°).
/// - 32 tomas: anillo central (16) + techo (8 a +35°) + suelo (8 a -35°).
List<PuntoCaptura> planDe(int tomas) {
  if (tomas == 32) {
    return [
      for (int i = 0; i < 16; i++)
        PuntoCaptura(i * (360.0 / 16), 0.0),
      for (int i = 0; i < 8; i++)
        PuntoCaptura(i * (360.0 / 8), 35.0, fila: 1),
      for (int i = 0; i < 8; i++)
        PuntoCaptura(i * (360.0 / 8), -35.0, fila: 2),
    ];
  }
  return [
    for (int i = 0; i < 8; i++)
      PuntoCaptura(i * (360.0 / 8), 0.0),
    for (int i = 0; i < 4; i++)
      PuntoCaptura(i * (360.0 / 4), 35.0, fila: 1),
    for (int i = 0; i < 4; i++)
      PuntoCaptura(i * (360.0 / 4), -35.0, fila: 2),
  ];
}

/// Yaw efectivo del punto [i] dado el rumbo inicial del usuario.
double yawObjetivo(List<PuntoCaptura> plan, int i, double yawInicial) =>
    (yawInicial + plan[i].yawOffset) % 360.0;
