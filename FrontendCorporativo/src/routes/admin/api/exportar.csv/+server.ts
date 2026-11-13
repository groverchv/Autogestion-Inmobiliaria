import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';

/** Proxy BFF: descarga el CSV de contactos desde Spring con el JWT del admin. */
export const GET: RequestHandler = async ({ cookies, url }) => {
	const token = cookies.get('corp_token');
	if (!token) throw error(401, 'No autenticado');
	const qs = url.searchParams.toString();
	const resp = await fetch(`${API}/api/corp/admin/leads/exportar.csv${qs ? '?' + qs : ''}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!resp.ok) throw error(resp.status, 'Error al exportar');
	return new Response(resp.body, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition':
				resp.headers.get('Content-Disposition') ?? 'attachment; filename="contactos.csv"'
		}
	});
};
