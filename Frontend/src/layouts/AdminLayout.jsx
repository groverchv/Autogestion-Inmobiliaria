import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AdminLayout.css';

const Icons = {
  dashboard: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>,
  usuarios: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  inmuebles: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  categorias: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  contratos: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  pagos: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  tarjeta: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  historial: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
  agenda: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  notificaciones: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  favoritos: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
};

/**
 * Layout del Panel Administrativo.
 * SOLO accesible por administradores. Los usuarios nunca llegan aquí.
 */
const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  // Todas las opciones son de admin — el ProtectedRoute ya garantiza
  // que solo administradores puedan acceder a este layout.
  const menuItems = [
    { to: '/panel/dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { to: '/panel/usuarios', label: 'Usuarios', icon: Icons.usuarios },
    { to: '/panel/inmuebles', label: 'Inmuebles', icon: Icons.inmuebles },
    { to: '/panel/categorias', label: 'Categorías', icon: Icons.categorias },
    { to: '/panel/contratos', label: 'Contratos', icon: Icons.contratos },
    { to: '/panel/pagos', label: 'Pagos', icon: Icons.pagos },
    { to: '/panel/tipo-pagos', label: 'Tipos de Pago', icon: Icons.tarjeta },
    { to: '/panel/historial-pagos', label: 'Historial', icon: Icons.historial },
    { to: '/panel/agenda', label: 'Agenda', icon: Icons.agenda },
    { to: '/panel/notificaciones', label: 'Notificaciones', icon: Icons.notificaciones },
    { to: '/panel/favoritos', label: 'Favoritos', icon: Icons.favoritos },
  ];

  return (
    <div className={`admin-layout ${collapsed ? 'admin-layout--collapsed' : ''}`}>
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__sidebar-header">
          <h3>{collapsed ? 'AI' : 'Panel Inmobiliario'}</h3>
          <button className="admin-layout__toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Colapsar'}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>
        <nav className="admin-layout__nav">
          {menuItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-layout__link ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <span className="admin-layout__link-icon">{item.icon}</span>
              {!collapsed && <span className="admin-layout__link-text">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-layout__main">
        <Navbar />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;