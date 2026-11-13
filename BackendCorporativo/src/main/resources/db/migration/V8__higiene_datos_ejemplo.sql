-- V8: higiene de datos de ejemplo del seed.
-- Los registros con direcciones "Ejemplo" y teléfonos 7000000x son
-- placeholders que no deben verse en el sitio público. Se desactivan
-- en lugar de borrarse para que el admin vea que existe el módulo y
-- cargue los datos reales desde el panel.

-- Oficinas con dirección de ejemplo → fuera del sitio público
UPDATE oficina
SET activo = FALSE
WHERE direccion ILIKE '%Ejemplo%'
   OR telefono LIKE '%7000000%';

-- Config: la dirección de ejemplo no se muestra; el campo queda vacío
-- hasta que el administrador cargue la real desde el panel.
UPDATE config_sitio
SET valor = ''
WHERE clave = 'contacto_direccion'
  AND valor ILIKE '%Ejemplo%';
