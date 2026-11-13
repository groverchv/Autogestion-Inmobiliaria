import type { Vacante } from '$lib/types';
import { api } from '$lib/server/api';
import { accionLead, camposVacante } from '$lib/server/leads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let vacantes: Vacante[] = [];
	try {
		vacantes = await api.public<Vacante[]>('/vacantes');
	} catch {}
	return {
		vacantes,
		metaTitulo: 'Trabaja con nosotros — Inmobiliaria 360',
		metaDescripcion: 'Únete al equipo que está transformando el sector inmobiliario con IA y realidad aumentada.'
	};
};

export const actions = {
	postulacion: accionLead('/postulaciones', (data, url) => ({
		...camposVacante(data),
		asunto: `Postulación: ${data.get('tituloVacante') ?? url.searchParams.get('puesto') ?? 'general'}`
	}))
};
