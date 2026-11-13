-- V3: el sitio corporativo es institucional (sin catálogo de propiedades).
-- El CTA del banner principal apuntaba a /propiedades → ahora a /servicios.
UPDATE banner
SET cta_texto = 'Conoce nuestros servicios',
    cta_url   = '/servicios'
WHERE cta_url = '/propiedades';
