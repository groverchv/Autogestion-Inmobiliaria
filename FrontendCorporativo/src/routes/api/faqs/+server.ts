import { api } from '$lib/server/api';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Proxy BFF: FAQs públicas para el chatbot de soporte (1h de caché de navegador). */
export const GET: RequestHandler = async () => {
	try {
		const faqs = await api.public<unknown[]>('/faqs');
		return json(faqs, { headers: { 'Cache-Control': 'public, max-age=3600' } });
	} catch {
		return json([], { status: 200 });
	}
};
