import { env } from '$env/dynamic/private';
import { tokenDe } from '$lib/server/api';
import type { RequestHandler } from './$types';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';

/** Proxy BFF: subida de imágenes del CMS a Spring/Cloudinary con el JWT del admin. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const token = tokenDe(cookies);
	if (!token) return Response.json({ error: 'No autenticado' }, { status: 401 });

	try {
		const formData = await request.formData();
		const resp = await fetch(`${API}/api/corp/admin/uploads/imagen`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body: formData
		});
		const data = await resp.json();
		return Response.json(data, { status: resp.status });
	} catch {
		return Response.json({ error: 'Error al subir la imagen' }, { status: 502 });
	}
};
