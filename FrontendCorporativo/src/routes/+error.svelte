<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	const es404 = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{es404 ? 'Página no encontrada' : 'Error'} — Inmobiliaria 360</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center px-4 py-16">
	<div class="text-center">
		<p class="text-7xl font-extrabold text-brand-500 sm:text-8xl">{page.status}</p>
		<h1 class="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">
			{es404 ? 'Página no encontrada' : 'Algo salió mal'}
		</h1>
		<p class="mx-auto mt-3 max-w-md text-slate-500">
			{es404
				? 'La dirección que buscas no existe o fue movida. Revisa el enlace o vuelve al inicio.'
				: (page.error?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.')}
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a
				href="/"
				class="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-800"
			>
				<Icon nombre="home" size={17} /> Volver al inicio
			</a>
			<a
				href="/contacto"
				class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
			>
				Contactarnos
			</a>
		</div>
	</div>
</div>
