import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../providers/auth_provider.dart';
import '../widgets/terminos_condiciones_modal.dart';
import '../widgets/politica_privacidad_modal.dart';

class RegistroScreen extends StatefulWidget {
  const RegistroScreen({super.key});

  @override
  State<RegistroScreen> createState() => _RegistroScreenState();
}

class _RegistroScreenState extends State<RegistroScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nombreCtrl = TextEditingController();
  final TextEditingController _apellidoCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _telefonoCtrl = TextEditingController();
  final TextEditingController _ciCtrl = TextEditingController();
  final TextEditingController _passwordCtrl = TextEditingController();
  final TextEditingController _confirmPassCtrl = TextEditingController();

  DateTime? _fechaNacimiento;
  bool _aceptaTerminos = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _emailCtrl.dispose();
    _telefonoCtrl.dispose();
    _ciCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _seleccionarFechaNacimiento() async {
    final DateTime hoy = DateTime.now();
    final DateTime limite18Anos = DateTime(hoy.year - 18, hoy.month, hoy.day);
    
    final picked = await showDatePicker(
      context: context,
      initialDate: _fechaNacimiento ?? limite18Anos,
      firstDate: DateTime(1920),
      lastDate: hoy,
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.surface,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      if (picked.isAfter(limite18Anos)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Debes ser mayor de 18 años para registrarte.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }
      setState(() => _fechaNacimiento = picked);
    }
  }

  Future<void> _ejecutarRegistro() async {
    if (!_formKey.currentState!.validate()) return;

    if (_fechaNacimiento == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona tu fecha de nacimiento'), backgroundColor: AppColors.error),
      );
      return;
    }

    if (!_aceptaTerminos) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debes leer y aceptar los Términos y la Política de Privacidad para continuar.'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    if (_passwordCtrl.text != _confirmPassCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Las contraseñas no coinciden'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _isLoading = true);
    final auth = context.read<AuthProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    final fechaStr = '${_fechaNacimiento!.year}-${_fechaNacimiento!.month.toString().padLeft(2, '0')}-${_fechaNacimiento!.day.toString().padLeft(2, '0')}';

    final ok = await auth.register({
      'email': _emailCtrl.text.trim(),
      'first_name': _nombreCtrl.text.trim(),
      'last_name': _apellidoCtrl.text.trim(),
      'password': _passwordCtrl.text,
      'telefono': _telefonoCtrl.text.trim(),
      'ci': _ciCtrl.text.trim(),
      'nacimiento': fechaStr,
      'rol': 'usuario',
    });

    if (mounted) {
      setState(() => _isLoading = false);
      if (ok) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('¡Cuenta creada exitosamente! Iniciando sesión...'),
            backgroundColor: AppColors.success,
          ),
        );
        // Login automático tras registro exitoso
        await auth.login(_emailCtrl.text.trim(), _passwordCtrl.text);
        if (mounted) {
          nav.pop(); // Volver al flujo principal autenticado
        }
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Error al registrar usuario'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Crear Cuenta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.textPrimary)),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header Logo
                Center(
                  child: SizedBox(
                    height: 70,
                    child: Image.asset(
                      'assets/images/logo_dark.png',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 50,
                        height: 50,
                        decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppColors.primaryGradient),
                        child: const Icon(Icons.domain, color: Colors.white),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Center(
                  child: Text(
                    'Únete a Inmobiliaria Nobleve',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                ),
                const Center(
                  child: Text(
                    'Accede a tours 360°, contratos digitales y autogestión',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 24),

                // Form Container Dark
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: AppColors.darkCardGradient,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _buildInput('Nombre', _nombreCtrl, Icons.person_outline)),
                          const SizedBox(width: 10),
                          Expanded(child: _buildInput('Apellido', _apellidoCtrl, Icons.person_outline)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      _buildInput('Correo Electrónico', _emailCtrl, Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(child: _buildInput('Cédula (CI)', _ciCtrl, Icons.badge_outlined)),
                          const SizedBox(width: 10),
                          Expanded(child: _buildInput('Teléfono / Celular', _telefonoCtrl, Icons.phone_outlined, keyboardType: TextInputType.phone)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Selector de Fecha de Nacimiento
                      InkWell(
                        onTap: _seleccionarFechaNacimiento,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.cake_outlined, color: AppColors.primary, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _fechaNacimiento != null
                                      ? 'Nacimiento: ${_fechaNacimiento!.day}/${_fechaNacimiento!.month}/${_fechaNacimiento!.year}'
                                      : 'Fecha de Nacimiento (+18 años)',
                                  style: TextStyle(
                                    color: _fechaNacimiento != null ? AppColors.textPrimary : AppColors.textMuted,
                                    fontSize: 13,
                                    fontWeight: _fechaNacimiento != null ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ),
                              const Icon(Icons.calendar_month, color: AppColors.textMuted, size: 18),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Contraseñas
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscurePassword,
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Contraseña (mínimo 8 caracteres)',
                          labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.primary, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          filled: true,
                          fillColor: AppColors.surface,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                        validator: (v) => v == null || v.length < 8 ? 'Mínimo 8 caracteres' : null,
                      ),
                      const SizedBox(height: 14),

                      TextFormField(
                        controller: _confirmPassCtrl,
                        obscureText: _obscureConfirm,
                        style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                        decoration: InputDecoration(
                          labelText: 'Confirmar Contraseña',
                          labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          prefixIcon: const Icon(Icons.lock_reset, color: AppColors.primary, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 18),
                            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          ),
                          filled: true,
                          fillColor: AppColors.surface,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                        validator: (v) => v != _passwordCtrl.text ? 'Las contraseñas no coinciden' : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Checkbox de Términos y Condiciones
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _aceptaTerminos ? AppColors.primary.withValues(alpha: 0.5) : AppColors.borderSubtle,
                    ),
                  ),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _aceptaTerminos,
                        activeColor: AppColors.primary,
                        onChanged: (v) => setState(() => _aceptaTerminos = v ?? false),
                      ),
                      Expanded(
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            const Text('He leído y acepto los ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            InkWell(
                              onTap: () => TerminosCondicionesModal.mostrar(context),
                              child: const Text(
                                'Términos y Condiciones',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                            const Text(' y la ', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            InkWell(
                              onTap: () => PoliticaPrivacidadModal.mostrar(context),
                              child: const Text(
                                'Política de Privacidad',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Botón Registrarse Degradado
                Container(
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _ejecutarRegistro,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Crear Cuenta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 16),

                // Enlace a Login
                Center(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: RichText(
                      text: const TextSpan(
                        text: '¿Ya tienes una cuenta? ',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                        children: [
                          TextSpan(
                            text: 'Inicia Sesión',
                            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInput(String label, TextEditingController ctrl, IconData icon, {TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
        prefixIcon: Icon(icon, color: AppColors.primary, size: 20),
        filled: true,
        fillColor: AppColors.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
      validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
    );
  }
}
