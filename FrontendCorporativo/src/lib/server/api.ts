import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';

/**
 * Cliente server-side hacia el BackendCorporativo (Spring Boot).
 * El navegador nunca habla con Spring directamente (patrón BFF).
 */
async function request<T>(
	path: string,
	options: {
		method?: string;
		body?: unknown;
		token?: string;
		formData?: FormData;
		clientIp?: string;
	} = {}
): Promise<T> {
	const headers: Record<string, string> = {};
	if (options.body !== undefined) headers['Content-Type'] = 'application/json';
	if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
	if (options.clientIp) headers['X-Forwarded-For'] = options.clientIp;

	const resp = await fetch(`${API}${path}`, {
		method: options.method || 'GET',
		headers,
		body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined)
	});

	if (!resp.ok) {
		let detalle = `Error ${resp.status}`;
		let campos: Record<string, string> | undefined;
		try {
			const data = await resp.json();
			if (data?.error) detalle = data.error;
			if (data?.campos) {
				campos = data.campos;
				if (!data?.error) detalle = Object.values(data.campos).join(', ');
			}
		} catch {
			/* sin cuerpo JSON */
		}
		const error = new Error(detalle) as Error & { status: number; campos?: Record<string, string> };
		error.status = resp.status;
		error.campos = campos;
		throw error;
	}
	if (resp.status === 204) return undefined as T;
	return (await resp.json()) as T;
}

export const api = {
	public: <T>(path: string) => request<T>(`/api/corp/public${path}`),
	publicPost: <T>(path: string, body: unknown, clientIp?: string) =>
		request<T>(`/api/corp/public${path}`, { method: 'POST', body, clientIp }),

	admin: <T>(path: string, token: string) => request<T>(`/api/corp/admin${path}`, { token }),
	adminPost: <T>(path: string, body: unknown, token: string) =>
		request<T>(`/api/corp/admin${path}`, { method: 'POST', body, token }),
	adminPut: <T>(path: string, body: unknown, token: string) =>
		request<T>(`/api/corp/admin${path}`, { method: 'PUT', body, token }),
	adminPatch: <T>(path: string, body: unknown, token: string) =>
		request<T>(`/api/corp/admin${path}`, { method: 'PATCH', body, token }),
	adminDelete: <T>(path: string, token: string) =>
		request<T>(`/api/corp/admin${path}`, { method: 'DELETE', token }),
	adminUpload: <T>(path: string, formData: FormData, token: string) =>
		request<T>(`/api/corp/admin${path}`, { method: 'POST', formData, token })
};

export function tokenDe(cookies: Cookies): string | undefined {
	return cookies.get('corp_token');
}
