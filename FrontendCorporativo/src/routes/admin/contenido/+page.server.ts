import { api, tokenDe } from '$lib/server/api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const ENTIDADES = ['banners', 'servicios', 'testimonios', 'equipo', 'faqs', 'oficinas', 'vacantes', 'versiones', 'planes'] as const;

export const load: PageServerLoad = async ({ cookies }) => {
	const token = tokenDe(cookies)!;
	const datos: Record<string, unknown[]> = {};
	for (const entidad of ENTIDADES) {
		try {
			datos[entidad] = await api.admin<unknown[]>(`/${entidad}`, token);
		} catch {
			datos[entidad] = [];
		}
	}
	return { datos };
};

const CAMPOS_NUMERICOS = new Set(['orden', 'estrellas', 'lat', 'lng', 'precio', 'maxInmuebles']);
const CAMPOS_BOOLEANOS = new Set(['activo', 'principal', 'publicado', 'destacado']);

export const actions: Actions = {
	guardar: async ({ request, cookies }) => {
		const data = await request.formData();
		const entidad = String(data.get('entidad'));
		const id = String(data.get('id') ?? '');
		if (!ENTIDADES.includes(entidad as (typeof ENTIDADES)[number])) {
			return fail(400, { error: 'Entidad inválida' });
		}

		const cuerpo: Record<string, unknown> = {};
		for (const [key, value] of data.entries()) {
			if (key === 'entidad' || key === 'id') continue;
			if (CAMPOS_NUMERICOS.has(key)) {
				cuerpo[key] = value === '' ? null : Number(value);
			} else if (value === '') {
				cuerpo[key] = null;
			} else {
				cuerpo[key] = value;
			}
		}
		// Checkboxes ausentes = false
		for (const key of CAMPOS_BOOLEANOS) {
			cuerpo[key] = data.has(key) ? true : false;
		}

		const token = tokenDe(cookies)!;
		try {
			if (id) {
				await api.adminPut(`/${entidad}/${id}`, cuerpo, token);
			} else {
				await api.adminPost(`/${entidad}`, cuerpo, token);
			}
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al guardar' });
		}
	},

	eliminar: async ({ request, cookies }) => {
		const data = await request.formData();
		const entidad = String(data.get('entidad'));
		const id = String(data.get('id'));
		if (!ENTIDADES.includes(entidad as (typeof ENTIDADES)[number])) {
			return fail(400, { error: 'Entidad inválida' });
		}
		try {
			await api.adminDelete(`/${entidad}/${id}`, tokenDe(cookies)!);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al eliminar' });
		}
	}
};
