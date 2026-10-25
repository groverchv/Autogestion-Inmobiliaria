import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserMenu from '../components/UserMenu';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner';

const UserLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <UserMenu />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <Footer />
      <CookieBanner />
    </div>
  );
};

export default UserLayout;
