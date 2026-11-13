-- ─────────────────────────────────────────────────────────────────
-- V1: Esquema del dominio corporativo
-- Sitio web institucional: CMS, leads, notificaciones push y email
-- ─────────────────────────────────────────────────────────────────

-- Usuarios del panel administrativo corporativo (marketing/editores)
CREATE TABLE admin_usuario (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    nombre        VARCHAR(120) NOT NULL,
    rol           VARCHAR(20)  NOT NULL DEFAULT 'EDITOR',  -- ADMIN | EDITOR
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    creado        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Contenido CMS -----------------------------------------------------
CREATE TABLE banner (
    id         BIGSERIAL PRIMARY KEY,
    titulo     VARCHAR(200) NOT NULL,
    subtitulo  VARCHAR(300),
    imagen_url VARCHAR(500),
    cta_texto  VARCHAR(80),
    cta_url    VARCHAR(300),
    orden      INT NOT NULL DEFAULT 0,
    activo     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE servicio (
    id          BIGSERIAL PRIMARY KEY,
    titulo      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    icono       VARCHAR(60),          -- nombre de icono lucide
    orden       INT NOT NULL DEFAULT 0,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE testimonio (
    id            BIGSERIAL PRIMARY KEY,
    nombre_cliente VARCHAR(120) NOT NULL,
    cargo         VARCHAR(120),
    texto         TEXT NOT NULL,
    avatar_url    VARCHAR(500),
    estrellas     SMALLINT NOT NULL DEFAULT 5 CHECK (estrellas BETWEEN 1 AND 5),
    orden         INT NOT NULL DEFAULT 0,
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE miembro_equipo (
    id       BIGSERIAL PRIMARY KEY,
    nombre   VARCHAR(120) NOT NULL,
    cargo    VARCHAR(120),
    foto_url VARCHAR(500),
    bio      TEXT,
    orden    INT NOT NULL DEFAULT 0,
    activo   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE blog_post (
    id           BIGSERIAL PRIMARY KEY,
    slug         VARCHAR(220) NOT NULL UNIQUE,
    titulo       VARCHAR(220) NOT NULL,
    resumen      VARCHAR(400),
    contenido_md TEXT,
    portada_url  VARCHAR(500),
    autor_id     BIGINT REFERENCES admin_usuario(id) ON DELETE SET NULL,
    estado       VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',  -- BORRADOR | PUBLICADO
    publicado_at TIMESTAMPTZ,
    creado       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_blog_estado ON blog_post(estado, publicado_at DESC);

CREATE TABLE faq (
    id        BIGSERIAL PRIMARY KEY,
    pregunta  VARCHAR(300) NOT NULL,
    respuesta TEXT NOT NULL,
    orden     INT NOT NULL DEFAULT 0,
    activo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Oficinas / puntos de contacto físicos
CREATE TABLE oficina (
    id        BIGSERIAL PRIMARY KEY,
    nombre    VARCHAR(120) NOT NULL,
    direccion VARCHAR(250),
    ciudad    VARCHAR(100),
    telefono  VARCHAR(40),
    email     VARCHAR(150),
    horario   VARCHAR(150),
    maps_url  VARCHAR(500),
    lat       NUMERIC(10,7),
    lng       NUMERIC(10,7),
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    activo    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Vacantes laborales (trabaja con nosotros)
CREATE TABLE vacante (
    id          BIGSERIAL PRIMARY KEY,
    titulo      VARCHAR(150) NOT NULL,
    area        VARCHAR(100),
    descripcion TEXT,
    requisitos  TEXT,
    ubicacion   VARCHAR(120),
    tipo        VARCHAR(30) NOT NULL DEFAULT 'TIEMPO_COMPLETO', -- TIEMPO_COMPLETO | MEDIO_TIEMPO | PRACTICAS | FREELANCE
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración del sitio (clave-valor: teléfonos, redes, stats, VAPID keys)
CREATE TABLE config_sitio (
    clave VARCHAR(80) PRIMARY KEY,
    valor TEXT
);

-- Leads / contactos -------------------------------------------------
CREATE TABLE lead_contacto (
    id           BIGSERIAL PRIMARY KEY,
    nombre       VARCHAR(150) NOT NULL,
    email        VARCHAR(150) NOT NULL,
    telefono     VARCHAR(40),
    asunto       VARCHAR(200),
    mensaje      TEXT NOT NULL,
    tipo         VARCHAR(30) NOT NULL DEFAULT 'CONTACTO',
                 -- CONTACTO | VISITA | VENDER_PROPIEDAD | POSTULACION | SOPORTE
    inmueble_id  BIGINT,
    vacante_id   BIGINT REFERENCES vacante(id) ON DELETE SET NULL,
    estado       VARCHAR(20) NOT NULL DEFAULT 'NUEVO',
                 -- NUEVO | EN_CONTACTO | CERRADO | DESCARTADO
    nota_interna TEXT,
    origen_url   VARCHAR(400),
    creado       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lead_estado ON lead_contacto(estado, creado DESC);
CREATE INDEX idx_lead_tipo   ON lead_contacto(tipo, creado DESC);

-- Suscriptores newsletter -------------------------------------------
CREATE TABLE suscriptor_newsletter (
    id     BIGSERIAL PRIMARY KEY,
    email  VARCHAR(150) NOT NULL UNIQUE,
    nombre VARCHAR(120),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Suscripciones Web Push --------------------------------------------
CREATE TABLE suscriptor_push (
    id         BIGSERIAL PRIMARY KEY,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    user_agent VARCHAR(300),
    activo     BOOLEAN NOT NULL DEFAULT TRUE,
    creado     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_push_activo ON suscriptor_push(activo);

-- Log de correos enviados --------------------------------------------
CREATE TABLE email_log (
    id          BIGSERIAL PRIMARY KEY,
    destinatario VARCHAR(150) NOT NULL,
    asunto      VARCHAR(250) NOT NULL,
    plantilla   VARCHAR(80),
    estado      VARCHAR(20) NOT NULL DEFAULT 'ENVIADO', -- ENVIADO | FALLIDO
    error       TEXT,
    creado      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_log_fecha ON email_log(creado DESC);
