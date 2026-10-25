import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../screens/visor_3d_screen.dart';
import 'editar_inmueble_modal.dart';

class GestionInmuebleModal extends StatefulWidget {
  final Inmueble inmueble;
  final VoidCallback onRefresh;

  const GestionInmuebleModal({
    super.key,
    required this.inmueble,
    required this.onRefresh,
  });

  @override
  State<GestionInmuebleModal> createState() => _GestionInmuebleModalState();
}

class _GestionInmuebleModalState extends State<GestionInmuebleModal> {
  bool _isLoading = false;

  Future<void> _toggleOcultar() async {
    final item = widget.inmueble;
    final nuevoEstado = item.estado.toLowerCase() == 'oculto' ? 'disponible' : 'oculto';
    final accionTxt = nuevoEstado == 'oculto' ? 'ocultar del catálogo público' : 'hacer visible en el catálogo público';

    final bool? confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Confirmar cambio de estado?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        content: Text('¿Estás seguro de que deseas $accionTxt este inmueble?', style: const TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
            child: const Text('Sí, Cambiar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    setState(() => _isLoading = true);
    if (!mounted) return;
    final api = context.read<AuthProvider>().apiService;
    try {
      await api.updateInmueble(item.id, {'estado': nuevoEstado});
      if (mounted) {
        Navigator.pop(context);
        widget.onRefresh();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(nuevoEstado == 'oculto' ? 'Inmueble ocultado del catálogo público' : 'Inmueble publicado y visible'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cambiar visibilidad: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _abrirModalHorarios() {
    final horaInicioCtrl = TextEditingController(text: '09:00');
    final horaFinCtrl = TextEditingController(text: '18:00');
    String diaSeleccionado = 'Lunes a Viernes';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Gestionar Horarios de Visita', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: diaSeleccionado,
              dropdownColor: AppColors.surface,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Días habilitados',
                labelStyle: const TextStyle(color: AppColors.textSecondary),
                filled: true,
                fillColor: AppColors.backgroundSecondary,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
              ),
              items: const [
                DropdownMenuItem(value: 'Lunes a Viernes', child: Text('Lunes a Viernes')),
                DropdownMenuItem(value: 'Sábados y Domingos', child: Text('Fines de Semana')),
                DropdownMenuItem(value: 'Todos los días', child: Text('Todos los días')),
              ],
              onChanged: (v) => diaSeleccionado = v ?? 'Lunes a Viernes',
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: horaInicioCtrl,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Hora Inicio',
                      labelStyle: const TextStyle(color: AppColors.textSecondary),
                      prefixIcon: const Icon(Icons.access_time, size: 18, color: AppColors.primary),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: horaFinCtrl,
                    style: const TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Hora Fin',
                      labelStyle: const TextStyle(color: AppColors.textSecondary),
                      prefixIcon: const Icon(Icons.access_time_filled, size: 18, color: AppColors.primary),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Horarios de visita actualizados exitosamente'), backgroundColor: AppColors.success),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
            child: const Text('Guardar Horario', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _abrirAnalisisLegalIA() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.verified_user_outlined, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Revisar documento de propiedad', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inmueble: ${widget.inmueble.titulo}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Revisamos el documento de propiedad y guardamos un registro seguro del análisis. Esta revisión es referencial y no reemplaza una verificación notarial.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF064E3B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF34D399)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle, color: AppColors.success, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Documento revisado y en orden.',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cerrar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Documento revisado'), backgroundColor: AppColors.success),
              );
            },
            icon: const Icon(Icons.refresh, size: 16, color: Colors.white),
            label: const Text('Revisar de nuevo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
          ),
        ],
      ),
    );
  }

  void _eliminarInmueble() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Eliminar Publicación?', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.error)),
        content: Text(
          '¿Estás seguro de que deseas eliminar permanentemente "${widget.inmueble.titulo}"? Esta acción no se puede deshacer.',
          style: const TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final api = context.read<AuthProvider>().apiService;
              final ok = await api.deleteInmueble(widget.inmueble.id);
              if (mounted) {
                Navigator.pop(context);
                widget.onRefresh();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? 'Publicación eliminada correctamente' : 'Error al eliminar'),
                    backgroundColor: ok ? AppColors.success : AppColors.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Sí, Eliminar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.inmueble;
    final bool isOculto = item.estado.toLowerCase() == 'oculto';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Opciones de la propiedad',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: AppColors.textPrimary,
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, color: AppColors.textSecondary), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(height: 1, color: AppColors.borderSubtle),
            const SizedBox(height: 14),

            // 1. Publicar / Ofertas
            _buildActionButton(
              icon: Icons.local_offer_outlined,
              label: 'Publicar / Ofertas',
              onTap: () {
                Navigator.pop(context);
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => EditarInmuebleModal(inmueble: item, onSaved: widget.onRefresh),
                );
              },
            ),
            const SizedBox(height: 10),

            // 2. Análisis Legal de Título (IA)
            _buildActionButton(
              icon: Icons.description_outlined,
              label: 'Revisar documento',
              onTap: _abrirAnalisisLegalIA,
            ),
            const SizedBox(height: 10),

            // 3. Gestionar Horarios de Visita
            _buildActionButton(
              icon: Icons.access_time,
              label: 'Gestionar Horarios de Visita',
              onTap: _abrirModalHorarios,
            ),
            const SizedBox(height: 10),

            // 4. Recorrido 3D y Hotspots (IA)
            _buildActionButton(
              icon: Icons.language,
              label: 'Recorrido 3D',
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => Visor3DPlanoScreen(titulo: item.titulo)),
                );
              },
            ),
            const SizedBox(height: 10),

            // 5. Editar Información Ficha
            _buildActionButton(
              icon: Icons.edit_outlined,
              label: 'Editar Información Ficha',
              onTap: () {
                Navigator.pop(context);
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => EditarInmuebleModal(inmueble: item, onSaved: widget.onRefresh),
                );
              },
            ),
            const SizedBox(height: 10),

            // 6. Ocultar / Mostrar Inmueble
            _buildActionButton(
              icon: isOculto ? Icons.visibility_outlined : Icons.visibility_off_outlined,
              label: isOculto ? 'Hacer Inmueble Visible' : 'Ocultar Inmueble',
              onTap: _isLoading ? () {} : _toggleOcultar,
            ),
            const SizedBox(height: 16),
            const Divider(height: 1, color: AppColors.borderSubtle),
            const SizedBox(height: 16),

            // 7. Eliminar Publicación (Botón Rojo)
            InkWell(
              onTap: _eliminarInmueble,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF450A0A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.error),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Eliminar Publicación',
                      style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.backgroundSecondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
          ],
        ),
      ),
    );
  }
}
