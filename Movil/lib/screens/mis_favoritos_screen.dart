import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import 'propiedad_detalle_screen.dart';

class MisFavoritosScreen extends StatefulWidget {
  const MisFavoritosScreen({super.key});

  @override
  State<MisFavoritosScreen> createState() => _MisFavoritosScreenState();
}

class _MisFavoritosScreenState extends State<MisFavoritosScreen> {
  List<Inmueble> _favoritos = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _cargarFavoritos();
  }

  Future<void> _cargarFavoritos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final api = context.read<AuthProvider>().apiService;
    try {
      final list = await api.getFavoritos();
      if (mounted) {
        setState(() {
          _favoritos = list;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mis Favoritos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.textPrimary)),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: RefreshIndicator(
        onRefresh: _cargarFavoritos,
        color: AppColors.primary,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (_errorMessage != null) {
      return Center(child: Text('Error: $_errorMessage', style: const TextStyle(color: AppColors.error)));
    }

    if (_favoritos.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.favorite_border, size: 54, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text('No tienes propiedades en favoritos.', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _favoritos.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _favoritos[index];
        return Container(
          decoration: BoxDecoration(
            gradient: AppColors.darkCardGradient,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: ListTile(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => PropiedadDetalleScreen(inmuebleId: item.id)),
              );
            },
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 60,
                height: 60,
                child: item.imagenPrincipal != null && item.imagenPrincipal!.isNotEmpty
                    ? Image.network(item.imagenPrincipal!, fit: BoxFit.cover)
                    : Container(color: AppColors.surfaceElevated, child: const Icon(Icons.home, color: AppColors.textMuted)),
              ),
            ),
            title: Text(item.titulo, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 15)),
            subtitle: Text('Bs. ${item.precio} • ${item.tipoOferta}', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            trailing: const Icon(Icons.favorite, color: AppColors.error),
          ),
        );
      },
    );
  }
}
