import { api } from '$lib/server/api';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Proxy BFF: chat del asistente IA corporativo (con rate limit de backend). */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { mensaje, historial } = await request.json();
	if (!mensaje || typeof mensaje !== 'string') {
		return json({ ok: false, error: 'Mensaje vacío' }, { status: 400 });
	}
	try {
		const r = await api.publicPost<{
			ok: boolean;
			texto: string;
			sugerencias: string[];
			accion: Record<string, unknown>;
		}>(
			'/agente',
			{
				mensaje: mensaje.slice(0, 1000),
				historial: Array.isArray(historial) ? historial.slice(-8) : []
			},
			getClientAddress()
		);
		return json(r);
	} catch (e) {
		return json(
			{
				ok: false,
				texto: 'El asistente no pudo responder ahora. Escríbenos por WhatsApp o usa el formulario de contacto.',
				sugerencias: []
			},
			{ status: 200 }
		);
	}
};
