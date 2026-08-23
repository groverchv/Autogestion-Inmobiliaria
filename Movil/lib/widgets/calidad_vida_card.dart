import 'package:flutter/material.dart';
import '../config/app_config.dart';

class CalidadVidaCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const CalidadVidaCard({
    super.key,
    required this.data,
  });

  @override
  Widget build(BuildContext context) {
    final int walkScore = int.tryParse(data['walk_score']?.toString() ?? '0') ?? 0;
    final String clasificacion = data['clasificacion']?.toString() ?? 'Evaluación de Barrio';
    final String descripcion = data['descripcion']?.toString() ?? '';
    final Map<String, dynamic> desglose = data['desglose_categorias'] is Map
        ? Map<String, dynamic>.from(data['desglose_categorias'])
        : {};

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
          // ─── Cabecera con Walk Score ───
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
              // Badge Circular con Score
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

          // ─── Tag de Clasificación y Descripción ───
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

          // ─── Puntos de Interés / Servicios Más Cercanos ───
          const Text(
            'Servicios del Entorno:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),

          if (desglose.isNotEmpty)
            Column(
              children: desglose.entries.map((entry) {
                final cat = entry.value is Map ? entry.value as Map : {};
                final nombre = cat['nombre']?.toString() ?? entry.key;
                final masCercano = cat['mas_cercano'] is Map ? cat['mas_cercano'] as Map : null;
                final int dist = int.tryParse(masCercano?['distancia_metros']?.toString() ?? '0') ?? 0;
                final int min = int.tryParse(masCercano?['minutos_a_pie']?.toString() ?? '0') ?? 0;

                IconData iconData = Icons.place;
                if (entry.key == 'supermercados') iconData = Icons.shopping_bag_outlined;
                if (entry.key == 'salud') iconData = Icons.local_hospital_outlined;
                if (entry.key == 'educacion') iconData = Icons.school_outlined;
                if (entry.key == 'recreacion') iconData = Icons.park_outlined;
                if (entry.key == 'transporte') iconData = Icons.directions_bus_outlined;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(iconData, size: 16, color: AppColors.primary),
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
}
