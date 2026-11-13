<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let soportado = $state(false);
	let suscrito = $state(false);
	let visible = $state(false);
	let cargando = $state(false);

	onMount(async () => {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
		await navigator.serviceWorker.register('/sw.js');
		soportado = true;
		const reg = await navigator.serviceWorker.ready;
		suscrito = !!(await reg.pushManager.getSubscription());
		const descartado = localStorage.getItem('push-descartado');
		if (!suscrito && !descartado && Notification.permission === 'default') {
			setTimeout(() => (visible = true), 8000);
		}
	});

	function base64AUint8(base64: string): Uint8Array {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = atob(b64);
		return Uint8Array.from(raw, (c) => c.charCodeAt(0));
	}

	async function suscribir() {
		cargando = true;
		try {
			const permiso = await Notification.requestPermission();
			if (permiso !== 'granted') {
				visible = false;
				return;
			}
			const reg = await navigator.serviceWorker.ready;
			const { publicKey } = await fetch('/api/push/vapid-key').then((r) => r.json());
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: base64AUint8(publicKey) as BufferSource
			});
			const json = sub.toJSON();
			await fetch('/api/push/suscripciones', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					endpoint: json.endpoint,
					keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
					userAgent: navigator.userAgent
				})
			});
			suscrito = true;
			visible = false;
		} catch (e) {
			console.error('Error suscribiendo a push:', e);
		} finally {
			cargando = false;
		}
	}

	function descartar() {
		localStorage.setItem('push-descartado', '1');
		visible = false;
	}
</script>

{#if visible && soportado && !suscrito}
	<div
		class="fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
		role="dialog"
		aria-label="Notificaciones"
	>
		<div class="flex items-start gap-3">
			<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
				<Icon nombre="bell-ring" size={20} />
			</span>
			<div class="flex-1">
				<h3 class="text-sm font-bold text-navy-900">Mantente al día</h3>
				<p class="mt-1 text-xs leading-relaxed text-slate-500">
					Recibe alertas de nuevos servicios, artículos del blog y novedades de la empresa.
				</p>
			</div>
		</div>
		<div class="mt-4 flex gap-2">
			<button
				onclick={suscribir}
				disabled={cargando}
				class="flex-1 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
			>
				{cargando ? 'Activando...' : 'Activar'}
			</button>
			<button
				onclick={descartar}
				class="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
			>
				Ahora no
			</button>
		</div>
	</div>
{/if}
