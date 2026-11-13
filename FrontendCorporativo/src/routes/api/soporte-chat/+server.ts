import { api } from '$lib/server/api';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Proxy BFF: el chatbot deriva a un lead SOPORTE cuando no resuelve la duda. */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { nombre, email, mensaje } = await request.json();
	if (!nombre || !email || !mensaje) {
		return json({ ok: false, error: 'Completa nombre, email y mensaje' }, { status: 400 });
	}
	try {
		await api.publicPost(
			'/soporte',
			{
				nombre: String(nombre).slice(0, 120),
				email: String(email).slice(0, 150),
				asunto: 'Consulta desde el asistente virtual',
				mensaje: String(mensaje).slice(0, 2000),
				origenUrl: '/chatbot'
			},
			getClientAddress()
		);
		return json({ ok: true });
	} catch (e) {
		return json(
			{ ok: false, error: e instanceof Error ? e.message : 'No se pudo enviar, intenta por WhatsApp' },
			{ status: 502 }
		);
	}
};
