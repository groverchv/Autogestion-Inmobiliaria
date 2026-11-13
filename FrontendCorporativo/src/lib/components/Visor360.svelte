<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// URL del mismo origen: Kaspersky/antivirus permiten connect-src 'self'.
	import panoUrl from '$lib/assets/panorama_sala.jpg';

	let {
		panorama = panoUrl,
		alto = 420,
		mostrarAyuda = true
	}: { panorama?: string; alto?: number; mostrarAyuda?: boolean } = $props();

	let el = $state<HTMLDivElement>() as HTMLDivElement;
	let fallo = $state(false);
	let viewer: { destroy: () => void } | null = null;

	onMount(async () => {
		try {
			const { Viewer } = await import('@photo-sphere-viewer/core');
			const { AutorotatePlugin } = await import('@photo-sphere-viewer/autorotate-plugin');
			await import('@photo-sphere-viewer/core/index.css');
			viewer = new Viewer({
				container: el,
				panorama,
				navbar: false,
				defaultYaw: 0,
				defaultPitch: 0,
				defaultZoomLvl: 35,
				mousewheel: false,
				touchmoveTwoFingers: false,
				plugins: [
					AutorotatePlugin.withConfig({
						autorotateSpeed: '0.6rpm',
						autorotatePitch: 0,
						autostartDelay: 1500
					})
				]
			});
		} catch {
			fallo = true;
		}
	});

	onDestroy(() => viewer?.destroy());
</script>

<div class="visor-wrap">
	{#if fallo}
		<img src={panorama} alt="Sala de una casa en panorámica" class="visor-fallback" style="height: {alto}px" />
		<div class="visor-estado">No se pudo activar el modo 360°. Revisa tu conexión e inténtalo de nuevo.</div>
	{:else}
		<div bind:this={el} class="visor360" style="height: {alto}px" role="img" aria-label="Panorámica 360° de una sala — arrastra para mirar alrededor"></div>
	{/if}
	{#if mostrarAyuda}
		<p class="visor-ayuda">Arrastra la imagen para mirar alrededor. En el teléfono se mueve con el giroscopio.</p>
	{/if}
</div>

<style>
	.visor-wrap {
		margin: 2rem 0;
	}
	.visor360,
	.visor-fallback {
		width: 100%;
		border-radius: 1rem;
		overflow: hidden;
		background: #0f172a;
		object-fit: cover;
	}
	.visor-estado {
		margin-top: 0.5rem;
		text-align: center;
		color: #64748b;
		font-size: 0.875rem;
	}
	.visor-ayuda {
		margin-top: 0.5rem;
		text-align: center;
		font-size: 0.8rem;
		color: #94a3b8;
	}
</style>
