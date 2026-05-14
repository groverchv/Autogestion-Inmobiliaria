import api from './api';

/**
 * Servicio para gestión de contratos.
 */
const contratoService = {
  /**
   * Obtiene la lista de contratos del usuario.
   */
  getAll: async () => {
    const { data } = await api.get('/inmuebles/contratos/');
    return data.results || data;
  },

  /**
   * Aceptar un contrato.
   */
  aceptar: async (id) => {
    const { data } = await api.post(`/inmuebles/contratos/${id}/aceptar/`);
    return data;
  },

  /**
   * Rechazar un contrato.
   */
  rechazar: async (id, motivo) => {
    const { data } = await api.post(`/inmuebles/contratos/${id}/rechazar/`, { motivo });
    return data;
  },

  /**
   * Descarga de Contrato en PDF.
   */
  downloadPdf: async (id) => {
    const response = await api.get(`/inmuebles/contratos/${id}/pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Genera un Contrato en PDF usando IA.
   */
  generarContratoIA: async (id) => {
    const response = await api.get(`/inmuebles/contratos/${id}/generar-ia/`, {
      responseType: 'blob', // Crítico para no corromper el binario
    });
    return response.data;
  },
};

export default contratoService;
