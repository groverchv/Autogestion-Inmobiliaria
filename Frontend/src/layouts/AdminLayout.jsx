import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Home, Archive, FileText, Banknote, 
  CreditCard, History, Calendar, Bell, Heart, ChevronRight, ChevronLeft 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import './AdminLayout.css';

/**
 * Layout del Panel Administrativo.
 * SOLO accesible por administradores. Los usuarios nunca llegan aquí.
 */
const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { to: '/panel/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/panel/usuarios', label: 'Usuarios', icon: <Users size={20} /> },
    { to: '/panel/inmuebles', label: 'Inmuebles', icon: <Home size={20} /> },
    { to: '/panel/categorias', label: 'Categorías', icon: <Archive size={20} /> },
    { to: '/panel/contratos', label: 'Contratos', icon: <FileText size={20} /> },
    { to: '/panel/pagos', label: 'Pagos', icon: <Banknote size={20} /> },
    { to: '/panel/tipo-pagos', label: 'Tipos de Pago', icon: <CreditCard size={20} /> },
    { to: '/panel/historial-pagos', label: 'Historial', icon: <History size={20} /> },
    { to: '/panel/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
    { to: '/panel/notificaciones', label: 'Notificaciones', icon: <Bell size={20} /> },
    { to: '/panel/favoritos', label: 'Favoritos', icon: <Heart size={20} /> },
  ];

  return (
    <div className={`admin-layout ${collapsed ? 'admin-layout--collapsed' : ''}`}>
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__sidebar-header">
          <div className="admin-layout__brand">
            <Home className="admin-layout__brand-icon" size={collapsed ? 24 : 20} />
            {!collapsed && <h3>Panel Admin</h3>}
          </div>
          <button 
            className="admin-layout__toggle" 
            onClick={() => setCollapsed(!collapsed)} 
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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