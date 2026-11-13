import type { Oficina } from '$lib/types';
import { api } from '$lib/server/api';
import { accionLead } from '$lib/server/leads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let oficinas: Oficina[] = [];
	try {
		oficinas = await api.public<Oficina[]>('/oficinas');
	} catch {}
	return {
		oficinas,
		metaTitulo: 'Contacto — Inmobiliaria 360',
		metaDescripcion: 'Contáctanos por WhatsApp, correo o visítanos en nuestras oficinas. Respuesta en menos de 24 horas hábiles.'
	};
};

export const actions = {
	contacto: accionLead('/contacto'),
	soporte: accionLead('/soporte')
};
