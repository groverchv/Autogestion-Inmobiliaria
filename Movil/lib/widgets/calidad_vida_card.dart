import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../config/app_config.dart';

class CalidadVidaCard extends StatefulWidget {
  final Map<String, dynamic> data;

  const CalidadVidaCard({
    super.key,
    required this.data,
  });

  @override
  State<CalidadVidaCard> createState() => _CalidadVidaCardState();
}

class _CalidadVidaCardState extends State<CalidadVidaCard> {
  String _filtroCategoria = 'todas';
  bool _mostrarIsocronas = true;

  @override
  Widget build(BuildContext context) {
    final int walkScore = int.tryParse(widget.data['walk_score']?.toString() ?? '0') ?? 0;
    final String clasificacion = widget.data['clasificacion']?.toString() ?? 'Evaluación de Barrio';
    final String descripcion = widget.data['descripcion']?.toString() ?? '';
    final Map<String, dynamic> desglose = widget.data['desglose_categorias'] is Map
        ? Map<String, dynamic>.from(widget.data['desglose_categorias'])
        : {};
    final List<dynamic> todosPois = widget.data['puntos_de_interes'] is List
        ? widget.data['puntos_de_interes']
        : [];

    Color scoreColor = const Color(0xFF0284C7);
    if (walkScore >= 88) {
      scoreColor = const Color(0xFF10B981);
    } else if (walkScore >= 70) {
      scoreColor = const Color(0xFF0EA5E9);
    } else if (walkScore >= 50) {
      scoreColor = const Color(0xFFF59E0B);
    } else {
      scoreColor = const Color(0xFF64748B);
    }

    // Centro geográfico del inmueble
    double centroLat = -17.7833;
    double centroLng = -63.1821;
    if (widget.data['coordenadas_centro'] is Map) {
      centroLat = (widget.data['coordenadas_centro']['lat'] as num? ?? -17.7833).toDouble();
      centroLng = (widget.data['coordenadas_centro']['lng'] as num? ?? -63.1821).toDouble();
    }

    // Filtrar POIs para el radar y para la lista
    final List<dynamic> poisFiltrados = _filtroCategoria == 'todas'
        ? todosPois
        : todosPois.where((p) => p['categoria'] == _filtroCategoria).toList();


    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. Cabecera con Walk Score ───
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.directions_walk, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Calidad de Vida & Walk Score',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Cercanía y tiempos a pie a servicios clave',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              // Badge con Walk Score
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: scoreColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: scoreColor),
                ),
                child: Column(
                  children: [
                    Text(
                      '$walkScore',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: scoreColor),
                    ),
                    const Text(
                      'de 100',
                      style: TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // ─── 2. Tag de Clasificación y Descripción ───
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: scoreColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: scoreColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.auto_awesome, color: scoreColor, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '$clasificacion: $descripcion',
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ─── 3. Filtros Interactivos por Categoría ───
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFiltroChip('todas', 'Todos (${todosPois.length})', Icons.layers_outlined),
                _buildFiltroChip('supermercados', 'Supermercados', Icons.shopping_bag_outlined),
                _buildFiltroChip('salud', 'Salud', Icons.local_hospital_outlined),
                _buildFiltroChip('educacion', 'Educación', Icons.school_outlined),
                _buildFiltroChip('recreacion', 'Parques', Icons.park_outlined),
                _buildFiltroChip('transporte', 'Transporte', Icons.directions_bus_outlined),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Toggle de Isocronas a pie
          InkWell(
            onTap: () => setState(() => _mostrarIsocronas = !_mostrarIsocronas),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _mostrarIsocronas ? const Color(0xFF0284C7).withValues(alpha: 0.15) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _mostrarIsocronas ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.radar, size: 14, color: _mostrarIsocronas ? const Color(0xFF38BDF8) : Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    'Isocronas a pie (5 y 10 min)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _mostrarIsocronas ? const Color(0xFF38BDF8) : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // ─── 4. Mapa Cartográfico Completo con Calles (OpenStreetMap Raster) ───
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              height: 250,
              width: double.infinity,
              color: const Color(0xFFE5E7EB),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Capa Base de Mapa con Calles reales (OpenStreetMap / CartoDB Voyager)
                  Positioned.fill(
                    child: Image.network(
                      'https://staticmap.openstreetmap.de/staticmap.php?center=$centroLat,$centroLng&zoom=16&size=600x300&maptype=mapnik',
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Image.network(
                          'https://tile.openstreetmap.org/16/${_lon2tile(centroLng, 16)}/${_lat2tile(centroLat, 16)}.png',
                          fit: BoxFit.cover,
                          errorBuilder: (ctx, err, stack) => Container(
                            color: const Color(0xFF0F172A),
                            child: const Center(
                              child: Text('Cargando calles de OpenStreetMap...', style: TextStyle(color: Colors.white, fontSize: 11)),
                            ),
                          ),
                        );
                      },
                    ),
                  ),


                  // Capa de Isocronas a pie y Rutas vectoriales sobre el mapa
                  if (_mostrarIsocronas)
                    CustomPaint(
                      size: const Size(double.infinity, 250),
                      painter: _CartographicIsochronesPainter(),
                    ),

                  // Pin Central del Inmueble (Casa Principal)
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2.5),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.4),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.home, color: Colors.white, size: 20),
                  ),

                  // Pines flotantes de los POIs con iconografía y nombres
                  ...poisFiltrados.map((poi) {
                    final double poiLat = (poi['lat'] as num? ?? centroLat).toDouble();
                    final double poiLng = (poi['lng'] as num? ?? centroLng).toDouble();
                    
                    // Conversión de grados GPS a píxeles en el canvas a zoom 16
                    // A zoom 16: ~0.005 grados lat/lng equivalen a ~100 píxeles
                    final double dLat = (poiLat - centroLat);
                    final double dLng = (poiLng - centroLng);
                    final double posX = (dLng * 22000).clamp(-140.0, 140.0);
                    final double posY = (-dLat * 25000).clamp(-100.0, 100.0);

                    final Color catColor = _obtenerColorCategoria(poi['categoria']?.toString());
                    final IconData catIcon = _obtenerIconoCategoria(poi['categoria']?.toString());

                    return Transform.translate(
                      offset: Offset(posX, posY),
                      child: Tooltip(
                        message: "${poi['nombre']} (${poi['distancia_metros']}m / ~${poi['minutos_a_pie']} min)",
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: catColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.35),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(catIcon, color: Colors.white, size: 14),
                        ),
                      ),
                    );
                  }),

                  // Badge Atribución Cartográfica de OpenStreetMap
                  Positioned(
                    bottom: 6,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: const Text(
                        '© OpenStreetMap contributors',
                        style: TextStyle(color: Color(0xFF1E293B), fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),


          const SizedBox(height: 16),

          // ─── 5. Tarjetas Horizontales de Servicios Destacados ───
          Text(
            'Lugares y Servicios en el Barrio (${poisFiltrados.length})',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),

          if (poisFiltrados.isNotEmpty)
            SizedBox(
              height: 80,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: poisFiltrados.length,
                separatorBuilder: (context, index) => const SizedBox(width: 10),
                itemBuilder: (context, idx) {

                  final poi = poisFiltrados[idx];
                  final String nombre = poi['nombre']?.toString() ?? 'Punto de Interés';
                  final String tipo = poi['tipo']?.toString() ?? 'Servicio';
                  final num distNum = poi['distancia_metros'] as num? ?? 0;
                  final num minNum = poi['minutos_a_pie'] as num? ?? 1;
                  final Color catColor = _obtenerColorCategoria(poi['categoria']?.toString());
                  final IconData catIcon = _obtenerIconoCategoria(poi['categoria']?.toString());

                  return Container(
                    width: 210,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: catColor.withValues(alpha: 0.4)),
                          ),
                          child: Icon(catIcon, color: catColor, size: 18),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                nombre,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                tipo,
                                style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${distNum.round()} m • ~$minNum min a pie',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: catColor),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

          const SizedBox(height: 16),

          // ─── 6. Desglose Detallado por Categoría ───
          if (desglose.isNotEmpty)
            Column(
              children: desglose.entries.map((entry) {
                final cat = entry.value is Map ? entry.value as Map : {};
                final nombre = cat['nombre']?.toString() ?? entry.key;
                final masCercano = cat['mas_cercano'] is Map ? cat['mas_cercano'] as Map : null;
                final int dist = masCercano != null && masCercano['distancia_metros'] != null
                    ? (masCercano['distancia_metros'] is num
                        ? (masCercano['distancia_metros'] as num).round()
                        : (double.tryParse(masCercano['distancia_metros'].toString())?.round() ?? 0))
                    : 0;
                final int min = masCercano != null && masCercano['minutos_a_pie'] != null
                    ? (masCercano['minutos_a_pie'] is num
                        ? (masCercano['minutos_a_pie'] as num).round()
                        : (int.tryParse(masCercano['minutos_a_pie'].toString()) ?? 0))
                    : 0;

                final IconData iconData = _obtenerIconoCategoria(entry.key);
                final Color catColor = _obtenerColorCategoria(entry.key);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(iconData, size: 16, color: catColor),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          nombre,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ),
                      if (masCercano != null)
                        Text(
                          '${dist}m (~$min min)',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        )
                      else
                        const Text(
                          'No registrado',
                          style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildFiltroChip(String key, String label, IconData icon) {
    final bool seleccionado = _filtroCategoria == key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        avatar: Icon(icon, size: 14, color: seleccionado ? Colors.white : Colors.grey[400]),
        label: Text(label),
        labelStyle: TextStyle(
          fontSize: 11,
          fontWeight: seleccionado ? FontWeight.bold : FontWeight.normal,
          color: seleccionado ? Colors.white : Colors.grey[300],
        ),
        selected: seleccionado,
        selectedColor: const Color(0xFF0284C7),
        backgroundColor: const Color(0xFF0F172A),
        side: BorderSide(color: seleccionado ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
        onSelected: (val) {
          if (val) setState(() => _filtroCategoria = key);
        },
      ),
    );
  }

  int _lon2tile(double lon, int zoom) {
    return ((lon + 180.0) / 360.0 * (1 << zoom)).floor();
  }

  int _lat2tile(double lat, int zoom) {
    return ((1.0 - math.log(math.tan(lat * math.pi / 180.0) + 1.0 / math.cos(lat * math.pi / 180.0)) / math.pi) / 2.0 * (1 << zoom)).floor();
  }

  Color _obtenerColorCategoria(String? cat) {
    switch (cat) {
      case 'supermercados': return const Color(0xFF10B981);
      case 'salud': return const Color(0xFFEF4444);
      case 'educacion': return const Color(0xFF8B5CF6);
      case 'recreacion': return const Color(0xFF14B8A6);
      case 'transporte': return const Color(0xFFF59E0B);
      default: return const Color(0xFF38BDF8);
    }
  }

  IconData _obtenerIconoCategoria(String? cat) {
    switch (cat) {
      case 'supermercados': return Icons.shopping_bag_outlined;
      case 'salud': return Icons.local_hospital_outlined;
      case 'educacion': return Icons.school_outlined;
      case 'recreacion': return Icons.park_outlined;
      case 'transporte': return Icons.directions_bus_outlined;
      default: return Icons.place_outlined;
    }
  }
}

/// CustomPainter para dibujar círculos de isocronas a pie sobre el mapa de calles
class _CartographicIsochronesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Isocrona 1: 5 minutos a pie (~400 metros)
    final iso5Paint = Paint()
      ..color = const Color(0xFF10B981).withValues(alpha: 0.18)
      ..style = PaintingStyle.fill;
    final iso5Border = Paint()
      ..color = const Color(0xFF059669)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    canvas.drawCircle(center, 55, iso5Paint);
    canvas.drawCircle(center, 55, iso5Border);

    // Isocrona 2: 10 minutos a pie (~800 metros)
    final iso10Paint = Paint()
      ..color = const Color(0xFF0284C7).withValues(alpha: 0.10)
      ..style = PaintingStyle.fill;
    final iso10Border = Paint()
      ..color = const Color(0xFF0284C7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    canvas.drawCircle(center, 105, iso10Paint);
    canvas.drawCircle(center, 105, iso10Border);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}


