import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

class AuditoriaCamaraScreen extends StatefulWidget {
  final Inmueble inmueble;
  final bool isCheckOut;
  final int? checkinId;

  const AuditoriaCamaraScreen({
    super.key,
    required this.inmueble,
    this.isCheckOut = false,
    this.checkinId,
  });

  @override
  State<AuditoriaCamaraScreen> createState() => _AuditoriaCamaraScreenState();
}

class _AuditoriaCamaraScreenState extends State<AuditoriaCamaraScreen> {
  final Map<String, String> _fotosCapturadas = {};
  bool _procesando = false;
  Map<String, dynamic>? _resultadoAuditoria;

  @override
  void initState() {
    super.initState();
    // Cargar automáticamente las fotos reales de este inmueble específico
    final galeria = widget.inmueble.galeria;
    if (galeria.isNotEmpty) {
      for (int i = 0; i < galeria.length; i++) {
        final m = galeria[i];
        final key = m.titulo.trim().isNotEmpty ? m.titulo.trim() : 'Ambiente ${i + 1}';
        _fotosCapturadas[key] = m.archivoUrl;
      }
    } else if (widget.inmueble.imagenPrincipal != null) {
      _fotosCapturadas['Ambiente Principal'] = widget.inmueble.imagenPrincipal!;
    }
  }

  void _simularCaptura(String key) {
    setState(() {
      _fotosCapturadas[key] = widget.inmueble.imagenPrincipal ?? 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Foto de $key actualizada', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 1),
      ),
    );
  }

  Future<void> _ejecutarPeritajeIA() async {
    if (_fotosCapturadas.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay fotos para auditar en este inmueble'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _procesando = true);
    final api = context.read<AuthProvider>().apiService;

    final List<Map<String, String>> fotosPayload = _fotosCapturadas.entries.map((e) => {
      'ambiente': e.key,
      'foto_url': e.value,
    }).toList();

    Map<String, dynamic>? res;
    if (widget.isCheckOut) {
      res = await api.ejecutarCheckout(
        inmuebleId: widget.inmueble.id,
        checkinId: widget.checkinId,
        fotos: fotosPayload,
      );
    } else {
      res = await api.iniciarCheckin(
        inmuebleId: widget.inmueble.id,
        fotos: fotosPayload,
      );
    }

    if (mounted) {
      setState(() {
        _procesando = false;
        _resultadoAuditoria = res;
      });

      if (res != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.isCheckOut ? 'Devolución de garantía liquidada exitosamente' : 'Revisión de entrada registrada con éxito',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.isCheckOut ? 'Revisión de Salida y Garantía' : 'Revisión de Entrada';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Tarjeta del Inmueble
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: AppColors.darkCardGradient,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.verified_outlined, color: AppColors.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.inmueble.titulo,
                            style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Auditoría visual con Inteligencia Artificial',
                            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Lista de Ambientes a capturar
              const Text(
                'Fotos del Inmueble a Auditar',
                style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 10),

              if (_fotosCapturadas.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Center(
                    child: Text('No hay fotos registradas para este inmueble.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ),
                )
              else
                ..._fotosCapturadas.entries.map((entry) {
                  final key = entry.key;
                  final fotoUrl = entry.value;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Vista previa de la Imagen del Ambiente
                        Stack(
                          children: [
                            SizedBox(
                              height: 140,
                              width: double.infinity,
                              child: fotoUrl.isNotEmpty
                                  ? Image.network(
                                      fotoUrl,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => Container(
                                        color: AppColors.surfaceElevated,
                                        child: const Icon(Icons.broken_image, color: AppColors.textMuted, size: 40),
                                      ),
                                    )
                                  : Container(
                                      color: AppColors.surfaceElevated,
                                      child: const Icon(Icons.image, color: AppColors.textMuted, size: 40),
                                    ),
                            ),
                            Positioned(
                              top: 10,
                              left: 10,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.75),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  key,
                                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ),
                            ),
                          ],
                        ),

                        // Pie de la tarjeta con estado y botón de acción
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.success,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Foto lista para análisis',
                                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => _simularCaptura(key),
                                icon: const Icon(Icons.camera_alt_outlined, size: 14, color: AppColors.primary),
                                label: const Text('Cambiar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primary),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),

              const SizedBox(height: 14),

              // Botón Procesar Auditoría con IA
              Container(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ElevatedButton(
                  onPressed: _procesando ? null : _ejecutarPeritajeIA,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _procesando
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                            SizedBox(width: 10),
                            Text('Analizando con Inteligencia Artificial...', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        )
                      : Text(
                          widget.isCheckOut ? 'Ejecutar Revisión de Salida' : 'Registrar Revisión de Entrada',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                ),
              ),

              // Resultado / Dictamen
              if (_resultadoAuditoria != null) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.assignment_turned_in_outlined, color: AppColors.primary, size: 20),
                          SizedBox(width: 8),
                          Text('Resultado de la Revisión', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _resultadoAuditoria!['dictamen_ia'] ?? 'Procesado con éxito',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.5),
                      ),
                      const Divider(height: 20, color: AppColors.borderSubtle),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Saldo a Devolver:', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
                          Text(
                            'Bs. ${_resultadoAuditoria!['monto_a_reembolsar'] ?? '0.00'}',
                            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
