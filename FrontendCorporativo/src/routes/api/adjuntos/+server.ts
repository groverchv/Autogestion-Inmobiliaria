import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';
const MAX = 5 * 1024 * 1024;

/** Proxy BFF: sube el CV del postulante a Spring (que lo guarda en Cloudinary). */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const form = await request.formData();
	const archivo = form.get('archivo');
	if (!(archivo instanceof File) || archivo.size === 0) {
		throw error(400, 'Archivo vacío');
	}
	if (archivo.size > MAX) {
		throw error(400, 'Máximo 5 MB');
	}
	const salida = new FormData();
	salida.append('archivo', archivo);
	const resp = await fetch(`${API}/api/corp/public/adjuntos`, {
		method: 'POST',
		headers: { 'X-Forwarded-For': getClientAddress() },
		body: salida
	});
	if (!resp.ok) {
		let mensaje = 'No se pudo subir el archivo';
		try {
			const data = await resp.json();
			if (data?.error) mensaje = data.error;
		} catch {}
		throw error(resp.status, mensaje);
	}
	return json(await resp.json());
};
