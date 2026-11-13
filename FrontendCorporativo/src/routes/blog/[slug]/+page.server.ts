import type { BlogPost } from '$lib/types';
import { api } from '$lib/server/api';
import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	let post: BlogPost;
	try {
		post = await api.public<BlogPost>(`/blog/${params.slug}`);
	} catch {
		throw error(404, 'Artículo no encontrado');
	}

	const html = sanitizeHtml(await marked.parse(post.contenidoMd ?? ''), {
		allowedTags: ['h2', 'h3', 'h4', 'p', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'code', 'pre', 'img', 'hr'],
		allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
		transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener', target: '_blank' }) }
	});

	let relacionados: BlogPost[] = [];
	try {
		relacionados = await api.public<BlogPost[]>(`/blog/${params.slug}/relacionados`);
	} catch {}

	const base = url.origin;
	const jsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: post.titulo,
			description: post.resumen ?? post.titulo,
			image: post.portadaUrl ?? undefined,
			datePublished: post.publicadoAt,
			author: { '@type': 'Organization', name: 'Inmobiliaria 360', url: base },
			publisher: { '@type': 'Organization', name: 'Inmobiliaria 360', url: base },
			mainEntityOfPage: `${base}/blog/${post.slug}`
		},
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Inicio', item: base },
				{ '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
				{ '@type': 'ListItem', position: 3, name: post.titulo, item: `${base}/blog/${post.slug}` }
			]
		}
	];

	return {
		post,
		html,
		relacionados,
		jsonLd,
		metaTitulo: `${post.titulo} — Blog Inmobiliaria 360`,
		metaDescripcion: post.resumen ?? post.titulo,
		metaImagen: post.portadaUrl
	};
};
