import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import 'auditoria_camara_screen.dart';
import 'captura_360_screen.dart';
import 'mis_mensajes_screen.dart';
import 'visor_3d_screen.dart';
import 'visor_inmersivo_360_screen.dart';
import '../widgets/calidad_vida_card.dart';

class PropiedadDetalleScreen extends StatefulWidget {
  final int inmuebleId;

  const PropiedadDetalleScreen({super.key, required this.inmuebleId});

  @override
  State<PropiedadDetalleScreen> createState() => _PropiedadDetalleScreenState();
}

class _PropiedadDetalleScreenState extends State<PropiedadDetalleScreen> {
  Inmueble? _inmueble;
  Map<String, dynamic>? _calidadVidaData;
  bool _isLoading = true;
  String? _errorMessage;
  int _selectedPhotoIndex = 0;

  @override
  void initState() {
    super.initState();
    _cargarDetalle();
  }

  Future<void> _cargarDetalle() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final api = context.read<AuthProvider>().apiService;
    try {
      final data = await api.getInmuebleDetalle(widget.inmuebleId);
      final calidadVida = await api.obtenerIndiceCalidadVida(inmuebleId: widget.inmuebleId);
      if (mounted) {
        setState(() {
          _inmueble = data;
          _calidadVidaData = calidadVida;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }


  Future<void> _contactarPropietario() async {
    if (_inmueble == null) return;
    final auth = context.read<AuthProvider>();
    final currentUserId = auth.user?.id ?? 0;
    final propId = _inmueble!.propietarioId ?? _inmueble!.propietario?.id;

    if (propId == null || propId == currentUserId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Esta propiedad es tuya o no tiene un propietario asignado.'),
          backgroundColor: AppColors.primary,
        ),
      );
      return;
    }

    try {
      final chat = await auth.apiService.getOrCreateChat(propId, currentUserId);
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => SalaChatScreen(chat: chat)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al contactar: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _abrirModalAgendarCita() {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    TimeOfDay selectedTime = const TimeOfDay(hour: 10, minute: 0);
    final notasController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Agendar Visita', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                  const SizedBox(height: 14),

                  // Fecha
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
                    tileColor: AppColors.backgroundSecondary,
                    leading: const Icon(Icons.calendar_today, color: AppColors.primary),
                    title: Text(
                      'Fecha: ${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                    ),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 60)),
                      );
                      if (picked != null) setModalState(() => selectedDate = picked);
                    },
                  ),
                  const SizedBox(height: 10),

                  // Hora
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: AppColors.border)),
                    tileColor: AppColors.backgroundSecondary,
                    leading: const Icon(Icons.access_time, color: AppColors.primary),
                    title: Text(
                      'Hora: ${selectedTime.format(context)}',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                    ),
                    onTap: () async {
                      final picked = await showTimePicker(context: context, initialTime: selectedTime);
                      if (picked != null) setModalState(() => selectedTime = picked);
                    },
                  ),
                  const SizedBox(height: 10),

                  TextField(
                    controller: notasController,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: 'Notas o motivo',
                      labelStyle: const TextStyle(color: AppColors.textSecondary),
                      filled: true,
                      fillColor: AppColors.backgroundSecondary,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Container(
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: ElevatedButton(
                      onPressed: () async {
                        final api = context.read<AuthProvider>().apiService;
                        final messenger = ScaffoldMessenger.of(context);
                        final horaStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}:00';
                        final fechaStr = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
                        
                        final ok = await api.agendarCita(
                          inmuebleId: widget.inmuebleId,
                          fecha: fechaStr,
                          hora: horaStr,
                          notas: notasController.text.trim(),
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(ok ? 'Cita agendada exitosamente' : 'Error al agendar cita'),
                            backgroundColor: ok ? AppColors.success : AppColors.error,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Confirmar Cita', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Cargando propiedad...')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (_errorMessage != null || _inmueble == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Detalle de Inmueble')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text('Error al cargar detalle: $_errorMessage', style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _cargarDetalle,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
                child: const Text('Reintentar', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    final item = _inmueble!;
    final List<String> fotos = item.galeria.isNotEmpty
        ? item.galeria.map((g) => g.archivoUrl).toList()
        : (item.imagenPrincipal != null ? [item.imagenPrincipal!] : []);

    final List<Multimedia> panoramas360 = item.galeria.where(
      (m) => m.tipo.toLowerCase().contains('360') || m.tipo.toLowerCase().contains('panorama'),
    ).toList();
    final bool tiene360 = panoramas360.isNotEmpty;

    final auth = context.watch<AuthProvider>();
    final currentUserId = auth.user?.id ?? 0;
    final int? propId = item.propietarioId ?? item.propietario?.id;
    final bool esDuenio = propId != null && propId == currentUserId;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(item.titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        actions: [
          IconButton(
            icon: Icon(item.isFavorito ? Icons.favorite : Icons.favorite_border, color: item.isFavorito ? AppColors.error : AppColors.textSecondary),
            onPressed: () async {
              final api = context.read<AuthProvider>().apiService;
              await api.toggleFavorito(item.id);
              _cargarDetalle();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Galería Principal
                  SizedBox(
                    height: 240,
                    child: fotos.isNotEmpty
                        ? Image.network(fotos[_selectedPhotoIndex], fit: BoxFit.cover)
                        : Container(color: AppColors.surfaceElevated, child: const Icon(Icons.home, size: 60, color: AppColors.textMuted)),
                  ),

                  // Miniaturas de fotos
                  if (fotos.length > 1)
                    Container(
                      height: 70,
                      color: AppColors.backgroundSecondary,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: fotos.length,
                        itemBuilder: (context, index) {
                          final isSel = _selectedPhotoIndex == index;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedPhotoIndex = index),
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              width: 60,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSel ? AppColors.primary : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.network(fotos[index], fit: BoxFit.cover),
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                  // 2. Módulos Inmersivos (Visor 360°, 3D, AR, VR)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        if (tiene360) ...[
                          Expanded(
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: AppColors.purpleGradient,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => VisorInmersivo360Screen(
                                        panoramaUrl: panoramas360.first.archivoUrl,
                                        titulo: item.titulo,
                                        inmuebleId: item.id,
                                      ),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.threesixty, size: 20, color: Colors.white),
                                label: const Text('Visor 360° & VR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                        ],

                        // Botón 3D / AR
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => Visor3DPlanoScreen(titulo: item.titulo),
                                ),
                              );
                            },
                            icon: const Icon(Icons.view_in_ar, size: 20, color: AppColors.primary),
                            label: const Text('Plano 3D & RA', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.primary),
                              backgroundColor: AppColors.surface,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Botón Auditoría de Inmueble (Check-in / Check-out)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AuditoriaCamaraScreen(inmueble: item),
                                ),
                              );
                            },
                            icon: const Icon(Icons.shield_outlined, size: 20, color: AppColors.accent),
                            label: const Text('Auditoría', style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 13)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.accent),
                              backgroundColor: AppColors.surface,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 2.5. Tarjeta de Calidad de Vida & Walk Score del Barrio
                  if (_calidadVidaData != null)
                    CalidadVidaCard(data: _calidadVidaData!),

                  // 3. Tarjeta de Contacto Directo con el Propietario (Dark)

                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: AppColors.darkCardGradient,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderSubtle),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.primaryGradient,
                          ),
                          padding: const EdgeInsets.all(2),
                          child: const CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.surface,
                            child: Icon(Icons.person, color: AppColors.primary, size: 22),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.propietarioNombre?.isNotEmpty == true ? item.propietarioNombre! : 'Propietario Inmobiliario',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                              ),
                              const Text('Propietario Verificado', style: TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Botón Auditoría IA Check-in/out
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
                          ),
                          child: IconButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AuditoriaCamaraScreen(inmueble: item),
                                ),
                              );
                            },
                            icon: const Icon(Icons.document_scanner_outlined, color: AppColors.primary, size: 20),
                            tooltip: 'Auditoría IA Check-in/out',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: ElevatedButton.icon(
                            onPressed: _contactarPropietario,
                            icon: const Icon(Icons.chat_outlined, size: 16, color: Colors.white),
                            label: const Text('Chat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 4. Información del Inmueble (Dark)
                  Container(
                    margin: const EdgeInsets.all(16),
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
                            Text(
                              item.tipoNombre.toUpperCase(),
                              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                item.estado.toUpperCase(),
                                style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.titulo,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 16, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(item.direccionCompleta, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 1, color: AppColors.borderSubtle),
                        const SizedBox(height: 16),

                        // Características
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildFeature(Icons.bed, '${item.habitaciones}', 'Habitaciones'),
                            _buildFeature(Icons.bathtub_outlined, '${item.banos}', 'Baños'),
                            if (item.superficie > 0)
                              _buildFeature(Icons.square_foot, '${item.superficie.toInt()} m²', 'Superficie'),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // 5. Descripción
                  if (item.descripcion.isNotEmpty)
                    Container(
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
                          const Text('Descripción', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                          const SizedBox(height: 8),
                          Text(item.descripcion, style: const TextStyle(color: AppColors.textSecondary, height: 1.4)),
                        ],
                      ),
                    ),

                  // 6. Botón Capturar Recorrido 360° con Sensores
                  if (esDuenio)
                    Container(
                      margin: const EdgeInsets.all(16),
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => Captura360Screen(inmueble: item)),
                          );
                        },
                        icon: const Icon(Icons.panorama_photosphere, color: AppColors.primary),
                        label: const Text('Capturar Nueva Foto 360° con Sensores', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 7. Barra Inferior de Acción (Dark)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppColors.backgroundSecondary,
              border: Border(top: BorderSide(color: AppColors.borderSubtle)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Precio mensual', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    Text('Bs. ${item.precio}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                  ],
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: ElevatedButton.icon(
                    onPressed: _abrirModalAgendarCita,
                    icon: const Icon(Icons.calendar_month, color: Colors.white, size: 18),
                    label: const Text('Agendar Cita', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeature(IconData icon, String valor, String label) {
    return Column(
      children: [
        Icon(icon, color: AppColors.primary, size: 24),
        const SizedBox(height: 4),
        Text(valor, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }
}
