import 'package:flutter/material.dart';
import '../config/app_config.dart';

class TerminosCondicionesModal extends StatelessWidget {
  const TerminosCondicionesModal({super.key});

  static void mostrar(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const TerminosCondicionesModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Tirador superior y encabezado
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.gavel_rounded, color: AppColors.primary, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Términos y Condiciones',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close, color: AppColors.textSecondary),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const Divider(height: 1, color: AppColors.borderSubtle),
          const SizedBox(height: 12),

          // Contenido Extenso y Profesional
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildIntroCard(),
                  const SizedBox(height: 14),

                  _buildSection(
                    '1. Identificación y Aceptación de los Términos',
                    'Al registrarse, acceder y utilizar los servicios de la plataforma móvil y web de INMOBILIARIA NOBLEVE, usted declara tener al menos 18 años de edad, contar con plena capacidad jurídica para obligarse y acepta de manera expresa, libre e informada la totalidad de los presentes Términos y Condiciones Generales de Uso, así como nuestras Políticas de Privacidad y Tratamiento de Datos Personales.',
                  ),

                  _buildSection(
                    '2. Naturaleza del Servicio y Autogestión Inmobiliaria',
                    'Inmobiliaria Nobleve provee una infraestructura digital avanzada que facilita la intermediación, publicación de activos, visualización de planos arquitectónicos 3D, tours inmersivos 360° con realidad aumentada/virtual, gestión de agendas y trámites documentales. La plataforma no asume responsabilidad por vicios ocultos de las construcciones, siendo exclusiva responsabilidad de los propietarios publicar información veraz y verificable.',
                  ),

                  _buildSection(
                    '3. Veracidad de la Información y Análisis Legal IA',
                    'El usuario se compromete a ingresar datos auténticos respecto a su identidad (Cédula de Identidad, nombres y datos de contacto). La plataforma incorpora herramientas de auditoría preventiva y análisis legal con Inteligencia Artificial; no obstante, la validación final sobre folios reales y derechos propietarios se encuentra sujeta a las leyes civiles y notariales vigentes.',
                  ),

                  _buildSection(
                    '4. Propiedad Intelectual y Recursos Multimedia 360°',
                    'Todas las marcas, logotipos, interfaces, códigos fuente, recorridos 360°, planos 3D, modelos tridimensionales y algoritmos son propiedad exclusiva de Inmobiliaria Nobleve o se encuentran debidamente licenciados. Queda terminantemente prohibida su reproducción, extracción, ingeniería inversa o uso no autorizado con fines de reventa o competencia desleal.',
                  ),

                  _buildSection(
                    '5. Contratos Digitales, Trámites y Pagos',
                    'Los contratos generados a través del módulo de mensajería y trámites gozan de plena validez de acuerdo a la legislación sobre comercio electrónico y firma digital. Los acuerdos económicos, depósitos de garantía y cánones de alquiler concertados mediante las pasarelas integradas son vinculantes entre las partes intervinientes.',
                  ),

                  _buildSection(
                    '6. Privacidad, Seguridad y Protección de Datos',
                    'Sus datos personales y credenciales de acceso están protegidos mediante cifrado TLS/SSL de alta seguridad y almacenamiento en bóvedas criptográficas. Nobleve no vende ni transfiere su información a terceros sin su consentimiento explícito, salvo requerimiento judicial fundado.',
                  ),

                  _buildSection(
                    '7. Cancelación de Cuentas y Conductas Prohibidas',
                    'La administración se reserva el derecho de suspender o inhabilitar permanentemente a cualquier usuario que incurra en suplantación de identidad, publicaciones fraudulentas, acoso en chats o vulneración de los sistemas informáticos.',
                  ),

                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.backgroundSecondary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Vigencia y Modificaciones',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Última actualización: Agosto 2026. Inmobiliaria Nobleve se reserva el derecho de actualizar los presentes términos para adaptarlos a innovaciones tecnológicas y normativas vigentes.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('He Leído y Comprendido los Términos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIntroCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, color: AppColors.primary, size: 22),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Transparencia, seguridad jurídica e innovación inmersiva para todas sus operaciones inmobiliarias.',
              style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 5),
          Text(
            content,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.45),
            textAlign: TextAlign.justify,
          ),
        ],
      ),
    );
  }
}
