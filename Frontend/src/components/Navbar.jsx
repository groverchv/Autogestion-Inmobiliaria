import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { APP_NAME } from '../config/constants';
import './Navbar.css';

/**
 * Barra de navegación principal.
 * El admin ve un link al panel. El usuario normal NO ve panel.
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-icon"></span>
          <span className="navbar__brand-text">{APP_NAME}</span>
        </Link>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
            <div className="navbar__user-info">
              <span className="navbar__user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="navbar__user-role">
                {user?.rol === 'admin' ? 'ADMINISTRADOR' : 'USUARIO'}
              </span>
            </div>
              {user?.rol === 'admin' && (
                <Link to="/panel/dashboard" className="navbar__btn navbar__btn--panel" style={{
                  padding: '6px 14px',
                  background: 'rgba(14,165,233,0.15)',
                  color: '#0ea5e9',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  Panel Admin
                </Link>
              )}
              <button className="navbar__btn navbar__btn--logout" onClick={logout}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__btn navbar__btn--login">
                Iniciar Sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
