import 'package:flutter/material.dart';
import '../config/app_config.dart';

class PoliticaPrivacidadModal extends StatelessWidget {
  const PoliticaPrivacidadModal({super.key});

  static void mostrar(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const PoliticaPrivacidadModal(),
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
                  Icon(Icons.privacy_tip_outlined, color: AppColors.primary, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Política de Privacidad',
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

          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildIntroCard(),
                  const SizedBox(height: 14),

                  _buildSection(
                    '1. Responsable del Tratamiento de Datos',
                    'INMOBILIARIA NOBLEVE, con operaciones en Santa Cruz de la Sierra, Bolivia, es la responsable del tratamiento de los datos personales que usted proporciona al registrarse y utilizar la plataforma web y móvil. Contacto de privacidad: groverchoquevillca80@gmail.com.',
                  ),

                  _buildSection(
                    '2. Datos Personales que Recolectamos',
                    'Al registrarse recolectamos: nombre y apellido, cédula de identidad, correo electrónico, número de teléfono y fecha de nacimiento (verificación de mayoría de edad). Durante el uso de la plataforma podemos además almacenar: publicaciones de inmuebles, fotografías, recorridos 360°, coordenadas geográficas de las propiedades, conversaciones de chat, contratos, comprobantes de pago y registros de actividad.',
                  ),

                  _buildSection(
                    '3. Finalidad del Tratamiento',
                    'Sus datos se utilizan exclusivamente para: autenticar su identidad y gestionar su cuenta, publicar y administrar inmuebles, generar contratos digitales, procesar suscripciones y pagos, agendar citas, enviar notificaciones del servicio, y mejorar la seguridad antifraude de la plataforma. No utilizamos sus datos con fines publicitarios de terceros.',
                  ),

                  _buildSection(
                    '4. Ubicación, Cámara y Recorridos 360°',
                    'La aplicación solicita acceso a la ubicación y a la cámara únicamente para funcionalidades explícitas: georreferenciar inmuebles, capturar fotografías y generar tours 360°/realidad aumentada. Ninguna imagen o coordenada se sube sin su acción directa. Puede revocar estos permisos desde los ajustes de su dispositivo.',
                  ),

                  _buildSection(
                    '5. Servicios de Terceros',
                    'Para operar la plataforma compartimos los datos estrictamente necesarios con proveedores tecnológicos: alojamiento y base de datos (AWS / Supabase), almacenamiento de imágenes (Cloudinary), procesamiento de pagos (Stripe, que recibe únicamente los datos de la transacción) y servicios de correo transaccional. Estos proveedores tratan los datos bajo sus propias políticas de seguridad.',
                  ),

                  _buildSection(
                    '6. Seguridad de la Información',
                    'Aplicamos cifrado TLS/SSL en tránsito, almacenamiento de credenciales en bóveda segura del dispositivo y controles de acceso por roles. Ningún método es infalible; ante un incidente de seguridad que afecte sus datos será notificado en los plazos que exige la normativa aplicable.',
                  ),

                  _buildSection(
                    '7. Sus Derechos',
                    'Usted puede ejercer en cualquier momento sus derechos de acceso, rectificación, actualización, eliminación y oposición al tratamiento de sus datos personales, así como solicitar la eliminación definitiva de su cuenta y contenido asociado escribiendo a groverchoquevillca80@gmail.com.',
                  ),

                  _buildSection(
                    '8. Retención y Edad Mínima',
                    'Conservamos sus datos mientras su cuenta esté activa y durante los plazos legales que requieran las obligaciones contractuales y fiscales. La plataforma está dirigida exclusivamente a personas mayores de 18 años; no recolectamos deliberadamente datos de menores de edad.',
                  ),

                  _buildSection(
                    '9. Transferencias y Verificación Blockchain',
                    'Cuando una escritura o verificación de título se registra en blockchain, únicamente se almacena una huella criptográfica (hash) del documento — nunca el documento completo ni sus datos personales en texto plano.',
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
                          'Última actualización: Noviembre 2026. Cualquier cambio sustancial en esta política será notificado dentro de la aplicación antes de su entrada en vigor.',
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
              child: const Text('He Leído la Política de Privacidad', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
          Icon(Icons.lock_outline, color: AppColors.primary, size: 22),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Su privacidad es prioritaria: esta política explica qué datos recolectamos, para qué y cómo ejercer sus derechos.',
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
