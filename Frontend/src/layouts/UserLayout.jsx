import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserMenu from '../components/UserMenu';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner';
import AgenteWidget from '../components/AgenteWidget';

const UserLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
      <a href="#contenido-principal" className="skip-link">Saltar al contenido principal</a>
      <Navbar />
      <UserMenu />
      <main id="contenido-principal" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
      <AgenteWidget />
    </div>
  );
};

export default UserLayout;
