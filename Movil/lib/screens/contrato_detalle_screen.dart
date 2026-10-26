import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';

/// Detalle legible del contrato: primero el resumen humano (partes, monto,
/// vigencia) y el texto legal completo dentro de secciones colapsables.
/// Si el contrato está enviado y el usuario es el inquilino, puede firmar
/// o rechazar desde aquí — paridad con la web.
class ContratoDetalleScreen extends StatefulWidget {
  final int contratoId;
  final int currentUserId;

  const ContratoDetalleScreen({
    super.key,
    required this.contratoId,
    required this.currentUserId,
  });

  @override
  State<ContratoDetalleScreen> createState() => _ContratoDetalleScreenState();
}

class _ContratoDetalleScreenState extends State<ContratoDetalleScreen> {
  Map<String, dynamic>? _contrato;
  bool _isLoading = true;
  bool _procesando = false;
  String? _errorMessage;

  static const Map<String, Map<String, dynamic>> _estadoInfo = {
    'borrador': {'label': 'En preparación', 'color': Color(0xFF94A3B8)},
    'enviado': {'label': 'Esperando tu firma', 'color': Color(0xFFFBBF24)},
    'aceptado': {'label': 'Firmado', 'color': Color(0xFF10B981)},
    'rechazado': {'label': 'Rechazado', 'color': Color(0xFFF43F5E)},
    'activo': {'label': 'Vigente', 'color': Color(0xFF10B981)},
    'finalizado': {'label': 'Terminado', 'color': Color(0xFF94A3B8)},
    'cancelado': {'label': 'Cancelado', 'color': Color(0xFFF43F5E)},
    'pendiente': {'label': 'Pendiente', 'color': Color(0xFFFBBF24)},
  };

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final api = context.read<AuthProvider>().apiService;
    final data = await api.getContratoDetalle(widget.contratoId);
    if (!mounted) return;
    setState(() {
      _contrato = data;
      _isLoading = false;
      _errorMessage = data == null ? 'No se pudo cargar el contrato.' : null;
    });
  }

  String _str(String key, [String fallback = '—']) {
    final v = _contrato?[key];
    if (v == null || v.toString().trim().isEmpty) return fallback;
    return v.toString();
  }

  Future<void> _firmar() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Firmar contrato',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: const Text(
          'Al firmar, aceptas las condiciones del contrato y tu acuerdo queda registrado de forma segura. Esta acción no se puede deshacer.',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Volver',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sí, aceptar y firmar'),
          ),
        ],
      ),
    );
    if (confirmar != true || !mounted) return;

    setState(() => _procesando = true);
    final api = context.read<AuthProvider>().apiService;
    final res = await api.aceptarContrato(widget.contratoId);
    if (!mounted) return;
    setState(() => _procesando = false);
    if (res['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Contrato firmado. El propietario fue notificado.'),
        ),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['error']?.toString() ?? 'No se pudo firmar.'),
        ),
      );
    }
  }

  Future<void> _rechazar() async {
    final motivoCtrl = TextEditingController();
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'No estoy de acuerdo',
          style: TextStyle(color: AppColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Cuéntale al propietario qué te gustaría cambiar. Podrán negociar nuevas condiciones.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: motivoCtrl,
              maxLines: 3,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Ej: el monto mensual es alto para mí...',
                hintStyle: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 13,
                ),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Volver',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Rechazar'),
          ),
        ],
      ),
    );
    if (confirmar != true || !mounted) return;

    setState(() => _procesando = true);
    final api = context.read<AuthProvider>().apiService;
    final res = await api.rechazarContrato(
      widget.contratoId,
      motivoCtrl.text.trim(),
    );
    if (!mounted) return;
    setState(() => _procesando = false);
    if (res['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Rechazaste el contrato. El propietario fue notificado.',
          ),
        ),
      );
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['error']?.toString() ?? 'No se pudo rechazar.'),
        ),
      );
    }
  }

  Widget _fila(String label, String valor, {IconData? icono}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icono != null) ...[
            Icon(icono, size: 16, color: AppColors.primary),
            const SizedBox(width: 8),
          ],
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              valor,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _seccionLegal(String titulo, String contenido) {
    if (contenido.trim().isEmpty) return const SizedBox.shrink();
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        iconColor: AppColors.primary,
        collapsedIconColor: AppColors.textSecondary,
        title: Text(
          titulo,
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              contenido,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _contrato;
    final estado = (c?['estado'] ?? '').toString();
    final info =
        _estadoInfo[estado] ??
        {'label': estado, 'color': AppColors.textSecondary};
    final esInquilino =
        (c?['inquilino'] as num?)?.toInt() == widget.currentUserId;
    final puedeFirmar = esInquilino && estado == 'enviado';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Tu contrato',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 17),
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : c == null
          ? Center(
              child: Text(
                _errorMessage ?? 'Error',
                style: const TextStyle(color: AppColors.error),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                // ─── Encabezado: propiedad + estado ───
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _str('inmueble_titulo', 'Contrato'),
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _str('tipo_contrato_nombre', 'Contrato'),
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: (info['color'] as Color).withValues(
                            alpha: 0.15,
                          ),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          info['label'] as String,
                          style: TextStyle(
                            color: info['color'] as Color,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // ─── Resumen humano ───
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      _fila(
                        'Propietario',
                        _str('propietario_nombre'),
                        icono: Icons.person_outline,
                      ),
                      _fila(
                        'Inquilino',
                        _str('inquilino_nombre'),
                        icono: Icons.badge_outlined,
                      ),
                      const Divider(color: AppColors.borderSubtle, height: 18),
                      _fila(
                        'Monto',
                        '${_str('monto', '0')} ${_str('moneda', 'Bs')}',
                        icono: Icons.payments_outlined,
                      ),
                      if (_str('deposito') != '—' &&
                          _str('deposito') != '0.00' &&
                          _str('deposito') != '0')
                        _fila(
                          'Garantía',
                          '${_str('deposito')} ${_str('moneda', 'Bs')}',
                          icono: Icons.shield_outlined,
                        ),
                      _fila(
                        'Desde',
                        _str('inicio'),
                        icono: Icons.calendar_today_outlined,
                      ),
                      _fila('Hasta', _str('fin'), icono: Icons.event_outlined),
                      if (_str('dia_pago') != '—')
                        _fila(
                          'Día de pago',
                          'Día ${_str('dia_pago')} de cada mes',
                          icono: Icons.schedule_outlined,
                        ),
                      if (_str('forma_pago') != '—')
                        _fila(
                          'Forma de pago',
                          _str('forma_pago'),
                          icono: Icons.credit_card_outlined,
                        ),
                    ],
                  ),
                ),

                if (estado == 'rechazado' && _str('motivo_rechazo') != '—')
                  Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Motivo del rechazo',
                            style: TextStyle(
                              color: AppColors.error,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _str('motivo_rechazo'),
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                const SizedBox(height: 18),
                const Text(
                  'Texto legal completo',
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      _seccionLegal('Cláusulas', _str('clausulas', '')),
                      _seccionLegal(
                        'Condiciones de uso',
                        _str('condiciones_uso', ''),
                      ),
                      _seccionLegal('Penalidades', _str('penalidades', '')),
                      _seccionLegal(
                        'Política de cancelación',
                        _str('politica_cancelacion', ''),
                      ),
                      _seccionLegal(
                        'Servicios incluidos',
                        _str('incluye_servicios', ''),
                      ),
                      _seccionLegal('Restricciones', _str('restricciones', '')),
                      _seccionLegal('Antecedentes', _str('antecedentes', '')),
                      _seccionLegal('Uso permitido', _str('uso_exclusivo', '')),
                      _seccionLegal(
                        'Cláusulas especiales',
                        _str('clausulas_especiales', ''),
                      ),
                      if (_str('observaciones') != '—')
                        _seccionLegal(
                          'Observaciones',
                          _str('observaciones', ''),
                        ),
                    ],
                  ),
                ),

                // ─── Acciones del inquilino ───
                if (puedeFirmar) ...[
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _procesando ? null : _firmar,
                    icon: _procesando
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.draw_outlined),
                    label: const Text(
                      'Firmar contrato',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primaryDark,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _procesando ? null : _rechazar,
                    icon: const Icon(Icons.close),
                    label: const Text('No estoy de acuerdo'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Center(
                    child: Text(
                      'Tu acuerdo queda registrado de forma segura.',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
