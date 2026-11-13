-- V10: planes de suscripción publicados en el sitio corporativo.
-- Es la copia editorial del modelo de negocio (pagos_plan del sistema
-- operativo): lo que el visitante ve y compara antes de registrarse.
-- caracteristicas: una por línea — el público las ve como viñetas.

CREATE TABLE plan (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    precio          NUMERIC(10,2) NOT NULL DEFAULT 0,
    moneda          VARCHAR(10) NOT NULL DEFAULT 'BOB',
    periodo         VARCHAR(30) NOT NULL DEFAULT 'mes',
    max_inmuebles   INTEGER NOT NULL DEFAULT 1,
    caracteristicas TEXT,
    destacado       BOOLEAN NOT NULL DEFAULT FALSE,
    cta_texto       VARCHAR(80) NOT NULL DEFAULT 'Empezar',
    cta_url         VARCHAR(300),
    orden           INTEGER NOT NULL DEFAULT 0,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX plan_activo_orden_idx ON plan (activo, orden);

INSERT INTO plan (nombre, descripcion, precio, periodo, max_inmuebles, caracteristicas, destacado, cta_texto, cta_url, orden, activo) VALUES
('Gratis',
 'Para empezar a publicar sin costo.',
 0, 'mes', 1,
 E'1 propiedad publicada\nHasta 8 fotos por propiedad\nFicha con datos de contacto\nSoporte por correo',
 FALSE, 'Empezar gratis', NULL, 1, TRUE),
('Profesional',
 'Para agentes que venden en serio.',
 190, 'mes', 10,
 E'Hasta 10 propiedades activas\nTours 360 ilimitados\nPropiedades destacadas en el catálogo\nEstadísticas de visitas\nSoporte prioritario por WhatsApp',
 TRUE, 'Contratar', NULL, 2, TRUE),
('Inmobiliaria',
 'Para equipos y agencias con cartera amplia.',
 490, 'mes', 50,
 E'Hasta 50 propiedades activas\nTodo lo del plan Profesional\nMúltiples usuarios del equipo\nPágina con tu marca en la plataforma\nAsesoría personalizada de captura 360',
 FALSE, 'Hablar con ventas', '/contacto', 3, TRUE);
