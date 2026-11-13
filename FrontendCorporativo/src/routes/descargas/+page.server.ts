import { env } from '$env/dynamic/public';
import { api } from '$lib/server/api';
import type { VersionLanzamiento } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let ultima: string | null = null;
	try {
		const versiones = await api.public<VersionLanzamiento[]>('/changelog');
		ultima = versiones[0]?.version ?? null;
	} catch {}
	return {
		appUrl: env.PUBLIC_APP_URL || 'http://localhost:5173',
		ultima,
		metaTitulo: 'Descargas y acceso — Inmobiliaria 360',
		metaDescripcion: 'Accede a la plataforma web de Inmobiliaria 360 o descarga la aplicación móvil para Android.'
	};
};
