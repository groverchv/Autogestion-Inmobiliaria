import { env } from '$env/dynamic/private';
import { api } from '$lib/server/api';
import type { RequestHandler } from './$types';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const data = await api.publicPost('/push/suscripciones', body, getClientAddress());
		return Response.json(data, { status: 201 });
	} catch (e) {
		return Response.json(
			{ error: e instanceof Error ? e.message : 'Error al suscribir' },
			{ status: 502 }
		);
	}
};

export const DELETE: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const body = await request.json();
		const resp = await fetch(`${API}/api/corp/public/push/suscripciones`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': getClientAddress() },
			body: JSON.stringify(body)
		});
		return Response.json(await resp.json());
	} catch {
		return Response.json({ error: 'Error al desuscribir' }, { status: 502 });
	}
};
