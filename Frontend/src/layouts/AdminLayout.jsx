import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './AdminLayout.css';

/**
 * Layout para vistas de administrador con sidebar.
 */
const AdminLayout = () => {
  return (
    <div className="admin-layout" id="admin-layout">
      <aside className="admin-layout__sidebar">
        <div className="admin-layout__sidebar-header">
          <h3>⚙️ Panel Admin</h3>
        </div>
        <nav className="admin-layout__nav">
          <a href="/admin/dashboard" className="admin-layout__link">📊 Dashboard</a>
          <a href="/admin/usuarios" className="admin-layout__link">👥 Usuarios</a>
        </nav>
      </aside>
      <div className="admin-layout__main">
        <Navbar />
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
