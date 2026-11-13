<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let copiado = $state<number | null>(null);

	function formatoBytes(b?: number): string {
		if (!b) return '';
		return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
	}

	async function copiar(url: string, id: number) {
		await navigator.clipboard.writeText(url);
		copiado = id;
		setTimeout(() => (copiado = null), 1500);
	}
</script>

<svelte:head><title>Medios — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Biblioteca de medios</h1>
	<p class="mt-1 text-sm text-slate-500">
		Imágenes subidas a Cloudinary. Sube nuevas desde el botón de imagen en los editores de contenido y blog.
	</p>
</div>

{#if data.error}
	<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.error}</div>
{:else if !data.medios.content.length}
	<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-500">
		<Icon nombre="image" size={40} class="mx-auto mb-3 text-slate-300" />
		Aún no hay imágenes subidas.
	</div>
{:else}
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
		{#each data.medios.content as m (m.id)}
			<figure class="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
				<img src={m.url} alt={m.nombre ?? 'Imagen subida'} class="aspect-video w-full object-cover" loading="lazy" />
				<figcaption class="p-3">
					<p class="truncate text-xs font-medium text-navy-900" title={m.nombre}>{m.nombre ?? 'Sin nombre'}</p>
					<p class="text-[11px] text-slate-400">{formatoBytes(m.bytes)}</p>
					<div class="mt-2 flex gap-1.5">
						<button
							onclick={() => copiar(m.url, m.id)}
							class="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
						>
							{copiado === m.id ? '¡Copiado!' : 'Copiar URL'}
						</button>
						<form method="POST" action="?/eliminar" use:enhance>
							<input type="hidden" name="id" value={m.id} />
							<button
								class="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
								aria-label="Eliminar imagen"
							>
								<Icon nombre="trash" size={12} />
							</button>
						</form>
					</div>
				</figcaption>
			</figure>
		{/each}
	</div>

	{#if data.medios.totalPages > 1}
		<nav class="mt-6 flex justify-center gap-2" aria-label="Paginación de medios">
			{#if data.page > 0}
				<a href="?page={data.page - 1}" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Anterior</a>
			{/if}
			<span class="px-4 py-2 text-sm text-slate-500">Página {data.page + 1} de {data.medios.totalPages}</span>
			{#if data.page < data.medios.totalPages - 1}
				<a href="?page={data.page + 1}" class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Siguiente</a>
			{/if}
		</nav>
	{/if}
{/if}
