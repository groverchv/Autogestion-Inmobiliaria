import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';

class MisMensajesScreen extends StatefulWidget {
  const MisMensajesScreen({super.key});

  @override
  State<MisMensajesScreen> createState() => _MisMensajesScreenState();
}

class _MisMensajesScreenState extends State<MisMensajesScreen> {
  List<ChatItem> _chats = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _cargarChats();
  }

  Future<void> _cargarChats() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final currentUserId = auth.user?.id ?? 0;
    try {
      final list = await auth.apiService.getChats(currentUserId);
      if (mounted) {
        setState(() {
          _chats = list;
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

  void _abrirSalaChat(ChatItem chat) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SalaChatScreen(chat: chat),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _cargarChats,
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

    if (_chats.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline, size: 54, color: AppColors.textMuted),
            SizedBox(height: 12),
            Text(
              'No tienes conversaciones activas',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            SizedBox(height: 4),
            Text(
              'Contacta al dueño desde cualquier inmueble',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _chats.length,
      separatorBuilder: (context, index) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final chat = _chats[index];
        return Container(
          decoration: BoxDecoration(
            gradient: AppColors.darkCardGradient,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: AppColors.primaryGradient,
              ),
              padding: const EdgeInsets.all(2),
              child: CircleAvatar(
                radius: 22,
                backgroundColor: AppColors.surface,
                child: Text(
                  chat.otroUsuarioNombre.isNotEmpty ? chat.otroUsuarioNombre[0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 18),
                ),
              ),
            ),
            title: Text(
              chat.otroUsuarioNombre,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
            ),
            subtitle: Text(
              chat.ultimoMensaje.isNotEmpty ? chat.ultimoMensaje : 'Conversación iniciada',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            trailing: chat.noLeidos > 0
                ? Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${chat.noLeidos}',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  )
                : const Icon(Icons.chevron_right, color: AppColors.textMuted),
            onTap: () => _abrirSalaChat(chat),
          ),
        );
      },
    );
  }
}

class SalaChatScreen extends StatefulWidget {
  final ChatItem chat;

  const SalaChatScreen({super.key, required this.chat});

  @override
  State<SalaChatScreen> createState() => _SalaChatScreenState();
}

class _SalaChatScreenState extends State<SalaChatScreen> {
  List<MensajeItem> _mensajes = [];
  bool _isLoading = true;
  final TextEditingController _msgController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargarMensajes();
  }

  Future<void> _cargarMensajes() async {
    final api = context.read<AuthProvider>().apiService;
    final list = await api.getMensajesChat(widget.chat.id);
    if (mounted) {
      setState(() {
        _mensajes = list;
        _isLoading = false;
      });
    }
  }

  Future<void> _enviarTexto(String text) async {
    if (text.trim().isEmpty) return;
    _msgController.clear();
    final api = context.read<AuthProvider>().apiService;
    final ok = await api.enviarMensaje(chatId: widget.chat.id, contenido: text.trim());
    if (ok) {
      _cargarMensajes();
    }
  }

  void _mostrarOpcionesAccion() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Acciones y Trámites en Chat', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 14),

              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
                leading: const CircleAvatar(backgroundColor: Color(0xFF0C4A6E), child: Icon(Icons.payments_outlined, color: AppColors.primary)),
                title: const Text('Solicitar / Notificar Pago', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                subtitle: const Text('Genera recibo o recordatorio de mensualidad', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _abrirDialogoPago();
                },
              ),
              const SizedBox(height: 10),

              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
                leading: const CircleAvatar(backgroundColor: Color(0xFF064E3B), child: Icon(Icons.description_outlined, color: AppColors.success)),
                title: const Text('Compartir Estado de Contrato', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                subtitle: const Text('Envía ficha para firma digital del contrato', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _enviarTexto('[CONTRATO DIGITAL] Adjunto referencia para revisión y firma de contrato.');
                },
              ),
              const SizedBox(height: 10),

              ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
                leading: const CircleAvatar(backgroundColor: Color(0xFF4C1D95), child: Icon(Icons.threesixty, color: Color(0xFFA855F7))),
                title: const Text('Conceder Acceso al Recorrido 360°', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
                subtitle: const Text('Otorga permiso temporal de exploración inmersiva 360°/VR', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _enviarTexto('[ACCESO 360°] Acceso habilitado para recorrer la propiedad en 360° y Realidad Virtual.');
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _abrirDialogoPago() {
    final montoCtrl = TextEditingController(text: '2800');
    final motivoCtrl = TextEditingController(text: 'Pago de Alquiler mensual');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Notificar Pago', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: montoCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Monto (Bs.)', prefixIcon: Icon(Icons.attach_money, color: AppColors.primary)),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: motivoCtrl,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(labelText: 'Concepto / Motivo', prefixIcon: Icon(Icons.receipt_outlined, color: AppColors.primary)),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar', style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _enviarTexto('[SOLICITUD DE PAGO] Concepto: ${motivoCtrl.text.trim()} | Monto: Bs. ${montoCtrl.text.trim()}');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
            child: const Text('Enviar al Chat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final currentUserId = auth.user?.id ?? 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.chat.otroUsuarioNombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
        backgroundColor: AppColors.backgroundSecondary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: AppColors.primary),
            onPressed: _mostrarOpcionesAccion,
          ),
        ],
      ),
      body: Column(
        children: [
          // ─── Barra de Accesos Rápidos Superior en Chat (Dark) ───
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.backgroundSecondary,
              border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
            ),
            child: Row(
              children: [
                _buildQuickActionChip(Icons.payments_outlined, 'Pago', AppColors.primary, _abrirDialogoPago),
                const SizedBox(width: 8),
                _buildQuickActionChip(Icons.description_outlined, 'Contrato', AppColors.success, () {
                  _enviarTexto('[CONTRATO DIGITAL] Solicito revisión del contrato.');
                }),
                const SizedBox(width: 8),
                _buildQuickActionChip(Icons.threesixty, 'Acceso 360°', const Color(0xFFA855F7), () {
                  _enviarTexto('[ACCESO 360°] Acceso a recorrido 360° habilitado.');
                }),
              ],
            ),
          ),

          // ─── Mensajes en Dark Mode ───
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _mensajes.length,
                    itemBuilder: (context, index) {
                      final m = _mensajes[index];
                      final bool soyYo = m.remitenteId == currentUserId;
                      final bool isEspecial = m.contenido.startsWith('[ACCESO 360°]') ||
                          m.contenido.startsWith('[CONTRATO DIGITAL]') ||
                          m.contenido.startsWith('[SOLICITUD DE PAGO]');

                      return Align(
                        alignment: soyYo ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                          decoration: BoxDecoration(
                            gradient: isEspecial
                                ? const LinearGradient(
                                    colors: [Color(0xFF064E3B), Color(0xFF047857)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                : (soyYo ? AppColors.primaryGradient : AppColors.darkCardGradient),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isEspecial
                                  ? const Color(0xFF34D399)
                                  : (soyYo ? AppColors.primary : AppColors.border),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.3),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (isEspecial) ...[
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      m.contenido.startsWith('[ACCESO 360°]')
                                          ? Icons.threesixty
                                          : (m.contenido.startsWith('[SOLICITUD DE PAGO]')
                                              ? Icons.payments_outlined
                                              : Icons.description_outlined),
                                      size: 16,
                                      color: Colors.white,
                                    ),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'TRÁMITE INMOBILIARIO',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                              ],
                              Text(
                                m.contenido,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: isEspecial ? FontWeight.w600 : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // ─── Input de Chat Dark ───
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: AppColors.backgroundSecondary,
              border: Border(top: BorderSide(color: AppColors.borderSubtle)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, color: AppColors.primary, size: 24),
                  tooltip: 'Opciones de Trámite',
                  onPressed: _mostrarOpcionesAccion,
                ),
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                    onSubmitted: (v) => _enviarTexto(v),
                    decoration: InputDecoration(
                      hintText: 'Escribe un mensaje...',
                      hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                      filled: true,
                      fillColor: AppColors.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: AppColors.border)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: const BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: () => _enviarTexto(_msgController.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionChip(IconData icon, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
