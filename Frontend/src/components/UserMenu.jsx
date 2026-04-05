import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const UserMenu = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || user?.rol === 'admin') return null;

  const currentPath = location.pathname;

  const getStyle = (path) => {
    // Para '/propiedades' o subrutas (ej `/propiedades/20`) marcamos activo si la base coincide y no es otra, pero acá Inmuebles es todo el listado
    const isActive = currentPath.startsWith(path) && path !== '/' || currentPath === path;
    if (isActive) {
      return { color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--color-primary)', paddingBottom: '4px' };
    }
    return { color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500, paddingBottom: '4px' };
  };

  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, background: '#fff' }}>
      <nav className="hero-nav" style={{ 
        display: 'flex', 
        gap: '24px', 
        justifyContent: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        flexWrap: 'wrap'
      }}>
        <Link to="/propiedades" style={getStyle('/propiedades')}>Catálogo</Link>
        <Link to="/mis-inmuebles" style={getStyle('/mis-inmuebles')}>Mis Inmuebles</Link>
        <Link to="/favoritos" style={getStyle('/favoritos')}>Favorito</Link>
        <Link to="/notificaciones" style={getStyle('/notificaciones')}>Notificaciones</Link>
        <Link to="/mensajes" style={getStyle('/mensajes')}>Mensajes</Link>
        <Link to="/perfil" style={getStyle('/perfil')}>Perfil</Link>
      </nav>
    </div>
  );
};

export default UserMenu;
