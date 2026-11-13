import 'package:flutter/material.dart';
import '../utils/mensajes_error.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

class MisPagosScreen extends StatefulWidget {
  const MisPagosScreen({super.key});

  @override
  State<MisPagosScreen> createState() => _MisPagosScreenState();
}

class _MisPagosScreenState extends State<MisPagosScreen> {
  List<Pago> _pagos = [];
  List<dynamic> _pendientes = [];
  bool _isLoading = true;
  String? _errorMessage;
  int? _pagandoId;

  @override
  void initState() {
    super.initState();
    _cargarPagos();
  }

  Future<void> _cargarPagos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final api = auth.apiService;
    final int currentUserId = auth.user?.id ?? 0;
    try {
      final results = await Future.wait([
        api.getMisPagos(),
        api.getTransacciones(),
      ]);
      if (mounted) {
        final transacciones = results[1];
        setState(() {
          _pagos = results[0] as List<Pago>;
          // Pendientes de cobro donde YO soy el pagador → puedo pagarlos
          _pendientes = transacciones
              .where(
                (t) =>
                    t['estado'] == 'pendiente' &&
                    (t['pagador'] as num?)?.toInt() == currentUserId,
              )
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = mensajeError(e);
        });
      }
    }
  }

  Future<void> _pagar(dynamic t) async {
    final int id = (t['id'] as num).toInt();
    setState(() => _pagandoId = id);

    final api = context.read<AuthProvider>().apiService;
    final url = await api.crearCheckoutUrlTransaccion(id);
    if (!mounted) return;

    if (url == null) {
      setState(() => _pagandoId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'No se pudo generar el enlace de pago. Intenta de nuevo.',
          ),
        ),
      );
      return;
    }

    final abierto = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!mounted) return;
    setState(() => _pagandoId = null);

    if (!abierto) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo abrir el navegador para pagar.'),
        ),
      );
      return;
    }

    // Al volver del navegador, refrescar: el webhook/confirmación actualiza el estado
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Cuando termines el pago en el navegador, desliza para actualizar.',
        ),
      ),
    );
    await _cargarPagos();
  }

  Widget _tarjetaPendiente(dynamic t) {
    final int id = (t['id'] as num).toInt();
    final bool cargando = _pagandoId == id;
    final String tipo = (t['tipo_operacion'] ?? 'pago').toString();
    final String descripcion = (t['descripcion'] ?? '').toString();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  descripcion.isNotEmpty ? descripcion : 'Pago de $tipo',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${t['monto']} ${(t['moneda'] ?? 'Bs').toString().toUpperCase()}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: cargando ? null : () => _pagar(t),
              icon: cargando
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.lock_open_outlined, size: 18),
              label: Text(cargando ? 'Abriendo pago seguro...' : 'Pagar ahora'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primaryDark,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tarjetaPago(Pago item) {
    final bool isPagado =
        item.estado.contains('COMPLETADO') || item.estado.contains('PAGADO');
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.darkCardGradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Transacción #${item.id}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Bs. ${item.monto}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Fecha: ${item.fechaPago.isNotEmpty ? item.fechaPago : 'Pendiente'}',
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: (isPagado ? AppColors.success : AppColors.warning)
                  .withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: isPagado ? AppColors.success : AppColors.warning,
              ),
            ),
            child: Text(
              item.estado,
              style: TextStyle(
                color: isPagado ? AppColors.success : AppColors.warning,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Mis Pagos',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _cargarPagos,
        color: AppColors.primary,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Text(
          'Error: $_errorMessage',
          style: const TextStyle(color: AppColors.error),
        ),
      );
    }

    if (_pendientes.isEmpty && _pagos.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 54,
              color: AppColors.textMuted,
            ),
            SizedBox(height: 12),
            Text(
              'No hay pagos registrados.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_pendientes.isNotEmpty) ...[
          const Text(
            'PAGOS POR REALIZAR',
            style: TextStyle(
              color: AppColors.warning,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          ..._pendientes.map(
            (t) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _tarjetaPendiente(t),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (_pagos.isNotEmpty) ...[
          const Text(
            'HISTORIAL',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          ..._pagos.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _tarjetaPago(p),
            ),
          ),
        ],
      ],
    );
  }
}
