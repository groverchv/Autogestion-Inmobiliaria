import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserMenu from '../components/UserMenu';

const UserLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <UserMenu />
      <Outlet />
    </div>
  );
};

export default UserLayout;
