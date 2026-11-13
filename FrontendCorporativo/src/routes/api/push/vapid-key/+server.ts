import { api } from '$lib/server/api';
import type { RequestHandler } from './$types';

/** Proxy BFF: la clave pública VAPID sin exponer el backend al navegador. */
export const GET: RequestHandler = async () => {
	try {
		const data = await api.public<{ publicKey: string }>('/push/vapid-key');
		return Response.json(data);
	} catch {
		return Response.json({ error: 'Push no disponible' }, { status: 503 });
	}
};
