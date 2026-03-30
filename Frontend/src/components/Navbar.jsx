import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { APP_NAME } from '../config/constants';
import './Navbar.css';

/**
 * Barra de navegación principal.
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-icon">🏠</span>
          <span className="navbar__brand-text">{APP_NAME}</span>
        </Link>

        <div className="navbar__actions">
          {isAuthenticated ? (
            <>
              <span className="navbar__user">
                Hola, <strong>{user?.first_name || user?.username}</strong>
              </span>
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
