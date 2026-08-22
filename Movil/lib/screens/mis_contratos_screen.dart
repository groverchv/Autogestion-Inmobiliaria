import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

class MisContratosScreen extends StatefulWidget {
  const MisContratosScreen({super.key});

  @override
  State<MisContratosScreen> createState() => _MisContratosScreenState();
}

class _MisContratosScreenState extends State<MisContratosScreen> {
  List<Contrato> _contratos = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _cargarContratos();
  }

  Future<void> _cargarContratos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final api = context.read<AuthProvider>().apiService;
    try {
      final list = await api.getMisContratos();
      if (mounted) {
        setState(() {
          _contratos = list;
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
      body: RefreshIndicator(
        onRefresh: _cargarContratos,
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

    if (_contratos.isEmpty) {
      return const Center(
        child: Text('No tienes contratos registrados actualmente.', style: TextStyle(color: AppColors.textSecondary)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _contratos.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _contratos[index];
        final bool isActivo = item.estado.contains('ACTIVO') || item.estado.contains('FIRMADO');

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: AppColors.darkCardGradient,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Contrato #${item.id}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isActivo ? AppColors.success : AppColors.warning).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: isActivo ? AppColors.success : AppColors.warning),
                    ),
                    child: Text(
                      item.estado,
                      style: TextStyle(color: isActivo ? AppColors.success : AppColors.warning, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Inmueble: ${item.tituloInmueble}',
                style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textPrimary, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Monto: ${item.monto}',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Vigencia: ${item.fechaInicio} al ${item.fechaFin}',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
            ],
          ),
        );
      },
    );
  }
}
