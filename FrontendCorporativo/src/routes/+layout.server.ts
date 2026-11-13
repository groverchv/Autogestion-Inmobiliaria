import type { ConfigSitio } from '$lib/types';
import { api } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	let config: ConfigSitio = {};
	try {
		config = await api.public<ConfigSitio>('/config');
	} catch {
		// Backend no disponible: el sitio se renderiza con valores por defecto.
	}
	return { config };
};
