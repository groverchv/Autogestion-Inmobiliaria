import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: '-8px', right: '-14px',
      background: '#ef4444', color: '#fff', fontSize: '0.65rem',
      fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
      minWidth: '16px', textAlign: 'center', lineHeight: '14px'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const UserMenu = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({ notificaciones: 0, mensajes: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBadges = () => {
      api.get('/usuarios/lista/badges/')
        .then(res => setBadges(res.data))
        .catch(() => {});
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated || user?.rol === 'admin') return null;

  const currentPath = location.pathname;

  const getStyle = (path) => {
    const isActive = currentPath.startsWith(path) && path !== '/' || currentPath === path;
    if (isActive) {
      return { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--color-primary)', paddingBottom: '4px', position: 'relative' };
    }
    return { color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500, paddingBottom: '4px', position: 'relative' };
  };

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, background: '#fff' }}>
      <nav className="hero-nav" style={{ 
        display: 'flex', 
        gap: '24px', 
        justifyContent: 'center',
        maxWidth: '900px',
        margin: '0 auto',
        flexWrap: 'wrap'
      }}>
        <Link to="/propiedades" style={getStyle('/propiedades')}>Catálogo</Link>
        <Link to="/mis-inmuebles" style={getStyle('/mis-inmuebles')}>Mis Inmuebles</Link>
        <Link to="/mi-agenda" style={getStyle('/mi-agenda')}>Mi Agenda</Link>
        <Link to="/mis-contratos" style={getStyle('/mis-contratos')}>Mis Contratos</Link>
        <Link to="/mis-pagos" style={getStyle('/mis-pagos')}>Mis Pagos</Link>
        <Link to="/favoritos" style={getStyle('/favoritos')}>Favorito</Link>
        <Link to="/notificaciones" style={getStyle('/notificaciones')}>
          Notificaciones
          <Badge count={badges.notificaciones} />
        </Link>
        <Link to="/mensajes" style={getStyle('/mensajes')}>
          Mensajes
          <Badge count={badges.mensajes} />
        </Link>
        <Link to="/perfil" style={getStyle('/perfil')}>Perfil</Link>
      </nav>
    </div>
  );
};

export default UserMenu;
