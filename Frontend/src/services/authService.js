import api from './api';

/**
 * Servicio de autenticación
 */
const authService = {
  /** Iniciar sesión */
  login: async (email, password) => {
    const { data } = await api.post('/token/', { email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  /** Iniciar sesión con Google (Firebase Auth) */
  loginWithGoogle: async (idToken) => {
    const { data } = await api.post('/usuarios/login/google/', { id_token: idToken });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  /** Cerrar sesión */
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /** Registrar nuevo usuario */
  register: async (userData) => {
    const { data } = await api.post('/usuarios/registro/', userData);
    return data;
  },

  /** Obtener perfil del usuario autenticado */
  getProfile: async () => {
    const { data } = await api.get('/usuarios/lista/me/');
    return data;
  },

  /** Actualizar perfil del usuario autenticado */
  updateProfile: async (userData) => {
    const { data } = await api.patch('/usuarios/lista/me/', userData);
    return data;
  },

  /** Verificar si hay token activo */
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
