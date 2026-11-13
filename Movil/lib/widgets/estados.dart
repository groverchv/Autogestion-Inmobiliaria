import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';

import '../config/app_config.dart';

/// Franja "Sin conexión" que aparece/desaparece sola según el estado de
/// red. Montar sobre el body de la navegación principal.
class BannerConectividad extends StatefulWidget {
  const BannerConectividad({super.key});

  @override
  State<BannerConectividad> createState() => _BannerConectividadState();
}

class _BannerConectividadState extends State<BannerConectividad> {
  StreamSubscription<List<ConnectivityResult>>? _sub;
  bool _offline = false;

  @override
  void initState() {
    super.initState();
    _sub = Connectivity().onConnectivityChanged.listen((resultados) {
      final sinRed = resultados.every((r) => r == ConnectivityResult.none);
      if (sinRed != _offline && mounted) {
        setState(() => _offline = sinRed);
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_offline) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: const Color(0xFF92400E),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: const SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off, color: Colors.white, size: 14),
            SizedBox(width: 8),
            Text(
              'Sin conexión — mostrando datos guardados',
              style: TextStyle(color: Colors.white, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

/// Spinner con mensaje humano — el usuario siempre sabe qué está pasando.
class CargandoView extends StatelessWidget {
  final String mensaje;

  const CargandoView({super.key, this.mensaje = 'Cargando…'});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: 16),
          Text(
            mensaje,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white54, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

/// Vista de error uniforme con reintento — reemplaza el "algo salió mal"
/// improvisado que cada pantalla escribía por su cuenta.
class ErrorView extends StatelessWidget {
  final String mensaje;
  final VoidCallback? onReintentar;

  const ErrorView({super.key, required this.mensaje, this.onReintentar});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, color: Colors.white38, size: 56),
            const SizedBox(height: 14),
            Text(
              mensaje,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 15),
            ),
            if (onReintentar != null) ...[
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: onReintentar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryDark,
                ),
                icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
                label: const Text('Reintentar',
                    style: TextStyle(color: Colors.white)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Estado vacío uniforme: ilustra que no hay datos y sugiere la acción.
class EmptyView extends StatelessWidget {
  final IconData icono;
  final String titulo;
  final String? subtitulo;
  final Widget? accion;

  const EmptyView({
    super.key,
    required this.icono,
    required this.titulo,
    this.subtitulo,
    this.accion,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono, color: Colors.white24, size: 56),
            const SizedBox(height: 14),
            Text(
              titulo,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (subtitulo != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  subtitulo!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white38, fontSize: 13),
                ),
              ),
            if (accion != null)
              Padding(padding: const EdgeInsets.only(top: 16), child: accion!),
          ],
        ),
      ),
    );
  }
}

/// Skeleton de lista: muestra la forma del contenido mientras carga en
/// lugar del spinner genérico. Sin dependencias externas.
class SkeletonLista extends StatelessWidget {
  final int items;
  final double altoItem;

  const SkeletonLista({super.key, this.items = 5, this.altoItem = 96});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items,
      separatorBuilder: (_, i) => const SizedBox(height: 12),
      itemBuilder: (_, i) => const _SkeletonCard(),
    );
  }
}

class _SkeletonCard extends StatefulWidget {
  const _SkeletonCard();

  @override
  State<_SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<_SkeletonCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.4, end: 0.9).animate(_c),
      child: Container(
        height: 96,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 96,
              decoration: const BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.horizontal(
                  left: Radius.circular(12),
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _linea(0.7, 14),
                  const SizedBox(height: 10),
                  _linea(0.45, 11),
                ],
              ),
            ),
            const SizedBox(width: 14),
          ],
        ),
      ),
    );
  }

  Widget _linea(double ancho, double alto) {
    return FractionallySizedBox(
      widthFactor: ancho,
      child: Container(
        height: alto,
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(6),
        ),
      ),
    );
  }
}
