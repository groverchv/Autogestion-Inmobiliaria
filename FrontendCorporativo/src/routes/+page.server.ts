import type { HomeData } from '$lib/types';
import { api } from '$lib/server/api';
import { accionLead, accionNewsletter } from '$lib/server/leads';
import { jsonLdOrganizacion, jsonLdWebsite } from '$lib/seo';
import type { PageServerLoad } from './$types';

const homeVacio: HomeData = {
	banners: [], servicios: [], testimonios: [], equipo: [],
	faqs: [], posts: [], config: {}
};

export const load: PageServerLoad = async () => {
	let home = homeVacio;
	try {
		home = await api.public<HomeData>('/home');
	} catch {
		// Backend caído: sección destacada vacía, resto del sitio funciona.
	}
	return {
		home,
		jsonLd: [jsonLdOrganizacion(home.config), jsonLdWebsite(home.config)]
	};
};

export const actions = {
	newsletter: accionNewsletter,
	contacto: accionLead('/contacto')
};
