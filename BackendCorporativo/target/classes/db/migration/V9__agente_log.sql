-- V9: bitácora del asistente virtual corporativo.
-- Registra cada interacción del chat para el panel admin:
-- qué pregunta la gente, qué proveedor LLM respondió, latencia y
-- si la conversación terminó en lead capturado.

CREATE TABLE agente_log (
    id          BIGSERIAL PRIMARY KEY,
    creado      TIMESTAMPTZ NOT NULL DEFAULT now(),
    pregunta    VARCHAR(1000) NOT NULL,
    proveedor   VARCHAR(20) NOT NULL,          -- groq | gemini | fallback
    accion      VARCHAR(30) NOT NULL DEFAULT 'ninguna',
    latencia_ms INTEGER NOT NULL,
    ok          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX agente_log_creado_idx ON agente_log (creado);
CREATE INDEX agente_log_accion_idx ON agente_log (accion);
