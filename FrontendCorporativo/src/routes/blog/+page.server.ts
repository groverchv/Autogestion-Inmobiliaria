import type { BlogPost, Pagina } from '$lib/types';
import { api } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const pagina = Number(url.searchParams.get('page') ?? 0);
	const q = url.searchParams.get('q') ?? '';
	const categoria = url.searchParams.get('categoria') ?? '';
	let posts: Pagina<BlogPost> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 9 };
	let categorias: string[] = [];
	const params = new URLSearchParams({ page: String(pagina), size: '9' });
	if (q) params.set('q', q);
	if (categoria) params.set('categoria', categoria);
	try {
		[posts, categorias] = await Promise.all([
			api.public<Pagina<BlogPost>>(`/blog?${params}`),
			api.public<string[]>('/blog/categorias')
		]);
	} catch {}
	return {
		posts,
		categorias,
		q,
		categoria,
		metaTitulo: 'Blog — Inmobiliaria 360',
		metaDescripcion: 'Análisis del mercado inmobiliario boliviano, guías de compra y venta, y novedades de la plataforma 360°.'
	};
};
