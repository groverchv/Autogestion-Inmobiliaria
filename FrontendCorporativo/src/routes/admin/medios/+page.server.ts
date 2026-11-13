import { api, tokenDe } from '$lib/server/api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

interface Media {
	id: number;
	url: string;
	publicId?: string;
	nombre?: string;
	bytes?: number;
	creado: string;
}

interface Pagina<T> {
	content: T[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = tokenDe(cookies)!;
	const page = Number(url.searchParams.get('page') ?? 0);
	try {
		const medios = await api.admin<Pagina<Media>>(`/uploads/media?page=${page}&size=24`, token);
		return { medios, page, error: null };
	} catch (e) {
		return {
			medios: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 24 } as Pagina<Media>,
			page,
			error: e instanceof Error ? e.message : 'Error al cargar medios'
		};
	}
};

export const actions: Actions = {
	eliminar: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = tokenDe(cookies)!;
		try {
			await api.adminDelete(`/uploads/media/${data.get('id')}`, token);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al eliminar' });
		}
	}
};
