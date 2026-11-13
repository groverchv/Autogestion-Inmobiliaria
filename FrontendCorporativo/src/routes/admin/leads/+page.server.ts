import { api, tokenDe } from '$lib/server/api';
import type { Lead, Pagina } from '$lib/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = tokenDe(cookies)!;
	const estado = url.searchParams.get('estado') ?? '';
	const tipo = url.searchParams.get('tipo') ?? '';
	const page = Number(url.searchParams.get('page') ?? 0);

	const params = new URLSearchParams({ page: String(page), size: '20' });
	if (estado) params.set('estado', estado);
	if (tipo) params.set('tipo', tipo);

	try {
		const leads = await api.admin<Pagina<Lead>>(`/leads?${params}`, token);
		return { leads, estado, tipo, error: null };
	} catch (e) {
		return {
			leads: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 } as Pagina<Lead>,
			estado, tipo,
			error: e instanceof Error ? e.message : 'Error al cargar leads'
		};
	}
};

export const actions: Actions = {
	actualizar: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id');
		const token = tokenDe(cookies)!;
		try {
			await api.adminPatch(`/leads/${id}`, {
				estado: data.get('estado') || undefined,
				notaInterna: data.get('notaInterna') ?? undefined
			}, token);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al actualizar' });
		}
	},
	eliminar: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = data.get('id');
		const token = tokenDe(cookies)!;
		try {
			await api.adminDelete(`/leads/${id}`, token);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al eliminar' });
		}
	}
};
