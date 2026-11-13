import 'package:flutter/material.dart';
import '../utils/mensajes_error.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';

class WizardPublicarScreen extends StatefulWidget {
  const WizardPublicarScreen({super.key});

  @override
  State<WizardPublicarScreen> createState() => _WizardPublicarScreenState();
}

class _WizardPublicarScreenState extends State<WizardPublicarScreen> {
  int _paso = 0;
  List<Map<String, dynamic>> _tipos = [];
  Map<String, dynamic>? _tipoSel;
  String _operacion = 'alquiler';
  bool _guardando = false;
  String? _error;
  bool _publicado = false;

  final _ciudadCtrl = TextEditingController();
  final _zonaCtrl = TextEditingController();
  final _calleCtrl = TextEditingController();
  final _precioCtrl = TextEditingController();
  final _habCtrl = TextEditingController();
  final _banCtrl = TextEditingController();
  final _supCtrl = TextEditingController();
  final _tituloCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  final List<XFile> _fotos = [];
  final ImagePicker _picker = ImagePicker();

  static const _pasos = [
    '¿Qué publicas?',
    '¿Dónde está?',
    '¿Cuánto pides?',
    'Fotos',
    'Revisar',
  ];

  static const _operaciones = [
    {'id': 'alquiler', 'label': 'Alquilar', 'desc': 'Cobrar por mes'},
    {'id': 'venta', 'label': 'Vender', 'desc': 'Venta definitiva'},
    {'id': 'anticretico', 'label': 'Anticrético', 'desc': 'Anticrético'},
  ];

  @override
  void initState() {
    super.initState();
    _cargarTipos();
  }

  @override
  void dispose() {
    for (final c in [
      _ciudadCtrl, _zonaCtrl, _calleCtrl, _precioCtrl,
      _habCtrl, _banCtrl, _supCtrl, _tituloCtrl, _descCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _cargarTipos() async {
    try {
      final api = context.read<AuthProvider>().apiService;
      final list = await api.getTiposInmueble();
      if (mounted) setState(() => _tipos = list);
    } catch (_) {}
  }

  IconData _iconoTipo(String nombre) {
    final n = nombre.toLowerCase();
    if (n.contains('casa')) return Icons.home_rounded;
    if (n.contains('depart')) return Icons.apartment_rounded;
    if (n.contains('terreno') || n.contains('lote')) return Icons.terrain_rounded;
    if (n.contains('oficina')) return Icons.business_center_rounded;
    if (n.contains('local') || n.contains('comerc')) return Icons.storefront_rounded;
    if (n.contains('galp') || n.contains('bodega')) return Icons.warehouse_rounded;
    return Icons.home_work_rounded;
  }

  bool get _puedeAvanzar {
    switch (_paso) {
      case 0:
        return _tipoSel != null;
      case 1:
        return _ciudadCtrl.text.trim().isNotEmpty && _zonaCtrl.text.trim().isNotEmpty;
      case 2:
        return (double.tryParse(_precioCtrl.text) ?? 0) > 0;
      default:
        return true;
    }
  }

  String get _tituloFinal {
    if (_tituloCtrl.text.trim().isNotEmpty) return _tituloCtrl.text.trim();
    final zona = _zonaCtrl.text.trim().isNotEmpty ? _zonaCtrl.text.trim() : _ciudadCtrl.text.trim();
    return '${_tipoSel?['nombre'] ?? 'Propiedad'} en $zona';
  }

  Future<void> _agregarFotos() async {
    final archivos = await _picker.pickMultiImage(imageQuality: 85);
    if (archivos.isNotEmpty) {
      setState(() => _fotos.addAll(archivos));
    }
  }

  Future<void> _publicar() async {
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      final api = context.read<AuthProvider>().apiService;
      final id = await api.crearInmueble({
        'titulo': _tituloFinal,
        'descripcion': _descCtrl.text.trim(),
        'tipo': _tipoSel!['id'],
        'direccion': {
          'ciudad': _ciudadCtrl.text.trim(),
          'zona': _zonaCtrl.text.trim(),
          'calle': _calleCtrl.text.trim(),
          'referencia': '',
        },
        'habitaciones': int.tryParse(_habCtrl.text) ?? 0,
        'banos': int.tryParse(_banCtrl.text) ?? 0,
        'superficie': _supCtrl.text.trim().isEmpty ? null : double.tryParse(_supCtrl.text),
        'estado': 'disponible',
      });

      try {
        await api.crearPublicacion(
          inmuebleId: id,
          tipoOferta: _operacion,
          precio: double.parse(_precioCtrl.text),
        );
      } catch (_) {}

      for (int i = 0; i < _fotos.length; i++) {
        final f = _fotos[i];
        final bytes = await f.readAsBytes();
        await api.subirMultimediaArchivo(
          inmuebleId: id,
          fileBytes: bytes,
          filename: f.name.isNotEmpty ? f.name : 'foto_$i.jpg',
          tipo: 'imagen',
          esPrincipal: i == 0,
        );
      }

      if (mounted) setState(() => _publicado = true);
    } catch (e) {
      if (mounted) {
        setState(() => _error = mensajeError(e));
      }
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  InputDecoration _dec(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        filled: true,
        fillColor: AppColors.backgroundSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      );

  Widget _label(String texto) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          texto,
          style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
        ),
      );

  Widget _tarjetaSel({
    required bool sel,
    required VoidCallback onTap,
    required Widget child,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: sel ? AppColors.primary.withValues(alpha: 0.15) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: sel ? AppColors.primary : AppColors.border, width: sel ? 2 : 1),
        ),
        child: child,
      ),
    );
  }

  Widget _buildPaso() {
    switch (_paso) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_tipos.isEmpty)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              )
            else
              ..._tipos.map((t) {
                final sel = _tipoSel?['id'] == t['id'];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _tarjetaSel(
                    sel: sel,
                    onTap: () => setState(() => _tipoSel = t),
                    child: Row(
                      children: [
                        Icon(_iconoTipo(t['nombre'] ?? ''),
                            color: sel ? AppColors.primary : AppColors.textSecondary, size: 28),
                        const SizedBox(width: 14),
                        Text(
                          t['nombre'] ?? '',
                          style: TextStyle(
                            color: sel ? AppColors.primary : AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        );
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _label('Ciudad'),
            TextField(controller: _ciudadCtrl, style: const TextStyle(color: AppColors.textPrimary),
                decoration: _dec('Ej: Santa Cruz'), onChanged: (_) => setState(() {})),
            const SizedBox(height: 16),
            _label('Zona o barrio'),
            TextField(controller: _zonaCtrl, style: const TextStyle(color: AppColors.textPrimary),
                decoration: _dec('Ej: Equipetrol'), onChanged: (_) => setState(() {})),
            const SizedBox(height: 16),
            _label('Calle y número (opcional)'),
            TextField(controller: _calleCtrl, style: const TextStyle(color: AppColors.textPrimary),
                decoration: _dec('Ej: Av. Los Tajibos #123')),
          ],
        );
      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ..._operaciones.map((op) {
              final sel = _operacion == op['id'];
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _tarjetaSel(
                  sel: sel,
                  onTap: () => setState(() => _operacion = op['id']!),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(op['label']!,
                                style: TextStyle(
                                    color: sel ? AppColors.primary : AppColors.textPrimary,
                                    fontWeight: FontWeight.w700, fontSize: 16)),
                            Text(op['desc']!,
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          ],
                        ),
                      ),
                      if (sel) const Icon(Icons.check_circle, color: AppColors.primary),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 8),
            _label(_operacion == 'alquiler' ? 'Precio por mes (Bs)' : 'Precio (Bs)'),
            TextField(
              controller: _precioCtrl,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w700),
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: _dec('Ej: 3500'),
              onChanged: (_) => setState(() {}),
            ),
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('Puedes cambiarlo después.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
          ],
        );
      case 3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            GestureDetector(
              onTap: _agregarFotos,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 30),
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.add_photo_alternate_outlined, color: AppColors.primary, size: 34),
                    SizedBox(height: 8),
                    Text('Toca para elegir fotos',
                        style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                    SizedBox(height: 2),
                    Text('Las fotos bonitas consiguen más visitas',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                  ],
                ),
              ),
            ),
            if (_fotos.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: SizedBox(
                  height: 90,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _fotos.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (ctx, i) {
                      return FutureBuilder<Uint8List>(
                        future: _fotos[i].readAsBytes(),
                        builder: (ctx, snap) {
                          return Stack(
                            children: [
                              Container(
                                width: 90,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                      color: i == 0 ? AppColors.primary : AppColors.border,
                                      width: i == 0 ? 2 : 1),
                                  color: AppColors.surface,
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: snap.hasData
                                    ? Image.memory(snap.data!, fit: BoxFit.cover)
                                    : const Center(
                                        child: CircularProgressIndicator(
                                            color: AppColors.primary, strokeWidth: 2)),
                              ),
                              Positioned(
                                top: 4,
                                right: 4,
                                child: GestureDetector(
                                  onTap: () => setState(() => _fotos.removeAt(i)),
                                  child: Container(
                                    width: 22,
                                    height: 22,
                                    decoration: const BoxDecoration(
                                        color: Colors.black54, shape: BoxShape.circle),
                                    child: const Icon(Icons.close, size: 13, color: Colors.white),
                                  ),
                                ),
                              ),
                              if (i == 0)
                                const Positioned(
                                  bottom: 4,
                                  left: 4,
                                  child: _MiniBadge(texto: 'Portada'),
                                ),
                            ],
                          );
                        },
                      );
                    },
                  ),
                ),
              ),
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('Opcional, pero los anuncios con fotos reciben más visitas.',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    _label('Habitaciones'),
                    TextField(controller: _habCtrl, keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        style: const TextStyle(color: AppColors.textPrimary), decoration: _dec('0')),
                  ]),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    _label('Baños'),
                    TextField(controller: _banCtrl, keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        style: const TextStyle(color: AppColors.textPrimary), decoration: _dec('0')),
                  ]),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    _label('Sup. m²'),
                    TextField(controller: _supCtrl, keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        style: const TextStyle(color: AppColors.textPrimary), decoration: _dec('0')),
                  ]),
                ),
              ],
            ),
          ],
        );
      case 4:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _label('Título de tu anuncio'),
            TextField(
              controller: _tituloCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: _dec(_tituloFinal),
              onChanged: (_) => setState(() {}),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('Si lo dejas vacío usaremos: $_tituloFinal',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ),
            const SizedBox(height: 16),
            _label('Descripción (opcional)'),
            TextField(
              controller: _descCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              maxLines: 3,
              decoration: _dec('Ej: Casa amplia con patio, cerca del mercado...'),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 64,
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.photo_outlined, color: AppColors.textMuted, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_tituloFinal,
                            style: const TextStyle(
                                color: AppColors.textPrimary, fontWeight: FontWeight.w700),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text('${_tipoSel?['nombre']} · ${_zonaCtrl.text}, ${_ciudadCtrl.text}',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(
                          'Bs ${_precioCtrl.text}${_operacion == 'alquiler' ? '/mes' : ''}',
                          style: const TextStyle(
                              color: AppColors.primary, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 14)),
              ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_publicado) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 80),
                const SizedBox(height: 18),
                const Text(
                  'Tu anuncio está publicado',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Te avisaremos cuando alguien pida una visita. Para el sello "Documento revisado" puedes subir el título desde Mis propiedades.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                ),
                const SizedBox(height: 30),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Ver mis propiedades',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text('Publicar propiedad',
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700)),
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Paso ${_paso + 1} de 5',
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      Text(_pasos[_paso],
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (_paso + 1) / 5,
                      minHeight: 6,
                      backgroundColor: AppColors.surfaceElevated,
                      valueColor: const AlwaysStoppedAnimation(AppColors.primary),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildPaso(),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  if (_paso > 0)
                    TextButton.icon(
                      onPressed: () => setState(() => _paso--),
                      icon: const Icon(Icons.chevron_left, color: AppColors.textSecondary),
                      label: const Text('Atrás', style: TextStyle(color: AppColors.textSecondary)),
                    )
                  else
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary)),
                    ),
                  const Spacer(),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: _puedeAvanzar ? AppColors.primary : AppColors.surfaceElevated,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: !_puedeAvanzar || _guardando
                        ? null
                        : _paso < 4
                            ? () => setState(() => _paso++)
                            : _publicar,
                    child: _guardando
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(_paso < 4 ? 'Siguiente' : 'Publicar',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  final String texto;
  const _MiniBadge({required this.texto});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(6)),
      child: Text(texto, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}
