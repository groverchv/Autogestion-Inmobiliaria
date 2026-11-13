import type { Servicio } from '$lib/types';
import { api } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let servicios: Servicio[] = [];
	try {
		servicios = await api.public<Servicio[]>('/servicios');
	} catch {}
	return {
		servicios,
		metaTitulo: 'Servicios — Inmobiliaria 360',
		metaDescripcion: 'Venta, alquiler, anticrético, recorridos virtuales 360°, valuación inteligente y verificación legal de propiedades.'
	};
};
