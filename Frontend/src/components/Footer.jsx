import { Link } from 'react-router-dom';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer style={{
      borderTop: '1px solid rgba(51, 65, 85, 0.5)',
      background: 'rgba(2, 6, 23, 0.8)',
      padding: '1.75rem 1.5rem 1.25rem',
      marginTop: '3rem',
      fontSize: '0.82rem',
      color: '#94a3b8',
    }}>
      <div style={{
        maxWidth: '1100px', margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
        justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ maxWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 700, marginBottom: '6px' }}>
            <Building2 size={16} color="#38bdf8" />
            Inmobiliaria Nobleve
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={13} /> Santa Cruz de la Sierra, Bolivia
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <Mail size={13} /> contacto@nobleve.bo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <Phone size={13} /> +591 70000000
          </div>
        </div>
        <nav aria-label="Enlaces legales" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Link to="/terminos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Términos y Condiciones</Link>
          <Link to="/privacidad" style={{ color: '#94a3b8', textDecoration: 'none' }}>Política de Privacidad</Link>
          <Link to="/cookies" style={{ color: '#94a3b8', textDecoration: 'none' }}>Política de Cookies</Link>
          <Link to="/reembolsos" style={{ color: '#94a3b8', textDecoration: 'none' }}>Política de Reembolsos</Link>
        </nav>
      </div>
      <div style={{ maxWidth: '1100px', margin: '1.25rem auto 0', paddingTop: '1rem', borderTop: '1px solid rgba(51, 65, 85, 0.4)', color: 'var(--color-text-secondary)' }}>
        © {year} Inmobiliaria Nobleve. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
