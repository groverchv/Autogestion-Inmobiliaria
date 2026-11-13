import { env } from '$env/dynamic/private';
import { guardarSesion } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Completa todos los campos', email });
		}
		try {
			const resp = await fetch(`${API}/api/corp/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			if (!resp.ok) {
				return fail(401, { error: 'Credenciales inválidas', email });
			}
			const tokens = await resp.json();
			guardarSesion(cookies, tokens.accessToken, tokens.refreshToken);
		} catch (e) {
			if (e instanceof Response) throw e;
			return fail(503, { error: 'Backend no disponible. Verifica que Spring Boot esté corriendo.', email });
		}
		throw redirect(303, url.searchParams.get('redirect') ?? '/admin');
	}
};
