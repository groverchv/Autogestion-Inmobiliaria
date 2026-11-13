import { api, tokenDe } from '$lib/server/api';
import type { BlogPost } from '$lib/types';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	try {
		const post = await api.admin<BlogPost>(`/blog/${params.id}`, tokenDe(cookies)!);
		return { post };
	} catch {
		throw error(404, 'Artículo no encontrado');
	}
};

export const actions: Actions = {
	guardar: async ({ request, cookies, params }) => {
		const data = await request.formData();
		try {
			await api.adminPut<BlogPost>(`/blog/${params.id}`, {
				titulo: data.get('titulo'),
				slug: data.get('slug'),
				resumen: data.get('resumen'),
				contenidoMd: data.get('contenidoMdHidden') ?? data.get('contenidoMd'),
				portadaUrl: data.get('portadaUrl') || null,
				categoria: data.get('categoria') || null,
				estado: data.get('estado')
			}, tokenDe(cookies)!);
			throw redirect(303, '/admin/blog');
		} catch (e) {
			if (e instanceof Response) throw e;
			return fail(400, { error: e instanceof Error ? e.message : 'Error al guardar' });
		}
	}
};
