-- ─────────────────────────────────────────────────────────────────
-- V4: Índices compuestos para las consultas reales + higiene de datos
-- Cubre las queries de producción del panel y la API pública.
-- ─────────────────────────────────────────────────────────────────

-- Filtro combinado del panel de contactos: findByEstadoAndTipo(estado, tipo, page)
CREATE INDEX idx_lead_estado_tipo ON lead_contacto(estado, tipo, creado DESC);

-- Difusión del boletín: findByActivoTrue() sobre suscriptor_newsletter
CREATE INDEX idx_newsletter_activo ON suscriptor_newsletter(activo);

-- Listados públicos CMS: findByActivoTrueOrderByOrdenAsc()
CREATE INDEX idx_banner_activo_orden     ON banner(activo, orden);
CREATE INDEX idx_servicio_activo_orden   ON servicio(activo, orden);
CREATE INDEX idx_testimonio_activo_orden ON testimonio(activo, orden);
CREATE INDEX idx_equipo_activo_orden     ON miembro_equipo(activo, orden);
CREATE INDEX idx_faq_activo_orden        ON faq(activo, orden);

-- findByActivoTrueOrderByPrincipalDescIdAsc() y findByActivoTrueOrderByCreadoDesc()
CREATE INDEX idx_oficina_activo ON oficina(activo, principal DESC, id);
CREATE INDEX idx_vacante_activo ON vacante(activo, creado DESC);

-- ─────────────────────────────────────────────────────────────────
-- Higiene: los testimonios del seed eran datos de ejemplo con nombres
-- genéricos. Se desactivan para no publicar reseñas inventadas;
-- el equipo debe cargar testimonios reales desde el panel.
-- ─────────────────────────────────────────────────────────────────
UPDATE testimonio SET activo = FALSE;

-- El CTA del home apuntaba al catálogo eliminado; ahora invita a conocer servicios
UPDATE config_sitio SET valor = 'Conoce nuestros servicios: recorridos virtuales 360°, valuación con IA, verificación legal y acompañamiento profesional de principio a fin.'
WHERE clave = 'home_cta_texto';
