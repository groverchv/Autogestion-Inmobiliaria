-- ─────────────────────────────────────────────────────────────────
-- V2: Datos semilla del sitio corporativo
-- ─────────────────────────────────────────────────────────────────

-- Configuración general del sitio (editable desde /admin/contenido)
INSERT INTO config_sitio (clave, valor) VALUES
    ('empresa_nombre',      'Inmobiliaria 360'),
    ('empresa_eslogan',     'Autogestión inmobiliaria con IA y Realidad Aumentada'),
    ('empresa_descripcion', 'Plataforma integral para la administración, auditoría pericial y exploración inmersiva de propiedades.'),
    ('contacto_telefono',   '+591 64526763'),
    ('contacto_whatsapp',   '59164526763'),
    ('contacto_email',      'groverchoquevillca80@gmail.com'),
    ('contacto_direccion',  'Av. Ejemplo 123, Santa Cruz de la Sierra'),
    ('horario_atencion',    'Lun - Vie: 8:30 - 18:30 | Sáb: 9:00 - 13:00'),
    ('social_facebook',     'https://facebook.com/inmobiliaria360'),
    ('social_instagram',    'https://instagram.com/inmobiliaria360'),
    ('social_linkedin',     'https://linkedin.com/company/inmobiliaria360'),
    ('social_youtube',      ''),
    ('social_tiktok',       ''),
    ('stats_anios',         '8'),
    ('stats_propiedades',   '340'),
    ('stats_clientes',      '1250'),
    ('stats_ciudades',      '4'),
    ('home_cta_titulo',     'Encuentra tu próximo hogar con tecnología 360°'),
    ('home_cta_texto',      'Explora propiedades verificadas con recorridos virtuales, mediciones con IA y acompañamiento profesional de principio a fin.');

-- Banners del hero
INSERT INTO banner (titulo, subtitulo, imagen_url, cta_texto, cta_url, orden, activo) VALUES
    ('Tu propiedad, en 360 grados', 'Recorridos virtuales, mediciones con IA y valuación inteligente en una sola plataforma.', NULL, 'Ver propiedades', '/propiedades', 1, TRUE),
    ('Vende con respaldo profesional', 'Peritaje fotográfico, verificación de títulos y contratos auditados en blockchain.', NULL, 'Publica tu propiedad', '/vende-tu-propiedad', 2, TRUE),
    ('Confianza verificada', 'Cada propiedad pasa por auditoría documental y validación antifraudulenta.', NULL, 'Conócenos', '/nosotros', 3, TRUE);

-- Servicios
INSERT INTO servicio (titulo, descripcion, icono, orden, activo) VALUES
    ('Venta de propiedades', 'Comercialización de casas, departamentos y terrenos con exposición 360° y valuación asistida por IA.', 'home', 1, TRUE),
    ('Alquiler y anticrético', 'Gestión integral de alquileres y anticréticos con contratos verificados y garantías auditadas.', 'key-round', 2, TRUE),
    ('Recorridos virtuales 360°', 'Tours inmersivos con mediciones reales, cotas en realidad aumentada y guía por voz.', 'rotate-3d', 3, TRUE),
    ('Valuación inteligente', 'Estimación de precio de mercado con modelos de machine learning entrenados en el mercado local.', 'trending-up', 4, TRUE),
    ('Verificación legal', 'Auditoría de títulos en DDRR, detección de fraude documental y registro en blockchain.', 'shield-check', 5, TRUE),
    ('Administración de alquileres', 'Cobranza, mantenimiento predictivo y reportes mensuales para propietarios.', 'building-2', 6, TRUE);

-- Testimonios
INSERT INTO testimonio (nombre_cliente, cargo, texto, estrellas, orden, activo) VALUES
    ('María Fernández', 'Compró su departamento', 'El recorrido virtual 360° me ahorró semanas de visitas. Cuando fui a ver el departamento ya sabía exactamente qué esperar.', 5, 1, TRUE),
    ('Carlos Mendoza', 'Propietario', 'Publicaron mi casa con tour virtual y la vendí en tres semanas. La valuación con IA fue sorprendentemente precisa.', 5, 2, TRUE),
    ('Lucía Vargas', 'Inquilina', 'El contrato digital verificado en blockchain me dio total tranquilidad. Todo el proceso fue transparente.', 5, 3, TRUE),
    ('Jorge Salinas', 'Inversionista', 'Los reportes de calidad de vida del barrio con datos reales me ayudaron a decidir dónde invertir.', 4, 4, TRUE);

-- Equipo
INSERT INTO miembro_equipo (nombre, cargo, bio, orden, activo) VALUES
    ('Directora General', 'CEO & Fundadora', 'Más de 12 años liderando transformación digital en el sector inmobiliario boliviano.', 1, TRUE),
    ('Gerente Comercial', 'Gerente de Ventas', 'Especialista en negociación y cierre de operaciones de alto valor.', 2, TRUE),
    ('Líder de Tecnología', 'CTO', 'Arquitecto de la plataforma de autogestión con IA y realidad aumentada.', 3, TRUE),
    ('Asesora Legal', 'Departamento Legal', 'Verificación de títulos, contratos y cumplimiento normativo en DDRR.', 4, TRUE);

-- FAQs
INSERT INTO faq (pregunta, respuesta, orden, activo) VALUES
    ('¿Qué es el recorrido virtual 360°?', 'Es un tour inmersivo de la propiedad capturado con fotografía panorámica. Puedes recorrer cada ambiente, ver mediciones reales con realidad aumentada y escuchar una guía por voz, todo desde tu navegador o celular.', 1, TRUE),
    ('¿Cómo publico mi propiedad?', 'Regístrate en nuestra plataforma de autogestión, sube las fotos y nuestro equipo verifica la documentación. En menos de 48 horas tu propiedad está en línea con tour virtual.', 2, TRUE),
    ('¿Los precios mostrados son finales?', 'Los precios publicados son de referencia del propietario. Nuestro valuador inteligente te indica si el precio está dentro del rango de mercado para que negocies con información real.', 3, TRUE),
    ('¿Qué es la verificación de títulos?', 'Auditamos la documentación legal de cada propiedad en Derechos Reales y detectamos inconsistencias con modelos antifraudes. Las propiedades verificadas muestran un sello distintivo.', 4, TRUE),
    ('¿Cómo funcionan las citas para visitar una propiedad?', 'Desde cada publicación puedes solicitar una visita presencial o un recorrido guiado remoto. Nuestro equipo coordina el horario directamente contigo.', 5, TRUE);

-- Oficinas
INSERT INTO oficina (nombre, direccion, ciudad, telefono, email, horario, lat, lng, principal, activo) VALUES
    ('Casa Matriz', 'Av. Ejemplo 123, Equipetrol', 'Santa Cruz de la Sierra', '+591 64526763', 'groverchoquevillca80@gmail.com', 'Lun - Vie: 8:30 - 18:30 | Sáb: 9:00 - 13:00', -17.7833, -63.1821, TRUE, TRUE),
    ('Sucursal La Paz', 'Calle Ejemplo 456, Sopocachi', 'La Paz', '+591 64526763', 'groverchoquevillca80@gmail.com', 'Lun - Vie: 9:00 - 18:00', -16.5000, -68.1193, FALSE, TRUE);

-- Vacantes
INSERT INTO vacante (titulo, area, descripcion, requisitos, ubicacion, tipo, activo) VALUES
    ('Asesor Inmobiliario Senior', 'Comercial', 'Gestión de cartera de clientes compradores y propietarios, negociación y cierre de operaciones.', 'Experiencia 3+ años en ventas inmobiliarias. Licencia para conducir. Conocimiento del mercado de Santa Cruz.', 'Santa Cruz de la Sierra', 'TIEMPO_COMPLETO', TRUE),
    ('Fotógrafo de Propiedades 360°', 'Operaciones', 'Captura de fotografía panorámica y video de propiedades para recorridos virtuales.', 'Experiencia en fotografía inmobiliaria o de arquitectura. Manejo de cámaras 360 (deseable).', 'Santa Cruz de la Sierra', 'MEDIO_TIEMPO', TRUE),
    ('Pasante de Marketing Digital', 'Marketing', 'Apoyo en gestión de contenidos, redes sociales y campañas digitales del sitio corporativo.', 'Estudiante de últimos semestres de Marketing, Comunicación o afines.', 'Santa Cruz de la Sierra', 'PRACTICAS', TRUE);

-- Blog de ejemplo
INSERT INTO blog_post (slug, titulo, resumen, contenido_md, estado, publicado_at) VALUES
    ('tendencias-mercado-inmobiliario-2026',
     'Tendencias del mercado inmobiliario en Bolivia 2026',
     'Análisis de las zonas con mayor valorización, la migración hacia viviendas con espacios de trabajo y el rol de la tecnología en las decisiones de compra.',
     '## El mercado en cifras\n\nEl 2026 consolida la recuperación del sector con una valorización promedio del 6.2% anual en las principales ciudades.\n\n### Zonas emergentes\n\nEquipetrol Norte y la zona sur de La Paz concentran el mayor interés de compradores jóvenes.\n\n### Tecnología decisiva\n\nEl 78% de compradores inicia su búsqueda en línea y las propiedades con recorrido virtual reciben 3 veces más consultas.',
     'PUBLICADO', NOW() - INTERVAL '10 days'),
    ('guia-compra-primer-departamento',
     'Guía completa para comprar tu primer departamento',
     'Todo lo que necesitas saber: presupuesto, financiamiento, verificación legal y los errores más comunes que debes evitar.',
     '## Antes de buscar\n\nDefine tu presupuesto real incluyendo gastos de escrituración (aprox. 3-5% del valor).\n\n## Verificación legal\n\nNunca firmes sin verificar el título en Derechos Reales y el estado de deudas de la propiedad.\n\n## Errores frecuentes\n\n- No comparar el precio por m² con la zona\n- Omitir la inspección física del estado real\n- No reservar margen para refacciones',
     'PUBLICADO', NOW() - INTERVAL '5 days'),
    ('como-funcionan-recorridos-360',
     'Así funcionan nuestros recorridos virtuales 360°',
     'Detrás de cada tour inmersivo hay fotografía panorámica, inteligencia artificial y mediciones métricas reales.',
     '## Captura profesional\n\nCada ambiente se fotografía en 360° con equipos calibrados.\n\n## Mediciones con IA\n\nNuestros modelos de estimación de profundidad calculan dimensiones reales con error menor a 9 cm.\n\n## Explora desde cualquier lugar\n\nCompatible con celular, computadora y visores VR.',
     'PUBLICADO', NOW() - INTERVAL '2 days');
