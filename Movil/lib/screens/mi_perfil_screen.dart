import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

class MiPerfilScreen extends StatefulWidget {
  const MiPerfilScreen({super.key});

  @override
  State<MiPerfilScreen> createState() => _MiPerfilScreenState();
}

class _MiPerfilScreenState extends State<MiPerfilScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nombreCtrl;
  late TextEditingController _apellidoCtrl;
  late TextEditingController _telefonoCtrl;
  late TextEditingController _ciCtrl;
  late TextEditingController _direccionCtrl;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _nombreCtrl = TextEditingController(text: user?.firstName ?? '');
    _apellidoCtrl = TextEditingController(text: user?.lastName ?? '');
    _telefonoCtrl = TextEditingController(text: user?.telefono ?? '');
    _ciCtrl = TextEditingController(text: user?.ci ?? '');
    _direccionCtrl = TextEditingController(text: user?.direccion ?? '');
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _telefonoCtrl.dispose();
    _ciCtrl.dispose();
    _direccionCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardarPerfil() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);

    final ok = await auth.updateProfile({
      'first_name': _nombreCtrl.text.trim(),
      'last_name': _apellidoCtrl.text.trim(),
      'telefono': _telefonoCtrl.text.trim(),
      'ci': _ciCtrl.text.trim(),
      'direccion': _direccionCtrl.text.trim(),
    });

    if (mounted) {
      setState(() => _isSaving = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text(ok ? 'Perfil actualizado con éxito' : 'Error al guardar el perfil'),
          backgroundColor: ok ? AppColors.success : AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Avatar con Degradado Neón
              Center(
                child: Container(
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: AppColors.primaryGradient,
                  ),
                  padding: const EdgeInsets.all(3),
                  child: CircleAvatar(
                    radius: 46,
                    backgroundColor: AppColors.surface,
                    child: Text(
                      user != null && user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 34, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  user?.nombreCompleto.isNotEmpty == true ? user!.nombreCompleto : (user?.email ?? 'Usuario'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
              ),
              Center(
                child: Text(
                  user?.email ?? '',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 24),

              // Tarjeta de Formulario con Degradado Oscuro
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: AppColors.darkCardGradient,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  children: [
                    _buildInput('Nombres', _nombreCtrl, Icons.person_outline),
                    const SizedBox(height: 14),
                    _buildInput('Apellidos', _apellidoCtrl, Icons.person_outline),
                    const SizedBox(height: 14),
                    _buildInput('Teléfono / Celular', _telefonoCtrl, Icons.phone_outlined, keyboardType: TextInputType.phone),
                    const SizedBox(height: 14),
                    _buildInput('Cédula de Identidad (CI)', _ciCtrl, Icons.badge_outlined),
                    const SizedBox(height: 14),
                    _buildInput('Dirección', _direccionCtrl, Icons.home_outlined),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Botón Guardar Cambios Degradado
              Container(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _guardarPerfil,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSaving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Guardar Cambios', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
              const SizedBox(height: 14),

              // Botón Cerrar Sesión
              OutlinedButton.icon(
                onPressed: () async {
                  final auth = context.read<AuthProvider>();
                  final nav = Navigator.of(context);
                  await auth.logout();
                  nav.pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                },
                icon: const Icon(Icons.logout, color: AppColors.error, size: 18),
                label: const Text('Cerrar Sesión', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  backgroundColor: AppColors.surface,
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInput(String label, TextEditingController ctrl, IconData icon, {TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.borderSubtle)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
      validator: (v) => v == null || v.trim().isEmpty ? 'Campo requerido' : null,
    );
  }
}
