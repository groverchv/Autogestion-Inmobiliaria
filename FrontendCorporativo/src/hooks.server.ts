import { renovarSesion, sesionAdmin } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

/** Resuelve la sesión admin desde la cookie JWT. */
const sesion: Handle = async ({ event, resolve }) => {
	event.locals.admin = sesionAdmin(event.cookies);
	if (!event.locals.admin && event.cookies.get('corp_refresh')) {
		if (await renovarSesion(event.cookies)) {
			event.locals.admin = sesionAdmin(event.cookies);
		}
	}
	return resolve(event);
};

/** Protege /admin/* (excepto login). */
const guardia: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
		if (!event.locals.admin) {
			return new Response(null, {
				status: 302,
				headers: { location: `/admin/login?redirect=${encodeURIComponent(pathname)}` }
			});
		}
	}
	if (pathname === '/admin/login' && event.locals.admin) {
		return new Response(null, { status: 302, headers: { location: '/admin' } });
	}
	return resolve(event);
};

/** Cabeceras de seguridad y política de caché del SSR. */
const seguridad: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), geolocation=(self)');

	// CSP: recursos propios + Cloudinary (imágenes) + Google Maps (embed oficinas).
	// 'unsafe-inline' en script/style es necesario por el SSR de SvelteKit.
	if (!event.url.pathname.startsWith('/admin')) {
		response.headers.set(
			'Content-Security-Policy',
			[
				"default-src 'self'",
				"script-src 'self' 'unsafe-inline'",
				"style-src 'self' 'unsafe-inline'",
				"img-src 'self' data: blob: https://res.cloudinary.com",
				"font-src 'self' data:",
				"connect-src 'self' blob: https://res.cloudinary.com",
				"worker-src 'self' blob:",
				"frame-src https://www.google.com https://maps.google.com",
				"media-src 'self'",
				"object-src 'none'",
				"base-uri 'self'",
				"form-action 'self'",
				"frame-ancestors 'none'",
				"upgrade-insecure-requests"
			].join('; ')
		);
	}
	// HSTS solo cuando el sitio se sirve por HTTPS (evita romper localhost).
	if (event.url.protocol === 'https:') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=63072000; includeSubDomains; preload'
		);
	}

	const { pathname } = event.url;
	if (pathname.startsWith('/admin')) {
		// Panel privado: nunca cachear
		response.headers.set('Cache-Control', 'no-store');
	} else if (event.request.method === 'GET' && response.status === 200) {
		// Páginas públicas: el navegador/proxy revalida tras 60s
		response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
	}
	return response;
};

export const handle = sequence(sesion, guardia, seguridad);
