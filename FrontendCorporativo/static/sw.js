/// <reference lib="webworker" />
/* Service Worker — Notificaciones Push de Inmobiliaria 360 */

self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	let data = { title: 'Inmobiliaria 360', body: 'Tienes una novedad', url: '/', icon: '/icons/icon.svg' };
	try {
		if (event.data) {
			data = { ...data, ...event.data.json() };
		}
	} catch (e) {
		if (event.data) data.body = event.data.text();
	}
	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: data.icon,
			badge: data.icon,
			data: { url: data.url },
			tag: 'inmo360-' + Date.now(),
			lang: 'es'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					client.navigate(url);
					return client.focus();
				}
			}
			return self.clients.openWindow(url);
		})
	);
});

/* ─── Caché básico para experiencia offline ───────────────────────
 * Estáticos (íconos, imágenes, build): cache-first.
 * Navegación (páginas HTML): network-first con respaldo en caché —
 * el sitio sigue abriéndose sin internet con el último contenido visto.
 * API: siempre a la red (los datos vivos no se sirven vencidos).
 */
const CACHE = 'corp-v1';

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);

	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;

	// Estáticos de build e íconos: cache-first
	if (url.pathname.startsWith('/_app/') || url.pathname.startsWith('/icons/')
		|| url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')
		|| url.pathname.endsWith('.webmanifest')) {
		event.respondWith(
			caches.match(req).then((hit) => hit || fetch(req).then((res) => {
				const copia = res.clone();
				caches.open(CACHE).then((c) => c.put(req, copia));
				return res;
			}))
		);
		return;
	}

	// Páginas: red primero, caché como respaldo offline
	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req).then((res) => {
				const copia = res.clone();
				caches.open(CACHE).then((c) => c.put(req, copia));
				return res;
			}).catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
		);
	}
});
