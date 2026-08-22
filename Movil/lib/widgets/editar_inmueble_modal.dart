import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../screens/captura_360_screen.dart';

class EditarInmuebleModal extends StatefulWidget {
  final Inmueble inmueble;
  final VoidCallback onSaved;

  const EditarInmuebleModal({
    super.key,
    required this.inmueble,
    required this.onSaved,
  });

  @override
  State<EditarInmuebleModal> createState() => _EditarInmuebleModalState();
}

class _EditarInmuebleModalState extends State<EditarInmuebleModal> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _imagePicker = ImagePicker();

  late TextEditingController _tituloCtrl;
  late TextEditingController _descripcionCtrl;
  late TextEditingController _precioCtrl;
  late TextEditingController _habitacionesCtrl;
  late TextEditingController _banosCtrl;
  late TextEditingController _superficieCtrl;
  late String _estado;
  late String _tipoOferta;
  bool _garaje = false;
  bool _piscina = false;
  bool _amoblado = false;
  bool _mascotas = false;
  bool _isSaving = false;
  bool _isUploadingMedia = false;

  late List<Multimedia> _galeria;
  final TextEditingController _urlNuevaFotoCtrl = TextEditingController();
  final TextEditingController _urlNuevo360Ctrl = TextEditingController();
  final TextEditingController _urlAudioCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    final item = widget.inmueble;
    _tituloCtrl = TextEditingController(text: item.titulo);
    _descripcionCtrl = TextEditingController(text: item.descripcion);
    _precioCtrl = TextEditingController(text: item.precio);
    _habitacionesCtrl = TextEditingController(text: item.habitaciones.toString());
    _banosCtrl = TextEditingController(text: item.banos.toString());
    _superficieCtrl = TextEditingController(text: item.superficie.toStringAsFixed(0));
    _estado = item.estado.toLowerCase();
    _tipoOferta = item.tipoOferta.toLowerCase();
    _garaje = item.garaje;
    _piscina = item.piscina;
    _amoblado = item.amoblado;
    _mascotas = item.mascotasPermitidas;
    _galeria = List.from(item.galeria);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _tituloCtrl.dispose();
    _descripcionCtrl.dispose();
    _precioCtrl.dispose();
    _habitacionesCtrl.dispose();
    _banosCtrl.dispose();
    _superficieCtrl.dispose();
    _urlNuevaFotoCtrl.dispose();
    _urlNuevo360Ctrl.dispose();
    _urlAudioCtrl.dispose();
    super.dispose();
  }

  Future<void> _seleccionarYSubirFotoGaleria() async {
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (file == null) return;

      setState(() => _isUploadingMedia = true);
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      final api = context.read<AuthProvider>().apiService;

      final nuevoMedia = await api.subirMultimediaArchivo(
        inmuebleId: widget.inmueble.id,
        fileBytes: bytes,
        filename: file.name.isNotEmpty ? file.name : 'foto_${DateTime.now().millisecondsSinceEpoch}.jpg',
        tipo: 'imagen',
        esPrincipal: _galeria.isEmpty,
        descripcion: 'Foto añadida desde dispositivo móvil',
      );

      if (nuevoMedia != null && mounted) {
        setState(() => _galeria.add(nuevoMedia));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto subida a Cloudinary exitosamente'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al subir foto: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingMedia = false);
    }
  }

  Future<void> _tomarFotoConCamara() async {
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      if (file == null) return;

      setState(() => _isUploadingMedia = true);
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      final api = context.read<AuthProvider>().apiService;

      final nuevoMedia = await api.subirMultimediaArchivo(
        inmuebleId: widget.inmueble.id,
        fileBytes: bytes,
        filename: 'camara_${DateTime.now().millisecondsSinceEpoch}.jpg',
        tipo: 'imagen',
        esPrincipal: _galeria.isEmpty,
        descripcion: 'Foto capturada con cámara en vivo',
      );

      if (nuevoMedia != null && mounted) {
        setState(() => _galeria.add(nuevoMedia));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto capturada y subida a Cloudinary'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error con la cámara: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingMedia = false);
    }
  }

  Future<void> _subirPanoramaDesdeDispositivo() async {
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 95,
      );
      if (file == null) return;

      setState(() => _isUploadingMedia = true);
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      final api = context.read<AuthProvider>().apiService;

      final nuevoMedia = await api.subirMultimediaArchivo(
        inmuebleId: widget.inmueble.id,
        fileBytes: bytes,
        filename: file.name.isNotEmpty ? file.name : 'pano_360_${DateTime.now().millisecondsSinceEpoch}.jpg',
        tipo: 'panorama360',
        descripcion: 'Panorama 360° desde dispositivo móvil',
      );

      if (nuevoMedia != null && mounted) {
        setState(() => _galeria.add(nuevoMedia));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Panorama 360° subido a Cloudinary'), backgroundColor: Color(0xFFA855F7)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al subir 360°: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingMedia = false);
    }
  }

  Future<void> _eliminarMultimedia(int index, Multimedia media) async {
    final bool? confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Eliminar archivo multimedia?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        content: const Text('Esta acción quitará la foto o audio de la ficha y de la galería.', style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Sí, Eliminar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    setState(() => _galeria.removeAt(index));
    if (!mounted) return;
    final api = context.read<AuthProvider>().apiService;
    if (media.id > 0) {
      await api.eliminarMultimedia(media.id);
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Elemento eliminado'), duration: Duration(seconds: 1)),
      );
    }
  }

  Future<void> _confirmarYGuardar() async {
    if (!_formKey.currentState!.validate()) return;

    final bool? confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('¿Confirmar actualización?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        content: const Text('Se guardarán todos los cambios en la ficha, precios, características y multimedia del inmueble.', style: TextStyle(color: AppColors.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
            child: const Text('Sí, Guardar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    setState(() => _isSaving = true);
    if (!mounted) return;
    final api = context.read<AuthProvider>().apiService;

    try {
      await api.updateInmueble(widget.inmueble.id, {
        'titulo': _tituloCtrl.text.trim(),
        'descripcion': _descripcionCtrl.text.trim(),
        'precio': double.tryParse(_precioCtrl.text.trim()) ?? 0.0,
        'habitaciones': int.tryParse(_habitacionesCtrl.text.trim()) ?? 0,
        'banos': int.tryParse(_banosCtrl.text.trim()) ?? 0,
        'superficie': double.tryParse(_superficieCtrl.text.trim()) ?? 0.0,
        'estado': _estado,
        'tipo_oferta': _tipoOferta,
        'garaje': _garaje,
        'piscina': _piscina,
        'amoblado': _amoblado,
        'mascotas_permitidas': _mascotas,
      });

      if (mounted) {
        Navigator.pop(context);
        widget.onSaved();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inmueble y multimedia actualizados exitosamente'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al actualizar: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Editar Ficha de Inmueble', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              IconButton(icon: const Icon(Icons.close, color: AppColors.textSecondary), onPressed: () => Navigator.pop(context)),
            ],
          ),
          TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            indicatorColor: AppColors.primary,
            tabs: const [
              Tab(text: 'Datos Ficha'),
              Tab(text: 'Fotos & 360°'),
              Tab(text: 'Audio / VR'),
            ],
          ),
          const SizedBox(height: 12),

          if (_isUploadingMedia)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                  SizedBox(width: 10),
                  Text('Subiendo archivo multimedia a Cloudinary...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                ],
              ),
            ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // ─── PESTAÑA 1: DATOS DE LA FICHA DARK ───
                Form(
                  key: _formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildInput('Título del Inmueble', _tituloCtrl, Icons.title),
                        const SizedBox(height: 12),
                        _buildInput('Descripción', _descripcionCtrl, Icons.description_outlined, maxLines: 3),
                        const SizedBox(height: 12),
                        _buildInput('Precio (Bs.)', _precioCtrl, Icons.payments_outlined, keyboardType: TextInputType.number),
                        const SizedBox(height: 12),

                        Row(
                          children: [
                            Expanded(child: _buildInput('Hab.', _habitacionesCtrl, Icons.bed, keyboardType: TextInputType.number)),
                            const SizedBox(width: 8),
                            Expanded(child: _buildInput('Baños', _banosCtrl, Icons.bathtub_outlined, keyboardType: TextInputType.number)),
                            const SizedBox(width: 8),
                            Expanded(child: _buildInput('Superficie (m²)', _superficieCtrl, Icons.square_foot, keyboardType: TextInputType.number)),
                          ],
                        ),
                        const SizedBox(height: 14),

                        DropdownButtonFormField<String>(
                          initialValue: _estado,
                          dropdownColor: AppColors.surface,
                          decoration: _inputDecoration('Estado de la Propiedad'),
                          style: const TextStyle(color: AppColors.textPrimary),
                          items: const [
                            DropdownMenuItem(value: 'disponible', child: Text('Disponible')),
                            DropdownMenuItem(value: 'ocupado', child: Text('Ocupado')),
                            DropdownMenuItem(value: 'mantenimiento', child: Text('En Mantenimiento')),
                            DropdownMenuItem(value: 'reservado', child: Text('Reservado')),
                            DropdownMenuItem(value: 'oculto', child: Text('Oculto')),
                          ],
                          onChanged: (v) => setState(() => _estado = v ?? 'disponible'),
                        ),
                        const SizedBox(height: 12),

                        DropdownButtonFormField<String>(
                          initialValue: _tipoOferta,
                          dropdownColor: AppColors.surface,
                          decoration: _inputDecoration('Tipo de Oferta'),
                          style: const TextStyle(color: AppColors.textPrimary),
                          items: const [
                            DropdownMenuItem(value: 'alquiler', child: Text('Alquiler')),
                            DropdownMenuItem(value: 'venta', child: Text('Venta')),
                            DropdownMenuItem(value: 'anticretico', child: Text('Anticrético')),
                          ],
                          onChanged: (v) => setState(() => _tipoOferta = v ?? 'alquiler'),
                        ),
                        const SizedBox(height: 10),

                        CheckboxListTile(
                          title: const Text('Garaje / Estacionamiento', style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                          value: _garaje,
                          activeColor: AppColors.primary,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (v) => setState(() => _garaje = v ?? false),
                        ),
                        CheckboxListTile(
                          title: const Text('Piscina', style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                          value: _piscina,
                          activeColor: AppColors.primary,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (v) => setState(() => _piscina = v ?? false),
                        ),
                        CheckboxListTile(
                          title: const Text('Completamente Amoblado', style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                          value: _amoblado,
                          activeColor: AppColors.primary,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (v) => setState(() => _amoblado = v ?? false),
                        ),
                        CheckboxListTile(
                          title: const Text('Se Aceptan Mascotas', style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                          value: _mascotas,
                          activeColor: AppColors.primary,
                          contentPadding: EdgeInsets.zero,
                          onChanged: (v) => setState(() => _mascotas = v ?? false),
                        ),
                      ],
                    ),
                  ),
                ),

                // ─── PESTAÑA 2: FOTOS & 360° DARK ───
                SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Subir Fotos a Cloudinary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _isUploadingMedia ? null : _seleccionarYSubirFotoGaleria,
                              icon: const Icon(Icons.photo_library_outlined, size: 18, color: AppColors.primary),
                              label: const Text('Galería Local', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.primary),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isUploadingMedia ? null : _tomarFotoConCamara,
                              icon: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                              label: const Text('Sacar Foto', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryDark,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      const Text('Imágenes y Recorrido 360° / VR', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _isUploadingMedia ? null : _subirPanoramaDesdeDispositivo,
                              icon: const Icon(Icons.upload_file, size: 18, color: Color(0xFFA855F7)),
                              label: const Text('Subir 360° Local', style: TextStyle(color: Color(0xFFA855F7), fontWeight: FontWeight.bold, fontSize: 12)),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFA855F7)),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => Captura360Screen(inmueble: widget.inmueble)),
                                );
                              },
                              icon: const Icon(Icons.threesixty, size: 18, color: Colors.white),
                              label: const Text('Crear Foto 360°', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF7C3AED),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      ExpansionTile(
                        title: const Text('O ingresar por URL externa', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        tilePadding: EdgeInsets.zero,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _urlNuevaFotoCtrl,
                                  style: const TextStyle(color: AppColors.textPrimary),
                                  decoration: const InputDecoration(
                                    hintText: 'URL de imagen (https://...)',
                                    prefixIcon: Icon(Icons.link, size: 18, color: AppColors.primary),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () {
                                  if (_urlNuevaFotoCtrl.text.trim().isNotEmpty) {
                                    setState(() {
                                      _galeria.add(Multimedia(
                                        id: 0,
                                        archivoUrl: _urlNuevaFotoCtrl.text.trim(),
                                        tipo: 'imagen',
                                        titulo: 'Imagen URL',
                                      ));
                                    });
                                    _urlNuevaFotoCtrl.clear();
                                  }
                                },
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
                                child: const Text('Añadir', style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      Text('Multimedia Actual (${_galeria.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _galeria.length,
                        itemBuilder: (ctx, i) {
                          final m = _galeria[i];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.backgroundSecondary,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: Image.network(
                                    m.archivoUrl,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => Container(width: 48, height: 48, color: AppColors.surfaceElevated, child: const Icon(Icons.image, size: 24, color: AppColors.textMuted)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        m.tipo.toUpperCase(),
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: m.tipo.contains('360') ? const Color(0xFFA855F7) : AppColors.primary,
                                        ),
                                      ),
                                      Text(m.archivoUrl, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                                  onPressed: () => _eliminarMultimedia(i, m),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                // ─── PESTAÑA 3: AUDIO Y AMBIENTE VR DARK ───
                SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Música / Audio de Fondo para Recorrido 360°', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                      const SizedBox(height: 6),
                      const Text(
                        'Ingresa la URL o archivo de audio ambiental MP3 que se reproducirá en el Visor 360° y modo Gafas VR.',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _urlAudioCtrl,
                        style: const TextStyle(color: AppColors.textPrimary),
                        decoration: const InputDecoration(
                          hintText: 'https://.../musica_ambiente.mp3',
                          prefixIcon: Icon(Icons.music_note_outlined, size: 20, color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton.icon(
                        onPressed: () {
                          if (_urlAudioCtrl.text.trim().isNotEmpty) {
                            setState(() {
                              _galeria.add(Multimedia(
                                id: 0,
                                archivoUrl: _urlAudioCtrl.text.trim(),
                                tipo: 'musica',
                                titulo: 'Música Ambiental VR',
                              ));
                            });
                            _urlAudioCtrl.clear();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Audio ambiental asignado al inmueble'), backgroundColor: Color(0xFF0EA5E9)),
                            );
                          }
                        },
                        icon: const Icon(Icons.audiotrack, size: 16, color: Colors.white),
                        label: const Text('Asignar Audio Ambiental', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0EA5E9),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: ElevatedButton(
              onPressed: _isSaving ? null : _confirmarYGuardar,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isSaving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Guardar Todos los Cambios', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.borderSubtle)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  Widget _buildInput(String label, TextEditingController ctrl, IconData icon, {int maxLines = 1, TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.borderSubtle)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      ),
      validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
    );
  }
}
