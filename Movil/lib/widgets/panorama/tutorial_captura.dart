import 'package:flutter/material.dart';

/// Tutorial de 3 pasos mostrado solo la primera vez que se abre la captura
/// (el flag se persiste con flutter_secure_storage en la pantalla).
class TutorialCaptura extends StatefulWidget {
  final VoidCallback onTerminar;

  const TutorialCaptura({super.key, required this.onTerminar});

  @override
  State<TutorialCaptura> createState() => _TutorialCapturaState();
}

class _TutorialCapturaState extends State<TutorialCaptura> {
  final _controller = PageController();
  int _pagina = 0;

  static const _pasos = [
    (
      Icons.smartphone,
      'Sostén el móvil frente a ti',
      'A la altura de los ojos y en vertical. Gira sobre ti mismo, no camines: el punto de captura debe quedar fijo.',
    ),
    (
      Icons.gps_fixed,
      'Apunta al orbe flotante',
      'Los puntos celestes flotan en la dirección que debes capturar. Acerca la mira central al orbe brillante.',
    ),
    (
      Icons.timer,
      'Mantén firme y listo',
      'Cuando la mira se ponga verde, sostén quieto un instante: la foto se dispara sola. Repite hasta cerrar el círculo.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.92),
      child: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: widget.onTerminar,
                child: const Text('Saltar', style: TextStyle(color: Colors.white54)),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _pagina = i),
                itemCount: _pasos.length,
                itemBuilder: (ctx, i) {
                  final paso = _pasos[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 36),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(paso.$1, size: 84, color: const Color(0xFF38BDF8)),
                        const SizedBox(height: 28),
                        Text(
                          paso.$2,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          paso.$3,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white70, fontSize: 15, height: 1.5),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (int i = 0; i < _pasos.length; i++)
                  Container(
                    width: _pagina == i ? 18 : 7,
                    height: 7,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: _pagina == i ? const Color(0xFF38BDF8) : Colors.white30,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.fromLTRB(36, 0, 36, 32),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_pagina < _pasos.length - 1) {
                      _controller.nextPage(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut,
                      );
                    } else {
                      widget.onTerminar();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(
                    _pagina < _pasos.length - 1 ? 'Siguiente' : 'Empezar captura',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
