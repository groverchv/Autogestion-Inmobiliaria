import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/store';

/**
 * Hook personalizado de autenticación
 */
const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout, fetchUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  const handleLogin = async (username, password) => {
    const user = await login(username, password);
    // Redirigir según rol
    if (user.rol_nombre === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/user/dashboard');
    }
    return user;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout,
  };
};

export default useAuth;
