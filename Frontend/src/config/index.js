// Configuración centralizada de variables de entorno
// Trigger Netlify production rebuild
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
