import { api } from '$lib/server/api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Baja del boletín: el enlace de cada correo trae ?token= (opaco, sin exponer el email). */
export const load: PageServerLoad = async ({ url }) => {
	return {
		token: url.searchParams.get('token') ?? '',
		metaTitulo: 'Cancelar suscripción — Inmobiliaria 360',
		metaDescripcion: 'Gestiona tu suscripción al boletín de Inmobiliaria 360.'
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await request.formData();
		const token = String(form.get('token') ?? '');
		if (!token) return fail(400, { error: 'Enlace incompleto' });
		try {
			await api.publicPost('/newsletter/baja', { token }, getClientAddress());
			return { ok: true };
		} catch {
			return fail(500, { error: 'No pudimos procesar la baja. Intenta de nuevo.' });
		}
	}
};
