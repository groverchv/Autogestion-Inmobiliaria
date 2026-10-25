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
          // ─── Buscador Nativo Ultra Compacto ───
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 4),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (_) => _aplicarFiltros(),
                      decoration: InputDecoration(
                        hintText: 'Buscar inmueble, zona...',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        prefixIcon: const Icon(Icons.search, size: 18, color: AppColors.primary),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 16, color: AppColors.textMuted),
                                onPressed: () {
                                  _searchController.clear();
                                  _aplicarFiltros();
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: _abrirModalFiltros,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.tune, size: 16, color: AppColors.primary),
                        SizedBox(width: 4),
                        Text(
                          'Filtros',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ],
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

    return LayoutBuilder(
      builder: (context, constraints) {
        // En pantallas móviles: 3 columnas perfectamente ceñidas sin espacio muerto
        final int columnas = constraints.maxWidth > 550 ? 3 : (constraints.maxWidth > 320 ? 3 : 2);
        final double itemHeight = constraints.maxWidth > 550 ? 250 : 205;

        return GridView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columnas,
            crossAxisSpacing: 6,
            mainAxisSpacing: 6,
            mainAxisExtent: itemHeight,
          ),
          itemCount: _inmueblesFiltrados.length,
          itemBuilder: (context, index) {
            final item = _inmueblesFiltrados[index];
            return _buildCard(item);
          },
        );
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
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  child: SizedBox(
                    height: 95,
                    width: double.infinity,
                    child: item.imagenPrincipal != null && item.imagenPrincipal!.isNotEmpty
                        ? Image.network(
                            item.imagenPrincipal!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              color: AppColors.surfaceElevated,
                              child: const Icon(Icons.home_work_outlined, size: 28, color: AppColors.textMuted),
                            ),
                          )
                        : Container(
                            color: AppColors.surfaceElevated,
                            child: const Icon(Icons.home_work_outlined, size: 28, color: AppColors.textMuted),
                          ),
                  ),
                ),
                Positioned(
                  top: 5,
                  left: 5,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.estado.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 5,
                  right: 5,
                  child: InkWell(
                    onTap: () => _toggleFavorito(item),
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppColors.surface.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Icon(
                        item.isFavorito ? Icons.favorite : Icons.favorite_border,
                        size: 13,
                        color: item.isFavorito ? AppColors.error : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Contenido Compacto Nativo sin Espacio Muerto
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 5, 6, 2),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    item.titulo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    item.ciudad.isNotEmpty ? item.ciudad : item.direccionCompleta,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 9.5, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      if (item.habitaciones > 0) ...[
                        Text('${item.habitaciones}h', style: const TextStyle(fontSize: 9.5, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                        const SizedBox(width: 5),
                      ],
                      if (item.banos > 0) ...[
                        Text('${item.banos}b', style: const TextStyle(fontSize: 9.5, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                      ],
                    ],
                  ),
                ],
              ),
            ),

            const Divider(height: 1, color: AppColors.borderSubtle),

            // Footer con Precio Ceñido
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Bs. ${item.precio}',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppColors.primary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryDark,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Ver', style: TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.bold)),
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
