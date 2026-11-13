import type { Faq, MiembroEquipo, Testimonio } from '$lib/types';
import { api } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let equipo: MiembroEquipo[] = [];
	let testimonios: Testimonio[] = [];
	let faqs: Faq[] = [];
	try {
		[equipo, testimonios, faqs] = await Promise.all([
			api.public<MiembroEquipo[]>('/equipo'),
			api.public<Testimonio[]>('/testimonios'),
			api.public<Faq[]>('/faqs')
		]);
	} catch {}
	return {
		equipo,
		testimonios,
		faqs,
		metaTitulo: 'Nosotros — Inmobiliaria 360',
		metaDescripcion: 'Conoce al equipo detrás de la plataforma inmobiliaria que integra recorridos virtuales 360° e inteligencia artificial en Bolivia.'
	};
};
