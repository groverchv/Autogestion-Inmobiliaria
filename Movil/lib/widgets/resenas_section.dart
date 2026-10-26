import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';

/// Opiniones de usuarios sobre un inmueble: promedio, lista y formulario
/// para dejar una reseña. Paridad con ResenaSection de la web.
class ResenasSection extends StatefulWidget {
  final int inmuebleId;
  final bool esDuenio;

  const ResenasSection({
    super.key,
    required this.inmuebleId,
    this.esDuenio = false,
  });

  @override
  State<ResenasSection> createState() => _ResenasSectionState();
}

class _ResenasSectionState extends State<ResenasSection> {
  List<dynamic> _resenas = [];
  Map<String, dynamic>? _promedio;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final api = context.read<AuthProvider>().apiService;
    final results = await Future.wait([
      api.getResenas(widget.inmuebleId),
      api.getPromedioResenas(widget.inmuebleId),
    ]);
    if (!mounted) return;
    setState(() {
      _resenas = results[0] as List<dynamic>;
      _promedio = results[1] as Map<String, dynamic>?;
      _isLoading = false;
    });
  }

  Widget _estrellas(int valor, {double size = 16}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        return Icon(
          i < valor ? Icons.star : Icons.star_border,
          color: const Color(0xFFFBBF24),
          size: size,
        );
      }),
    );
  }

  Future<void> _abrirFormulario() async {
    int calificacion = 5;
    final comentarioCtrl = TextEditingController();

    final enviar = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Text(
            'Tu opinión',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 16),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  return IconButton(
                    onPressed: () => setDlg(() => calificacion = i + 1),
                    icon: Icon(
                      i < calificacion ? Icons.star : Icons.star_border,
                      color: const Color(0xFFFBBF24),
                      size: 30,
                    ),
                  );
                }),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: comentarioCtrl,
                maxLines: 3,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 13,
                ),
                decoration: InputDecoration(
                  hintText: '¿Cómo fue tu experiencia con esta propiedad?',
                  hintStyle: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12.5,
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
                'Cancelar',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Publicar'),
            ),
          ],
        ),
      ),
    );

    if (enviar != true || !mounted) return;

    final api = context.read<AuthProvider>().apiService;
    final res = await api.crearResena(
      widget.inmuebleId,
      calificacion,
      comentarioCtrl.text.trim(),
    );
    if (!mounted) return;
    if (res['ok'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('¡Gracias por compartir tu opinión!')),
      );
      _cargar();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            res['error']?.toString() ?? 'No se pudo enviar tu reseña.',
          ),
        ),
      );
    }
  }

  String _nombreAutor(dynamic r) {
    final nombre =
        r['autor_nombre'] ?? r['usuario_nombre'] ?? r['autor'] ?? r['usuario'];
    if (nombre is Map) {
      return '${nombre['first_name'] ?? ''} ${nombre['last_name'] ?? ''}'
          .trim();
    }
    return nombre?.toString() ?? 'Usuario';
  }

  @override
  Widget build(BuildContext context) {
    final double promedio = (_promedio?['promedio'] as num?)?.toDouble() ?? 0;
    final int total = (_promedio?['total'] as num?)?.toInt() ?? _resenas.length;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.darkCardGradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Opiniones',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (total > 0)
                Row(
                  children: [
                    _estrellas(promedio.round(), size: 14),
                    const SizedBox(width: 6),
                    Text(
                      '${promedio.toStringAsFixed(1)} ($total)',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 12),

          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              ),
            )
          else if (_resenas.isEmpty)
            const Text(
              'Aún no hay opiniones. Sé el primero en compartir tu experiencia.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5),
            )
          else
            ..._resenas.take(5).map((r) {
              final cal = (r['calificacion'] as num?)?.toInt() ?? 0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _nombreAutor(r),
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _estrellas(cal, size: 12),
                      ],
                    ),
                    if ((r['comentario'] ?? '').toString().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text(
                          r['comentario'].toString(),
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12.5,
                            height: 1.35,
                          ),
                        ),
                      ),
                    const Divider(color: AppColors.borderSubtle, height: 14),
                  ],
                ),
              );
            }),

          if (!widget.esDuenio) ...[
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _abrirFormulario,
                icon: const Icon(
                  Icons.rate_review_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
                label: const Text(
                  'Escribir una opinión',
                  style: TextStyle(color: AppColors.primary, fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
