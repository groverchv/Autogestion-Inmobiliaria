import { api, tokenDe } from '$lib/server/api';
import type { BlogPost, Pagina } from '$lib/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = tokenDe(cookies)!;
	const page = Number(url.searchParams.get('page') ?? 0);
	try {
		const posts = await api.admin<Pagina<BlogPost & { estado: string }>>(`/blog?page=${page}&size=15`, token);
		return { posts, error: null };
	} catch (e) {
		return {
			posts: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 15 } as Pagina<BlogPost>,
			error: e instanceof Error ? e.message : 'Error al cargar posts'
		};
	}
};

export const actions: Actions = {
	publicar: async ({ request, cookies }) => {
		const id = (await request.formData()).get('id');
		try {
			await api.adminPost(`/blog/${id}/publicar`, {}, tokenDe(cookies)!);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error' });
		}
	},
	despublicar: async ({ request, cookies }) => {
		const id = (await request.formData()).get('id');
		try {
			await api.adminPost(`/blog/${id}/despublicar`, {}, tokenDe(cookies)!);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error' });
		}
	},
	eliminar: async ({ request, cookies }) => {
		const id = (await request.formData()).get('id');
		try {
			await api.adminDelete(`/blog/${id}`, tokenDe(cookies)!);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error' });
		}
	}
};
