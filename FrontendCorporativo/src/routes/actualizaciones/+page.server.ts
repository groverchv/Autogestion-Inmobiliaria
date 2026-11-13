import type { VersionLanzamiento } from '$lib/types';
import { api } from '$lib/server/api';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let versiones: { id: number; version: string; titulo: string; tipo: string; fecha: string; html: string }[] = [];
	try {
		const datos = await api.public<VersionLanzamiento[]>('/changelog');
		versiones = await Promise.all(
			datos.map(async (v) => ({
				id: v.id,
				version: v.version,
				titulo: v.titulo,
				tipo: v.tipo,
				fecha: v.fechaPublicacion,
				html: sanitizeHtml(await marked.parse(v.descripcionMd ?? ''), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h2', 'h3']),
					transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener', target: '_blank' }) }
				})
			}))
		);
	} catch {}
	return {
		versiones,
		metaTitulo: 'Actualizaciones — Inmobiliaria 360',
		metaDescripcion: 'Historial de versiones, mejoras y novedades de la plataforma Inmobiliaria 360.'
	};
};
