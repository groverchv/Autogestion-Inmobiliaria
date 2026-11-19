import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/store';

/**
 * Hook personalizado de autenticación
 */
const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout: storeLogout, fetchUser, updateUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  const handleLogin = async (username, password) => {
    const user = await login(username, password);
    const role = user?.rol?.toLowerCase() || '';

    // Suscribir y registrar token FCM al iniciar sesión
    try {
      const { solicitarPermisoNotificaciones } = await import('../services/firebaseMessaging');
      await solicitarPermisoNotificaciones();
    } catch (_) {}
    
    if (role === 'admin') {
      navigate('/panel/dashboard');
    } else {
      navigate('/propiedades');
    }
    return user;
  };

  const handleLogout = () => {
    storeLogout();
    navigate('/propiedades');
  };

  const handleLoginWithGoogle = async (idToken) => {
    const { loginWithGoogle } = useStore.getState();
    const user = await loginWithGoogle(idToken);
    const role = user?.rol?.toLowerCase() || '';

    // Suscribir y registrar token FCM al iniciar sesión con Google
    try {
      const { solicitarPermisoNotificaciones } = await import('../services/firebaseMessaging');
      await solicitarPermisoNotificaciones();
    } catch (_) {}

    if (role === 'admin') {
      navigate('/panel/dashboard');
    } else {
      navigate('/propiedades');
    }
    return user;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    loginWithGoogle: handleLoginWithGoogle,
    logout: handleLogout,
    updateUser,
  };
};

export default useAuth;
