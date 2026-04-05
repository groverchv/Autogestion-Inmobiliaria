import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import './Propiedades.css';

const MisNotificaciones = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="propiedades-page">
      <Navbar />
      {isAuthenticated && user?.rol !== 'admin' && (
        <UserMenu />
      )}
      <div className="propiedades-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>No tienes notificaciones por el momento.</p>
      </div>
    </div>
  );
};

export default MisNotificaciones;
