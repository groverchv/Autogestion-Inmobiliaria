import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'propiedad_detalle_screen.dart';

/// Pantalla del asistente virtual operativo (IA con tools reales:
/// búsqueda de inmuebles, agendar visitas, estado del usuario).
class AgenteScreen extends StatefulWidget {
  /// Si viene desde el detalle de una propiedad, el agente sabe de qué casa se habla.
  final int? inmuebleId;

  const AgenteScreen({super.key, this.inmuebleId});

  @override
  State<AgenteScreen> createState() => _AgenteScreenState();
}

class _Msg {
  final bool esUsuario;
  final String texto;
  const _Msg(this.esUsuario, this.texto);
}

class _AgenteScreenState extends State<AgenteScreen> {
  final _api = ApiService();
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_Msg> _mensajes = [];
  List<String> _sugerencias = const [
    'Buscar inmuebles en venta',
    '¿Cómo va mi estado?',
    '¿Cómo capturo un recorrido 360°?',
    '¿Cómo agendo una visita?',
  ];
  List<Map<String, dynamic>> _tarjetas = [];
  bool _escribiendo = false;
  bool _escuchando = false;
  bool _sttDisponible = false;
  final stt.SpeechToText _speech = stt.SpeechToText();

  @override
  void initState() {
    super.initState();
    _mensajes.add(const _Msg(false,
        '¡Hola! Soy el asistente de Inmobiliaria 360. Puedo buscar propiedades, '
        'agendar visitas, mostrar tu estado y explicarte cómo usar la app. '
        'Toca el micrófono y háblame si prefieres no escribir.'));
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    _speech.stop();
    super.dispose();
  }

  /// Alterna dictado por voz: al terminar reconoce el texto y lo envía al agente.
  Future<void> _alternarMicrofono() async {
    if (_escuchando) {
      await _speech.stop();
      setState(() => _escuchando = false);
      return;
    }
    if (!_sttDisponible) {
      _sttDisponible = await _speech.initialize(
        onStatus: (status) {
          if ((status == 'done' || status == 'notListening') && mounted) {
            setState(() => _escuchando = false);
          }
        },
        onError: (_) {
          if (mounted) setState(() => _escuchando = false);
        },
      );
    }
    if (!_sttDisponible) {
      if (!mounted) return;
      setState(() {
        _mensajes.add(const _Msg(false,
            'El micrófono no está disponible en este dispositivo.'));
      });
      return;
    }
    setState(() => _escuchando = true);
    await _speech.listen(
      onResult: (result) {
        if (result.finalResult && result.recognizedWords.isNotEmpty) {
          _speech.stop();
          setState(() => _escuchando = false);
          _inputCtrl.text = result.recognizedWords;
          _enviar();
        }
      },
      listenOptions: stt.SpeechListenOptions(
        partialResults: false,
        cancelOnError: true,
        localeId: 'es_ES',
        listenFor: const Duration(seconds: 15),
        pauseFor: const Duration(seconds: 3),
      ),
    );
  }

  void _scrollAbajo() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _enviar([String? textoOverride]) async {
    final pregunta = (textoOverride ?? _inputCtrl.text).trim();
    if (pregunta.isEmpty || _escribiendo) return;
    _inputCtrl.clear();
    setState(() {
      _sugerencias = [];
      _tarjetas = [];
      _mensajes.add(_Msg(true, pregunta));
      _escribiendo = true;
    });
    _scrollAbajo();
    try {
      final data = await _api.agenteChat(
        pregunta,
        historial: _mensajes
            .skip(_mensajes.length > 8 ? _mensajes.length - 8 : 0)
            .map((m) => {
                  'rol': m.esUsuario ? 'usuario' : 'agente',
                  'texto': m.texto.length > 800
                      ? m.texto.substring(0, 800)
                      : m.texto,
                })
            .toList(),
        inmuebleId: widget.inmuebleId,
      );
      if (!mounted) return;
      setState(() {
        _mensajes.add(_Msg(false,
            (data['texto'] as String?) ?? 'Sin respuesta del asistente.'));
        final sugs = data['sugerencias'];
        if (sugs is List && sugs.isNotEmpty) {
          _sugerencias = sugs.map((e) => e.toString()).take(3).toList();
        }
        final tarjetas = data['tarjetas'];
        if (tarjetas is List && tarjetas.isNotEmpty) {
          _tarjetas = tarjetas.whereType<Map<String, dynamic>>().toList();
        }
        if (data['accion'] is Map && data['accion']['tipo'] == 'cita') {
          _mensajes.add(const _Msg(
              false, 'Tu visita quedó registrada — la verás en "Mi agenda".'));
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _mensajes.add(const _Msg(false,
            'El asistente no está disponible ahora. Intenta de nuevo en un momento.'));
      });
    }
    setState(() => _escribiendo = false);
    _scrollAbajo();
  }

  Widget _burbuja(_Msg m) {
    final esUsuario = m.esUsuario;
    return Align(
      alignment: esUsuario ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: esUsuario ? AppColors.primaryDark : AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: esUsuario
              ? null
              : Border.all(color: AppColors.borderSubtle),
        ),
        child: Text(
          m.texto,
          style: const TextStyle(
              color: AppColors.textPrimary, fontSize: 14, height: 1.4),
        ),
      ),
    );
  }

  Widget _tarjeta(Map<String, dynamic> t) {
    final id = t['inmueble_id'];
    return Card(
      color: AppColors.backgroundSecondary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.home_outlined, color: AppColors.primary),
        title: Text(
          t['titulo']?.toString() ?? 'Propiedad',
          style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${t['tipo_oferta'] ?? ''} · ${t['precio'] ?? ''} USD'
          '${(t['zona'] ?? '').toString().isNotEmpty ? ' · ${t['zona']}' : ''}'
          ' · ${t['habitaciones'] ?? 0} hab / ${t['banos'] ?? 0} baños',
          style:
              const TextStyle(color: AppColors.textSecondary, fontSize: 11),
        ),
        onTap: id == null
            ? null
            : () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PropiedadDetalleScreen(inmuebleId: id),
                  ),
                ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundSecondary,
        title: Row(
          children: [
            const Icon(Icons.smart_toy_outlined,
                color: AppColors.primary, size: 22),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Asistente virtual',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary)),
                Text(
                  widget.inmuebleId != null
                      ? 'Preguntando sobre esta propiedad'
                      : 'Busca · agenda · consulta',
                  style: const TextStyle(
                      fontSize: 10, color: AppColors.textMuted),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(14),
              children: [
                ..._mensajes.map(_burbuja),
                ..._tarjetas.map(_tarjeta),
                if (_escuchando)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 6),
                    child: Text('Escuchando… habla ahora.',
                        style: TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                            fontStyle: FontStyle.italic)),
                  ),
                if (_escribiendo)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 6),
                    child: Text('El asistente está escribiendo…',
                        style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                            fontStyle: FontStyle.italic)),
                  ),
                if (_sugerencias.isNotEmpty && !_escribiendo)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _sugerencias
                        .map((s) => ActionChip(
                              label: Text(s,
                                  style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.primary)),
                              backgroundColor: AppColors.surface,
                              side: const BorderSide(
                                  color: AppColors.primaryDark),
                              onPressed: () => _enviar(s),
                            ))
                        .toList(),
                  ),
              ],
            ),
          ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: AppColors.backgroundSecondary,
                border:
                    Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputCtrl,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 14),
                      decoration: const InputDecoration(
                        hintText: 'Escribe tu consulta…',
                        hintStyle:
                            TextStyle(color: AppColors.textMuted),
                        filled: true,
                        fillColor: AppColors.surface,
                        isDense: true,
                        border: OutlineInputBorder(
                          borderRadius:
                              BorderRadius.all(Radius.circular(12)),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onSubmitted: (_) => _enviar(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _alternarMicrofono,
                    icon: Icon(
                      _escuchando ? Icons.mic : Icons.mic_none,
                      size: 20,
                    ),
                    tooltip: _escuchando ? 'Detener dictado' : 'Dictar por voz',
                    style: IconButton.styleFrom(
                      backgroundColor: _escuchando
                          ? AppColors.error
                          : AppColors.surfaceElevated,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _escribiendo ? null : () => _enviar(),
                    icon: const Icon(Icons.send, size: 18),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primaryDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
