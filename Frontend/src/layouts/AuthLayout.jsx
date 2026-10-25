import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

/**
 * Layout limpio para pantallas de autenticación (Login/Registro).
 */
const AuthLayout = () => {
  return (
    <div className="auth-layout" id="auth-layout">
      <div className="auth-layout__bg">
        <img
          src="/logo_dark.png"
          alt="Nobleve Background"
          className="auth-layout__bg-watermark"
        />
      </div>
      <div className="auth-layout__card">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
