import { env } from '$env/dynamic/private';
import type { AdminSesion } from '$lib/types';
import type { Cookies } from '@sveltejs/kit';

const API = env.PRIVATE_API_URL || 'http://localhost:8081';
const OPCIONES_COOKIE = {
	path: '/',
	httpOnly: true,
	sameSite: 'strict' as const,
	secure: false // true en producción detrás de HTTPS
};

interface TokenPayload {
	sub: string;
	nombre?: string;
	rol?: string;
	exp?: number;
}

function decodificar(token: string): TokenPayload | null {
	try {
		const parte = token.split('.')[1];
		const json = Buffer.from(parte, 'base64url').toString('utf-8');
		return JSON.parse(json) as TokenPayload;
	} catch {
		return null;
	}
}

export function sesionAdmin(cookies: Cookies): AdminSesion | null {
	const token = cookies.get('corp_token');
	if (!token) return null;
	const payload = decodificar(token);
	if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) return null;
	return {
		email: payload.sub,
		nombre: payload.nombre || payload.sub,
		rol: payload.rol || 'EDITOR'
	};
}

export function guardarSesion(cookies: Cookies, accessToken: string, refreshToken: string) {
	cookies.set('corp_token', accessToken, { ...OPCIONES_COOKIE, maxAge: 60 * 60 * 2 });
	cookies.set('corp_refresh', refreshToken, { ...OPCIONES_COOKIE, maxAge: 60 * 60 * 24 * 7 });
}

export function cerrarSesion(cookies: Cookies) {
	cookies.delete('corp_token', { path: '/' });
	cookies.delete('corp_refresh', { path: '/' });
}

/** Intenta renovar el access token usando el refresh token. */
export async function renovarSesion(cookies: Cookies): Promise<boolean> {
	const refresh = cookies.get('corp_refresh');
	if (!refresh) return false;
	try {
		const resp = await fetch(`${API}/api/corp/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: refresh })
		});
		if (!resp.ok) return false;
		const data = await resp.json();
		guardarSesion(cookies, data.accessToken, data.refreshToken);
		return true;
	} catch {
		return false;
	}
}
