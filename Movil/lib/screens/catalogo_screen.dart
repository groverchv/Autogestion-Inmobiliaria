import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import 'propiedad_detalle_screen.dart';

class CatalogoScreen extends StatefulWidget {
  const CatalogoScreen({super.key});

  @override
  State<CatalogoScreen> createState() => _CatalogoScreenState();
}

class _CatalogoScreenState extends State<CatalogoScreen> {
  List<Inmueble> _todosLosInmuebles = [];
  List<Inmueble> _inmueblesFiltrados = [];
  bool _isLoading = true;
  String? _errorMessage;

  final TextEditingController _searchController = TextEditingController();
  String _filtroTipoOferta = 'TODOS';
  String _filtroTipoInmueble = 'TODOS';
  int _filtroHabitaciones = 0;

  @override
  void initState() {
    super.initState();
    _cargarCatalogo();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _cargarCatalogo() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final api = context.read<AuthProvider>().apiService;
    try {
      final list = await api.getCatalogo();
      if (mounted) {
        setState(() {
          _todosLosInmuebles = list;
          _isLoading = false;
        });
        _aplicarFiltros();
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

  void _aplicarFiltros() {
    final query = _searchController.text.trim().toLowerCase();

    setState(() {
      _inmueblesFiltrados = _todosLosInmuebles.where((inmueble) {
        final matchSearch = query.isEmpty ||
            inmueble.titulo.toLowerCase().contains(query) ||
            inmueble.ciudad.toLowerCase().contains(query) ||
            inmueble.zona.toLowerCase().contains(query) ||
            inmueble.direccionCompleta.toLowerCase().contains(query) ||
            inmueble.tipoNombre.toLowerCase().contains(query);

        final matchOferta = _filtroTipoOferta == 'TODOS' ||
            inmueble.tipoOferta.toUpperCase() == _filtroTipoOferta;

        final matchTipo = _filtroTipoInmueble == 'TODOS' ||
            inmueble.tipoNombre.toUpperCase().contains(_filtroTipoInmueble);

        final matchHab = _filtroHabitaciones == 0 ||
            inmueble.habitaciones >= _filtroHabitaciones;

        return matchSearch && matchOferta && matchTipo && matchHab;
      }).toList();
    });
  }

  void _abrirModalFiltros() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Filtros de Búsqueda',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      TextButton(
                        onPressed: () {
                          setModalState(() {
                            _filtroTipoOferta = 'TODOS';
                            _filtroTipoInmueble = 'TODOS';
                            _filtroHabitaciones = 0;
                          });
                          _aplicarFiltros();
                          Navigator.pop(ctx);
                        },
                        child: const Text('Limpiar', style: TextStyle(color: AppColors.primary)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Tipo de Oferta
                  const Text('Tipo de Oferta', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: ['TODOS', 'ALQUILER', 'VENTA', 'ANTICRETICO'].map((tipo) {
                      final isSelected = _filtroTipoOferta == tipo;
                      return ChoiceChip(
                        label: Text(tipo == 'TODOS' ? 'Todos' : tipo),
                        selected: isSelected,
                        selectedColor: AppColors.primary.withValues(alpha: 0.25),
                        backgroundColor: AppColors.surfaceElevated,
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : AppColors.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                        onSelected: (val) {
                          setModalState(() => _filtroTipoOferta = tipo);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Habitaciones mínimas
                  const Text('Habitaciones Mínimas', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [0, 1, 2, 3, 4, 5].map((cant) {
                      final isSelected = _filtroHabitaciones == cant;
                      return ChoiceChip(
                        label: Text(cant == 0 ? 'Cualquiera' : '$cant+'),
                        selected: isSelected,
                        selectedColor: AppColors.primary.withValues(alpha: 0.25),
                        backgroundColor: AppColors.surfaceElevated,
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : AppColors.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 13,
                        ),
                        onSelected: (val) {
                          setModalState(() => _filtroHabitaciones = cant);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton(
                    onPressed: () {
                      _aplicarFiltros();
                      Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryDark,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Aplicar Filtros', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _toggleFavorito(Inmueble item) async {
    final api = context.read<AuthProvider>().apiService;
    final messenger = ScaffoldMessenger.of(context);
    final resultado = await api.toggleFavorito(item.id);
    if (resultado != null) {
      messenger.clearSnackBars();
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            resultado ? 'Agregado a favoritos' : 'Eliminado de favoritos',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          backgroundColor: resultado ? AppColors.success : AppColors.surfaceElevated,
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      _cargarCatalogo();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ─── Buscador y Barra de Filtros Dark Mode con Degradado ───
          Container(
            margin: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: AppColors.darkCardGradient,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderSubtle),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Campo de búsqueda con icono de lupa
                    Expanded(
                      child: Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (_) => _aplicarFiltros(),
                          decoration: InputDecoration(
                            hintText: 'Buscar por zona, ciudad o palabras clave (Ej: Equipetrol...)',
                            hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                            prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.primary),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18, color: AppColors.textMuted),
                                    onPressed: () {
                                      _searchController.clear();
                                      _aplicarFiltros();
                                    },
                                  )
                                : null,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Botón de Filtros
                    OutlinedButton.icon(
                      onPressed: _abrirModalFiltros,
                      icon: const Icon(Icons.tune, size: 18, color: AppColors.primary),
                      label: const Text(
                        'Filtros',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppColors.surface,
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Contador de resultados
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${_inmueblesFiltrados.length} propiedades encontradas',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Lista de Propiedades
          Expanded(
            child: RefreshIndicator(
              onRefresh: _cargarCatalogo,
              color: AppColors.primary,
              child: _buildListContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.error),
            const SizedBox(height: 12),
            Text('Error al cargar catálogo: $_errorMessage', style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _cargarCatalogo,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
              child: const Text('Reintentar', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    if (_inmueblesFiltrados.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.home_work_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            const Text('No se encontraron propiedades', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 6),
            const Text('Intenta ajustar los términos de búsqueda o filtros.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 14),
            TextButton(
              onPressed: () {
                _searchController.clear();
                _filtroTipoOferta = 'TODOS';
                _filtroTipoInmueble = 'TODOS';
                _filtroHabitaciones = 0;
                _aplicarFiltros();
              },
              child: const Text('Restablecer Búsqueda', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        mainAxisExtent: 300,
      ),
      itemCount: _inmueblesFiltrados.length,
      itemBuilder: (context, index) {
        final item = _inmueblesFiltrados[index];
        return _buildCard(item);
      },
    );
  }

  Widget _buildCard(Inmueble item) {
    return Container(
      decoration: BoxDecoration(
        gradient: AppColors.darkCardGradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PropiedadDetalleScreen(inmuebleId: item.id)),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen con Badges
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: SizedBox(
                    height: 140,
                    width: double.infinity,
                    child: item.imagenPrincipal != null && item.imagenPrincipal!.isNotEmpty
                        ? Image.network(
                            item.imagenPrincipal!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              color: AppColors.surfaceElevated,
                              child: const Icon(Icons.home_work_outlined, size: 40, color: AppColors.textMuted),
                            ),
                          )
                        : Container(
                            color: AppColors.surfaceElevated,
                            child: const Icon(Icons.home_work_outlined, size: 40, color: AppColors.textMuted),
                          ),
                  ),
                ),
                Positioned(
                  top: 8,
                  left: 8,
                  child: Wrap(
                    spacing: 4,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.estado.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.tipoOferta.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  bottom: 6,
                  right: 8,
                  child: InkWell(
                    onTap: () => _toggleFavorito(item),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: AppColors.surface.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Icon(
                        item.isFavorito ? Icons.favorite : Icons.favorite_border,
                        size: 16,
                        color: item.isFavorito ? AppColors.error : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Contenido
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.titulo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.direccionCompleta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      if (item.habitaciones > 0) ...[
                        Text('${item.habitaciones} hab.', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                        const SizedBox(width: 8),
                      ],
                      if (item.banos > 0) ...[
                        Text('${item.banos} baños', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            const Spacer(),
            const Divider(height: 1, color: AppColors.borderSubtle),

            // Footer con Precio y Botón Degradado
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Bs. ${item.precio}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('Detalles', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
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
