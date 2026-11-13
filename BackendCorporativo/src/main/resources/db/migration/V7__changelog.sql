-- V7: changelog público (release notes) — Punto 7 del proyecto.
CREATE TABLE version_lanzamiento (
    id                 BIGSERIAL PRIMARY KEY,
    version            VARCHAR(20)  NOT NULL,
    titulo             VARCHAR(200) NOT NULL,
    descripcion_md     TEXT         NOT NULL,
    tipo               VARCHAR(20)  NOT NULL DEFAULT 'NUEVO',
    fecha_publicacion  DATE         NOT NULL,
    publicado          BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_version_lanz_publicado ON version_lanzamiento (publicado, fecha_publicacion DESC);

INSERT INTO version_lanzamiento (version, titulo, descripcion_md, tipo, fecha_publicacion) VALUES
('1.0.0', 'Lanzamiento de la plataforma Inmo360',
 '- Plataforma web de gestión inmobiliaria para agentes
- Sitio corporativo institucional con CMS y blog
- Formularios de contacto y solicitud de servicios
- Boletín por correo con confirmación (doble opt-in)',
 'NUEVO', CURRENT_DATE - INTERVAL '14 days'),
('1.1.0', 'Mejoras de rendimiento y seguridad',
 '- Tiempos de carga de la página de inicio reducidos con caché
- Cabeceras de seguridad reforzadas (CSP, HSTS)
- Página instalable como aplicación (PWA)
- Nuevas páginas legales: cookies, reembolsos y accesibilidad',
 'MEJORA', CURRENT_DATE - INTERVAL '5 days');
