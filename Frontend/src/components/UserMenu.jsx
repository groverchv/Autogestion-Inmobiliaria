import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import {
  ChevronDown, Search, Building2, Calendar, Heart,
  TrendingUp, MessageSquare, Bell, User, Camera, PlusCircle
} from 'lucide-react';
import CrearFotoModal from './CrearFotoModal';
import './UserMenu.css';

const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: '50%', right: '12px',
      transform: 'translateY(-50%)',
      background: '#ef4444', color: 'var(--color-surface)', fontSize: '0.65rem',
      fontWeight: 700, borderRadius: '10px', padding: '1px 6px',
      minWidth: '16px', textAlign: 'center', lineHeight: '14px'
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const UserMenu = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [badges, setBadges] = useState({ notificaciones: 0, mensajes: 0 });
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [isCrearFotoOpen, setIsCrearFotoOpen] = useState(false);
  const cuentaRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cuentaRef.current && !cuentaRef.current.contains(event.target)) {
        setCuentaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  const currentPath = location.pathname;

  const getStyle = (path) => {
    const isActive = currentPath.startsWith(path) && path !== '/' || currentPath === path;
    return {
      color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
      background: isActive ? 'rgba(14,165,233,0.08)' : undefined,
      textDecoration: 'none',
      fontWeight: isActive ? 600 : 500,
    };
  };

  const cuentaPaths = ['/mi-actividad', '/mi-agenda', '/mis-contratos', '/mis-pagos', '/mis-inmuebles', '/mis-finanzas', '/favoritos', '/perfil'];
  const cuentaActive = cuentaPaths.some(p => currentPath.startsWith(p));

  return (
    <div className="user-menu-wrapper" id="packaged-user-menu">
      <nav className="hero-nav">

        {/* 1. Explorar */}
        <Link to="/propiedades" className="hero-nav__link" style={getStyle('/propiedades')}>
          <Search size={16} />
          <span>Explorar</span>
        </Link>

        {/* 2. Mi cuenta */}
        <div className="hero-nav__dropdown" ref={cuentaRef}>
          <button
            className={`hero-nav__dropdown-btn ${cuentaActive ? 'active' : ''}`}
            onClick={() => setCuentaOpen(v => !v)}
          >
            <User size={16} />
            <span>Mi cuenta</span>
            <ChevronDown size={14} className={`arrow ${cuentaOpen ? 'open' : ''}`} />
          </button>
          {cuentaOpen && (
            <div className="hero-nav__dropdown-menu">
              <Link to="/mi-actividad" onClick={() => setCuentaOpen(false)} className="dropdown-item">
                <Calendar size={15} />
                <span>Mi actividad</span>
              </Link>
              <Link to="/mis-inmuebles" onClick={() => setCuentaOpen(false)} className="dropdown-item">
                <Building2 size={15} />
                <span>Mis propiedades</span>
              </Link>
              <Link to="/mis-finanzas" onClick={() => setCuentaOpen(false)} className="dropdown-item">
                <TrendingUp size={15} />
                <span>Mis finanzas</span>
              </Link>
              <Link to="/favoritos" onClick={() => setCuentaOpen(false)} className="dropdown-item">
                <Heart size={15} />
                <span>Mis favoritos</span>
              </Link>
              <Link to="/perfil" onClick={() => setCuentaOpen(false)} className="dropdown-item">
                <User size={15} />
                <span>Mi perfil</span>
              </Link>
              <button
                type="button"
                className="dropdown-item"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => { setCuentaOpen(false); setIsCrearFotoOpen(true); }}
              >
                <Camera size={15} />
                <span>Cambiar foto de perfil</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Mensajes */}
        <Link
          to="/mensajes"
          className="hero-nav__link"
          style={{ ...getStyle('/mensajes'), position: 'relative' }}
        >
          <MessageSquare size={16} />
          <span>Mensajes</span>
          {badges.mensajes > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '4px',
              background: '#ef4444', color: '#fff', fontSize: '0.6rem',
              fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
            }}>
              {badges.mensajes > 99 ? '99+' : badges.mensajes}
            </span>
          )}
        </Link>

        {/* 4. Notificaciones */}
        <Link
          to="/notificaciones"
          className="hero-nav__link"
          aria-label={`Notificaciones${badges.notificaciones > 0 ? ` (${badges.notificaciones} sin leer)` : ''}`}
          style={{ ...getStyle('/notificaciones'), position: 'relative' }}
        >
          <Bell size={16} />
          <span>Avisos</span>
          {badges.notificaciones > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '4px',
              background: '#ef4444', color: '#fff', fontSize: '0.6rem',
              fontWeight: 700, borderRadius: '10px', padding: '1px 5px',
            }}>
              {badges.notificaciones > 99 ? '99+' : badges.notificaciones}
            </span>
          )}
        </Link>

        {/* 5. Publicar propiedad — acción destacada */}
        <Link
          to="/mis-inmuebles"
          className="hero-nav__link hero-nav__btn-crear-foto"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          <PlusCircle size={16} />
          <span>Publicar propiedad</span>
        </Link>

      </nav>

      <CrearFotoModal
        isOpen={isCrearFotoOpen}
        onClose={() => setIsCrearFotoOpen(false)}
      />
    </div>
  );
};

export default UserMenu;
