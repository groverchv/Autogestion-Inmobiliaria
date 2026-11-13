-- Corrige el tipo de intentos (V5 la creó SMALLINT en BDs ya migradas)
ALTER TABLE email_log ALTER COLUMN intentos TYPE INTEGER;
