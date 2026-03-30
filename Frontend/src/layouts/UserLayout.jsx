import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * Layout para usuarios estándar con navbar.
 */
const UserLayout = () => {
  return (
    <div className="user-layout" id="user-layout">
      <Navbar />
      <main className="user-layout__content" style={{ padding: 'var(--spacing-xl)', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
