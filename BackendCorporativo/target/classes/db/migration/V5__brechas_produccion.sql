-- ─────────────────────────────────────────────────────────────────
-- V5: Funciones de producción — doble opt-in, baja por token, CV,
-- categorías de blog, biblioteca de medios, auditoría y reintentos.
-- ─────────────────────────────────────────────────────────────────

-- Boletín: doble opt-in + baja por token (cumple CAN-SPAM/privacidad)
ALTER TABLE suscriptor_newsletter
    ADD COLUMN token_baja         VARCHAR(64),
    ADD COLUMN token_confirmacion VARCHAR(64),
    ADD COLUMN confirmado         BOOLEAN NOT NULL DEFAULT FALSE;

-- Los suscriptores preexistentes quedan confirmados (grandfathered)
UPDATE suscriptor_newsletter
SET confirmado = TRUE,
    token_baja = replace(gen_random_uuid()::text, '-', '')
WHERE token_baja IS NULL;
CREATE UNIQUE INDEX idx_newsletter_token_baja ON suscriptor_newsletter(token_baja);
CREATE INDEX idx_newsletter_confirmado ON suscriptor_newsletter(confirmado, activo);

-- CV adjunto en postulaciones laborales
ALTER TABLE lead_contacto ADD COLUMN adjunto_url VARCHAR(500);

-- Categorías del blog (filtro + artículos relacionados)
ALTER TABLE blog_post ADD COLUMN categoria VARCHAR(60);
CREATE INDEX idx_blog_categoria ON blog_post(estado, categoria);

-- Biblioteca de medios del panel (imágenes subidas a Cloudinary)
CREATE TABLE media (
    id         BIGSERIAL PRIMARY KEY,
    url        VARCHAR(500) NOT NULL,
    public_id  VARCHAR(200),
    nombre     VARCHAR(200),
    bytes      BIGINT,
    subido_por BIGINT REFERENCES admin_usuario(id) ON DELETE SET NULL,
    creado     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_media_creado ON media(creado DESC);

-- Auditoría: quién escribió qué en el panel admin
CREATE TABLE audit_log (
    id         BIGSERIAL PRIMARY KEY,
    admin_id   BIGINT REFERENCES admin_usuario(id) ON DELETE SET NULL,
    email      VARCHAR(150),
    accion     VARCHAR(10) NOT NULL,   -- POST | PUT | PATCH | DELETE
    recurso    VARCHAR(200) NOT NULL,  -- ruta del endpoint
    detalle    VARCHAR(300),
    creado     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_fecha ON audit_log(creado DESC);
CREATE INDEX idx_audit_admin ON audit_log(admin_id, creado DESC);

-- Reintentos de correos fallidos (cuerpo renderizado para reenvío)
ALTER TABLE email_log
    ADD COLUMN intentos    SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN cuerpo_html TEXT;
CREATE INDEX idx_email_reintento ON email_log(estado, intentos);
