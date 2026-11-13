import { api } from '$lib/server/api';
import type { PageServerLoad } from './$types';

/** Confirma el doble opt-in: el enlace del correo llega aquí con ?token=. */
export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	let estado: 'ok' | 'error' | 'sin_token' = 'sin_token';
	let mensaje = '';
	if (token) {
		try {
			const r = await api.public<{ mensaje?: string }>(
				`/newsletter/confirmar?token=${encodeURIComponent(token)}`
			);
			estado = 'ok';
			mensaje = r.mensaje ?? 'Suscripción confirmada';
		} catch (e) {
			estado = 'error';
			mensaje = e instanceof Error ? e.message : 'Enlace inválido o ya utilizado';
		}
	}
	return {
		estado,
		mensaje,
		metaTitulo: 'Confirmar suscripción — Inmobiliaria 360',
		metaDescripcion: 'Confirmación de suscripción al boletín de Inmobiliaria 360.'
	};
};
