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
   * @param {number} id - ID del contrato
   * @param {string} instrucciones - Texto libre del usuario (escrito o transcrito de audio)
   */
  generarContratoIA: async (id, instrucciones = '') => {
    const response = await api.post(`/inmuebles/contratos/${id}/generar-ia/`, 
      { instrucciones },
      { responseType: 'blob' } // Crítico para no corromper el binario
    );
    return response.data;
  },

  /**
   * Chat con el asistente IA de contratos (abogado virtual).
   * @param {number} id - ID del contrato
   * @param {Array} mensajes - Historial completo [{role: 'user'|'assistant', content: string}]
   * @returns {Promise<string>} Respuesta del asistente
   */
  chatIA: async (id, mensajes) => {
    const { data } = await api.post(`/inmuebles/contratos/${id}/chat-ia/`, { mensajes });
    return data.respuesta;
  },
};

export default contratoService;
