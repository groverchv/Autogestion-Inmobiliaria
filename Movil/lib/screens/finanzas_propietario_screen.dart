import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';

/// Balance del propietario: ingreso bruto, comisiones, neto y extracto de pagos.
/// Consume /pagos/reportes/?personal=true (mismo endpoint que la web).
class FinanzasPropietarioScreen extends StatefulWidget {
  const FinanzasPropietarioScreen({super.key});

  @override
  State<FinanzasPropietarioScreen> createState() =>
      _FinanzasPropietarioScreenState();
}

class _FinanzasPropietarioScreenState extends State<FinanzasPropietarioScreen> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final api = context.read<AuthProvider>().apiService;
    final data = await api.getReportesPropietario();
    if (!mounted) return;
    setState(() {
      _data = data;
      _isLoading = false;
    });
  }

  String _fmt(dynamic v) {
    final num n = v is num ? v : num.tryParse(v?.toString() ?? '0') ?? 0;
    return n.toStringAsFixed(2);
  }

  Widget _kpi(String titulo, String valor, Color color, IconData icono) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icono, size: 18, color: color),
            const SizedBox(height: 8),
            Text(
              'Bs. $valor',
              style: TextStyle(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              titulo,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final kpis = _data?['kpis'] as Map<String, dynamic>?;
    final extracto = (_data?['extracto_pagos'] as List?) ?? [];
    final evolucion = (_data?['grafico_evolucion'] as List?) ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Mis finanzas',
          style: TextStyle(color: AppColors.textPrimary, fontSize: 17),
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _data == null
          ? const Center(
              child: Text(
                'No se pudo cargar el balance.',
                style: TextStyle(color: AppColors.error),
              ),
            )
          : RefreshIndicator(
              onRefresh: _cargar,
              color: AppColors.primary,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      _kpi(
                        'Ingreso bruto',
                        _fmt(kpis?['ingreso_bruto']),
                        AppColors.primary,
                        Icons.trending_up,
                      ),
                      const SizedBox(width: 10),
                      _kpi(
                        'Comisiones',
                        _fmt(kpis?['total_comisiones']),
                        AppColors.warning,
                        Icons.percent,
                      ),
                      const SizedBox(width: 10),
                      _kpi(
                        'Ingreso neto',
                        _fmt(kpis?['ingreso_neto']),
                        AppColors.success,
                        Icons.account_balance_wallet_outlined,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Promedio mensual',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          'Bs. ${_fmt(kpis?['promedio_mensual'])}',
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),

                  if (evolucion.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    const Text(
                      'EVOLUCIÓN',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 10),
                    ...evolucion.map((e) {
                      final neto = e['ingreso_neto'] ?? 0;
                      final label = e['label'] ?? e['fecha'] ?? '';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  label.toString(),
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                'Bs. ${_fmt(neto)}',
                                style: const TextStyle(
                                  color: AppColors.success,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],

                  const SizedBox(height: 22),
                  const Text(
                    'EXTRACTO DE PAGOS',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (extracto.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'Aún no tienes pagos recibidos.',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    )
                  else
                    ...extracto.map(
                      (p) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderSubtle),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      p['inmueble']?.toString() ?? 'Inmueble',
                                      style: const TextStyle(
                                        color: AppColors.textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  Text(
                                    'Bs. ${_fmt(p['ingreso_neto'])}',
                                    style: const TextStyle(
                                      color: AppColors.success,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${p['fecha'] ?? ''} · ${p['inquilino'] ?? ''} · ${p['tipo_contrato'] ?? ''}',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11.5,
                                ),
                              ),
                              if ((p['comision'] as num? ?? 0) > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 3),
                                  child: Text(
                                    'Comisión: Bs. ${_fmt(p['comision'])} · Bruto: Bs. ${_fmt(p['ingreso_bruto'])}',
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                            ],
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
