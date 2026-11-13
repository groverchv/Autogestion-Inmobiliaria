import { Link } from 'react-router-dom';
import { FileText, Shield, Cookie, RotateCcw } from 'lucide-react';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    padding: '2rem 1rem 4rem',
  },
  container: { maxWidth: '780px', margin: '0 auto' },
  card: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    borderRadius: '14px',
    padding: '2rem',
    lineHeight: '1.7',
    fontSize: '0.92rem',
    color: '#cbd5e1',
  },
  h1: { color: '#f8fafc', fontSize: '1.5rem', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '10px' },
  h2: { color: '#38bdf8', fontSize: '1.05rem', marginTop: '1.4rem', marginBottom: '0.4rem' },
  meta: { color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' },
  back: { color: '#38bdf8', fontSize: '0.85rem', textDecoration: 'none' },
};

const DOCS = {
  privacidad: {
    icon: Shield,
    titulo: 'Política de Privacidad',
    actualizado: 'Octubre 2026',
    secciones: [
      ['1. Responsable del tratamiento', 'Inmobiliaria Nobleve (en adelante "la Plataforma"), con domicilio en Santa Cruz de la Sierra, Bolivia, es responsable del tratamiento de los datos personales recogidos. Contacto de privacidad: groverchoquevillca80@gmail.com'],
      ['2. Datos que recogemos', 'Datos de identificación (nombre, apellido, correo electrónico, teléfono, cédula de identidad y fecha de nacimiento, usados para verificar la mayoría de edad y la identidad en contratos), datos de inmuebles publicados (ubicación, fotografías, panoramas 360°, documentos de título de propiedad), datos de uso (páginas visitadas, acciones en la plataforma) y datos de pago procesados por Stripe (nunca almacenamos números completos de tarjeta).'],
      ['3. Finalidad', 'Prestación del servicio: publicación y búsqueda de inmuebles, recorridos virtuales 360°, gestión de citas, generación y firma de contratos, procesamiento de pagos, verificación asistida de títulos de propiedad y trazabilidad de operaciones en el registro blockchain de la plataforma.'],
      ['4. Terceros encargados', 'Cloudinary (almacenamiento de imágenes y documentos), Stripe (procesamiento de pagos, bajo PCI-DSS), Groq (análisis de texto de documentos de título — solo si la función de verificación por IA está activa) y OpenStreetMap/Leaflet (tiles de mapas). No vendemos datos personales a terceros.'],
      ['5. Registro blockchain', 'Las operaciones (contratos, firmas, pagos, verificaciones) se registran como identificadores y hashes criptográficos — nunca como datos personales en texto plano — en un registro inmutable de auditoría.'],
      ['6. Conservación', 'Los datos se conservan mientras la cuenta esté activa y por los plazos legales aplicables (fiscal y contractual). Los documentos de título se conservan mientras la publicación asociada esté activa.'],
      ['7. Tus derechos', 'Puedes solicitar acceso, rectificación, eliminación u oposición al tratamiento escribiendo a groverchoquevillca80@gmail.com. Responderemos en un plazo máximo de 15 días hábiles.'],
      ['8. Seguridad', 'Aplicamos cifrado en tránsito (HTTPS), contraseñas hasheadas, control de acceso por roles y tokens JWT de corta duración con rotación.'],
    ],
  },
  terminos: {
    icon: FileText,
    titulo: 'Términos y Condiciones de Uso',
    actualizado: 'Octubre 2026 · Versión v1.0',
    secciones: [
      ['1. Objeto y aceptación', 'Estos términos regulan el uso de Autogestión Inmobiliaria 360° ("Nobleve"), plataforma digital de gestión inmobiliaria con tours virtuales 360°, contratos digitales y registro de auditoría. Al registrarse aceptas ser mayor de 18 años y tener capacidad legal para contratar.'],
      ['2. Naturaleza del servicio', 'La Plataforma es una herramienta de gestión y intermediación tecnológica. No somos inmobiliaria, notaría ni registro de derechos reales. Los contratos generados constituyen acuerdos entre las partes usuarias; la formalización registral ante DDRR/notaría sigue siendo responsabilidad de éstas.'],
      ['3. Publicación de inmuebles', 'El propietario declara y garantiza ser titular o contar con autorización para ofertar el inmueble, y que las fotografías, panoramas 360° y documentos subidos son de su propiedad o cuentan con licencia de uso. Otorga a la Plataforma licencia no exclusiva para mostrarlos dentro del servicio.'],
      ['4. Verificación de títulos', 'La verificación de títulos es una herramienta de asistencia basada en análisis documental e inteligencia artificial. El resultado "verificado" es una opinión técnica orientativa y no constituye certificación legal ni fe pública.'],
      ['5. Contratos y firmas digitales', 'Los contratos creados, enviados y aceptados en la plataforma, así como las firmas registradas, quedan asentados como evidencia digital con hash criptográfico en el registro de auditoría. Las partes reconocen este registro como evidencia de su consentimiento.'],
      ['6. Pagos', 'Los pagos se procesan mediante pasarelas externas (Stripe). La Plataforma no custodia fondos. Las condiciones de reembolso se rigen por la Política de Reembolsos publicada en /reembolsos.'],
      ['7. Walk Score y datos del entorno', 'El índice de calidad de vida, Walk Score y puntos de interés mostrados son estimaciones de referencia generadas por la plataforma y pueden diferir de la realidad. Verifica siempre las condiciones del entorno personalmente.'],
      ['8. Conducta prohibida', 'Queda prohibido publicar información falsa, inmuebles sin autorización, contenido de terceros sin licencia, o intentar acceder a cuentas ajenas.'],
      ['9. Limitación de responsabilidad', 'La Plataforma no garantiza la concreción de operaciones entre usuarios ni la veracidad absoluta de las publicaciones. El uso del sitio es bajo responsabilidad del usuario.'],
      ['10. Ley aplicable y jurisdicción', 'Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia, incluida la Ley N° 453 de Protección de Derechos de Usuarios y Consumidores. Jurisdicción: tribunales de Santa Cruz de la Sierra.'],
    ],
  },
  cookies: {
    icon: Cookie,
    titulo: 'Política de Cookies',
    actualizado: 'Octubre 2026',
    secciones: [
      ['1. Qué usamos', 'La Plataforma utiliza almacenamiento local del navegador (localStorage) — funcionalmente equivalente a cookies — exclusivamente para fines técnicos esenciales: tu sesión (token de acceso), preferencia de tema (claro/oscuro) y tu decisión sobre este aviso.'],
      ['2. Cookies técnicas (necesarias)', 'Token de autenticación JWT y preferencias de interfaz. Sin ellas el servicio no funciona; no requieren consentimiento.'],
      ['3. Cookies de analítica', 'Actualmente no instalamos cookies de seguimiento ni analítica. Si en el futuro se incorporan, se solicitará tu consentimiento previo mediante el banner y podrás rechazarlas sin perder funcionalidad.'],
      ['4. Terceros', 'Stripe puede establecer sus propias cookies durante el proceso de pago, bajo su propia política.'],
      ['5. Cómo gestionarlas', 'Puedes borrar el almacenamiento local desde la configuración de tu navegador (ej. Chrome: Configuración → Privacidad → Datos de sitios). Al hacerlo se cerrará tu sesión.'],
    ],
  },
  reembolsos: {
    icon: RotateCcw,
    titulo: 'Política de Reembolsos',
    actualizado: 'Octubre 2026',
    secciones: [
      ['1. Ámbito', 'Esta política aplica a los pagos procesados a través de la pasarela de la Plataforma (Stripe): reservas, garantías, primeros meses de alquiler u otros cargos asociados a contratos gestionados en Nobleve.'],
      ['2. Casos con derecho a reembolso', 'Pago duplicado por error técnico; cargo cobrado sobre un contrato que fue cancelado antes de ser aceptado por ambas partes; error de monto verificable con el comprobante.'],
      ['3. Casos sin derecho a reembolso', 'Pagos correspondientes a contratos ya firmados y activos por ambas partes (la rescisión se rige por las cláusulas del propio contrato); cambios de opinión posteriores a la firma; pagos realizados fuera de la plataforma (efectivo/transferencia directa entre partes).'],
      ['4. Procedimiento', 'Envía tu solicitud a groverchoquevillca80@gmail.com indicando el ID de pago (visible en Mis Pagos), motivo y comprobante. Evaluamos el caso en hasta 5 días hábiles.'],
      ['5. Plazos', 'Si la solicitud es aprobada, el reembolso se ejecuta al mismo medio de pago vía Stripe en un plazo de 5 a 10 días hábiles según el banco emisor.'],
      ['6. Reclamos', 'Sin perjuicio de lo anterior, el usuario puede ejercer sus derechos de consumidor conforme a la Ley N° 453 del Estado Plurinacional de Bolivia.'],
    ],
  },
};

const LegalPage = ({ doc }) => {
  const data = DOCS[doc];
  if (!data) return null;
  const Icon = data.icon;
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/propiedades" style={styles.back}>← Volver al catálogo</Link>
        <div style={{ ...styles.card, marginTop: '1rem' }}>
          <h1 style={styles.h1}><Icon size={22} color="#38bdf8" />{data.titulo}</h1>
          <div style={styles.meta}>Última actualización: {data.actualizado}</div>
          {data.secciones.map(([titulo, cuerpo]) => (
            <section key={titulo}>
              <h2 style={styles.h2}>{titulo}</h2>
              <p style={{ margin: '0 0 0.5rem' }}>{cuerpo}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
