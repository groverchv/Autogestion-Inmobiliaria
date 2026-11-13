import { accionLead } from '$lib/server/leads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		metaTitulo: 'Vende tu propiedad — Inmobiliaria 360',
		metaDescripcion: 'Publica tu propiedad con fotografía profesional 360°, valuación con IA y verificación legal. Más visibilidad, venta más rápida.'
	};
};

export const actions = {
	vender: accionLead('/vender-propiedad', () => ({
		asunto: 'Quiero vender/publicar mi propiedad'
	}))
};
