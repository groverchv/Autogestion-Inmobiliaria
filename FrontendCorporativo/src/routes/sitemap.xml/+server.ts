import { env } from '$env/dynamic/public';
import { api } from '$lib/server/api';
import type { RequestHandler } from './$types';

const SITE = env.PUBLIC_SITE_URL || 'http://localhost:5174';

export const GET: RequestHandler = async () => {
	const estaticas = [
		{ path: '/', prioridad: '1.0', frecuencia: 'daily' },
		{ path: '/servicios', prioridad: '0.9', frecuencia: 'weekly' },
		{ path: '/planes', prioridad: '0.9', frecuencia: 'weekly' },
		{ path: '/nosotros', prioridad: '0.7', frecuencia: 'monthly' },
		{ path: '/blog', prioridad: '0.8', frecuencia: 'daily' },
		{ path: '/contacto', prioridad: '0.6', frecuencia: 'monthly' },
		{ path: '/trabaja-con-nosotros', prioridad: '0.5', frecuencia: 'weekly' },
		{ path: '/vende-tu-propiedad', prioridad: '0.7', frecuencia: 'weekly' },
		{ path: '/descargas', prioridad: '0.6', frecuencia: 'monthly' },
		{ path: '/actualizaciones', prioridad: '0.5', frecuencia: 'weekly' },
		{ path: '/estado', prioridad: '0.3', frecuencia: 'daily' }
	];

	let posts: { slug: string; fecha: string }[] = [];
	try {
		const datos = await api.public<{ posts: { slug: string; fecha: string }[] }>('/sitemap-datos');
		posts = datos.posts;
	} catch {}

	const urls = [
		...estaticas.map(
			(e) => `  <url>
    <loc>${SITE}${e.path}</loc>
    <changefreq>${e.frecuencia}</changefreq>
    <priority>${e.prioridad}</priority>
  </url>`
		),
		...posts.map(
			(p) => `  <url>
    <loc>${SITE}/blog/${p.slug}</loc>
    ${p.fecha ? `<lastmod>${p.fecha.split('T')[0]}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
		)
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
};
