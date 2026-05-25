import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { APP_NAME } from '../config/constants';
import UserDropdown from './UserDropdown';
import api from '../services/api';
import {
  Menu,
  X,
  Search,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  TrendingUp,
  Heart,
  Bell,
  MessageSquare,
  User,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Home
} from 'lucide-react';
import './Navbar.css';

/**
 * Barra de navegación principal.
 * En desktop, muestra enlaces de perfil y el dropdown normal.
 * En móvil, se convierte en un menú hamburguesa que abre un Sidebar/Drawer con todas las opciones.
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [badges, setBadges] = useState({ notificaciones: 0, mensajes: 0 });
  const [expandedGroup, setExpandedGroup] = useState(null); // 'propiedades' | 'finanzas' | 'alertas' | null
  const location = useLocation();

  // Bloquear scroll de la página al abrir sidebar
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  // Consultar insignias (badges) periódicamente
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
  }, [isAuthenticated, user]);

  // Auto-expandir el grupo correspondiente al cambiar de ruta
  useEffect(() => {
    const path = location.pathname;
    let targetGroup = null;
    if (path.startsWith('/mis-inmuebles') || path.startsWith('/mi-agenda') || path.startsWith('/favoritos')) {
      targetGroup = 'propiedades';
    } else if (path.startsWith('/mis-contratos') || path.startsWith('/mis-pagos') || path.startsWith('/mis-finanzas')) {
      targetGroup = 'finanzas';
    } else if (path.startsWith('/notificaciones') || path.startsWith('/mensajes')) {
      targetGroup = 'alertas';
    }
    
    const timer = setTimeout(() => {
      setExpandedGroup(targetGroup);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const isGroupActive = (paths) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  const toggleAccordion = (name) => {
    setExpandedGroup(prev => prev === name ? null : name);
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${user?.first_name || 'U'}+${user?.last_name || 'X'}&background=0ea5e9&color=fff&size=100`;

  return (
    <>
      <nav className="navbar" id="main-navbar">
        <div className="navbar__container">
          <div className="navbar__left">
            {/* Botón menú hamburguesa en móvil */}
            {isAuthenticated && (
              <button 
                className="navbar__hamburger" 
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Abrir menú de navegación"
              >
                <Menu size={24} />
              </button>
            )}

            <Link to="/" className="navbar__brand">
              <Home size={24} style={{ color: 'var(--color-primary)' }} />
              <span className="navbar__brand-text">{APP_NAME}</span>
            </Link>
          </div>

          <div className="navbar__actions">
            {isAuthenticated ? (
              <>
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
                <UserDropdown />
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

      {/* MENÚ DESPLEGABLE SIDEBAR (MÓVIL) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-drawer__header">
              <Link to="/" className="navbar__brand" onClick={() => setIsSidebarOpen(false)}>
                <Home size={24} style={{ color: 'var(--color-primary)' }} />
                <span className="navbar__brand-text">{APP_NAME}</span>
              </Link>
              <button className="sidebar-drawer__close" onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú">
                <X size={24} />
              </button>
            </div>

            {/* Perfil del usuario en el sidebar */}
            <div className="sidebar-drawer__user">
              <img 
                src={user?.foto || defaultAvatar} 
                alt="Avatar de usuario" 
                className="sidebar-drawer__avatar" 
              />
              <div className="sidebar-drawer__user-info">
                <span className="sidebar-drawer__username">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="sidebar-drawer__userrole">
                  {user?.rol === 'propietario' ? 'Propietario' : 'Usuario'}
                </span>
              </div>
            </div>

            {/* Listado de Enlaces en el sidebar */}
            <div className="sidebar-drawer__menu">
              {user?.rol === 'admin' && (
                <Link 
                  to="/panel/dashboard" 
                  className="sidebar-drawer__item sidebar-drawer__item--admin"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <ShieldAlert size={20} />
                  <span>Panel Administrador</span>
                  <ChevronRight size={16} className="sidebar-drawer__chevron" />
                </Link>
              )}

              {/* 1. Catálogo */}
              <Link 
                to="/propiedades" 
                className={`sidebar-drawer__item ${location.pathname.startsWith('/propiedades') ? 'sidebar-drawer__item--active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Search size={20} />
                <span>Catálogo</span>
                <ChevronRight size={16} className="sidebar-drawer__chevron" />
              </Link>

              {/* 2. Grupo: Propiedades (Accordion) */}
              <div className="sidebar-drawer__group">
                <button 
                  className={`sidebar-drawer__group-header ${isGroupActive(['/mis-inmuebles', '/mi-agenda', '/favoritos']) ? 'active' : ''}`}
                  onClick={() => toggleAccordion('propiedades')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building2 size={20} />
                    <span>Propiedades</span>
                  </div>
                  <ChevronRight size={16} className={`sidebar-drawer__arrow ${expandedGroup === 'propiedades' ? 'open' : ''}`} />
                </button>
                {expandedGroup === 'propiedades' && (
                  <div className="sidebar-drawer__sub-menu">
                    <Link to="/mis-inmuebles" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mis-inmuebles') ? 'active' : ''}`}>
                      <Building2 size={16} />
                      <span>Mis Inmuebles</span>
                    </Link>
                    <Link to="/mi-agenda" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mi-agenda') ? 'active' : ''}`}>
                      <Calendar size={16} />
                      <span>Mi Agenda</span>
                    </Link>
                    <Link to="/favoritos" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/favoritos') ? 'active' : ''}`}>
                      <Heart size={16} />
                      <span>Favoritos</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Grupo: Trámites y Finanzas (Accordion) */}
              <div className="sidebar-drawer__group">
                <button 
                  className={`sidebar-drawer__group-header ${isGroupActive(['/mis-contratos', '/mis-pagos', '/mis-finanzas']) ? 'active' : ''}`}
                  onClick={() => toggleAccordion('finanzas')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={20} />
                    <span>Trámites y Finanzas</span>
                  </div>
                  <ChevronRight size={16} className={`sidebar-drawer__arrow ${expandedGroup === 'finanzas' ? 'open' : ''}`} />
                </button>
                {expandedGroup === 'finanzas' && (
                  <div className="sidebar-drawer__sub-menu">
                    <Link to="/mis-contratos" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mis-contratos') ? 'active' : ''}`}>
                      <FileText size={16} />
                      <span>Mis Contratos</span>
                    </Link>
                    <Link to="/mis-pagos" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mis-pagos') ? 'active' : ''}`}>
                      <CreditCard size={16} />
                      <span>Mis Pagos</span>
                    </Link>
                    <Link to="/mis-finanzas" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mis-finanzas') ? 'active' : ''}`}>
                      <TrendingUp size={16} />
                      <span>Mis Finanzas</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 4. Grupo: Mensajería (Accordion) */}
              <div className="sidebar-drawer__group">
                <button 
                  className={`sidebar-drawer__group-header ${isGroupActive(['/mensajes', '/notificaciones']) ? 'active' : ''}`}
                  onClick={() => toggleAccordion('alertas')}
                  style={{ position: 'relative' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MessageSquare size={20} />
                    <span>Mensajería</span>
                  </div>
                  {(badges.notificaciones + badges.mensajes) > 0 && (
                    <span className="sidebar-drawer__badge-dot" />
                  )}
                  <ChevronRight size={16} className={`sidebar-drawer__arrow ${expandedGroup === 'alertas' ? 'open' : ''}`} />
                </button>
                {expandedGroup === 'alertas' && (
                  <div className="sidebar-drawer__sub-menu">
                    <Link to="/notificaciones" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/notificaciones') ? 'active' : ''}`} style={{ position: 'relative' }}>
                      <Bell size={16} />
                      <span>Notificaciones</span>
                      {badges.notificaciones > 0 && (
                        <span className="sidebar-drawer__badge">{badges.notificaciones}</span>
                      )}
                    </Link>
                    <Link to="/mensajes" onClick={() => setIsSidebarOpen(false)} className={`sidebar-drawer__sub-item ${location.pathname.startsWith('/mensajes') ? 'active' : ''}`} style={{ position: 'relative' }}>
                      <MessageSquare size={16} />
                      <span>Mensajes</span>
                      {badges.mensajes > 0 && (
                        <span className="sidebar-drawer__badge">{badges.mensajes}</span>
                      )}
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. Perfil */}
              <Link 
                to="/perfil" 
                className={`sidebar-drawer__item ${location.pathname.startsWith('/perfil') ? 'sidebar-drawer__item--active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <User size={20} />
                <span>Mi Perfil</span>
                <ChevronRight size={16} className="sidebar-drawer__chevron" />
              </Link>
            </div>

            {/* Botón de cerrar sesión al final */}
            <div className="sidebar-drawer__footer">
              <button 
                className="sidebar-drawer__logout-btn" 
                onClick={() => {
                  logout();
                  setIsSidebarOpen(false);
                }}
              >
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
