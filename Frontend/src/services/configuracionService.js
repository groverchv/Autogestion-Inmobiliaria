import axiosInstance from './api';

const configuracionService = {
  obtenerConfiguracion: async () => {
    try {
      const response = await axiosInstance.get('/pagos/configuracion/');
      // Al ser Singleton, siempre nos interesa el primer elemento si devuelve un array
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching configuracion:', error);
      throw error;
    }
  },
  actualizarConfiguracion: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/pagos/configuracion/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating configuracion:', error);
      throw error;
    }
  }
};

export default configuracionService;
