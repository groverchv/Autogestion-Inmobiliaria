import { api, tokenDe } from '$lib/server/api';
import type { Lead } from '$lib/types';
import type { PageServerLoad } from './$types';

interface Stats {
	leads_nuevos: number;
	leads_total: number;
	suscriptores_newsletter: number;
	suscriptores_push: number;
	posts_publicados: number;
	ultimos_leads: Lead[];
	leads_por_dia: { dia: string; total: number }[];
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = tokenDe(cookies)!;
	try {
		const stats = await api.admin<Stats>('/stats', token);
		return { stats, error: null };
	} catch (e) {
		return {
			stats: null,
			error: e instanceof Error ? e.message : 'No se pudieron cargar las estadísticas'
		};
	}
};
