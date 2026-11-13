import { api, tokenDe } from '$lib/server/api';
import type { BlogPost } from '$lib/types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	guardar: async ({ request, cookies }) => {
		const data = await request.formData();
		try {
			const post = await api.adminPost<BlogPost>('/blog', {
				titulo: data.get('titulo'),
				slug: data.get('slug') || undefined,
				resumen: data.get('resumen'),
				contenidoMd: data.get('contenidoMdHidden') ?? data.get('contenidoMd'),
				portadaUrl: data.get('portadaUrl') || null,
				categoria: data.get('categoria') || null,
				estado: data.get('estado')
			}, tokenDe(cookies)!);
			throw redirect(303, `/admin/blog`);
		} catch (e) {
			if (e instanceof Response) throw e;
			return fail(400, { error: e instanceof Error ? e.message : 'Error al guardar' });
		}
	}
};
