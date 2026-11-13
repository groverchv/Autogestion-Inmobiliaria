<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let enviando = $state(false);

	const grupos: { titulo: string; prefijo: string }[] = [
		{ titulo: 'Empresa', prefijo: 'empresa_' },
		{ titulo: 'Contacto', prefijo: 'contacto_' },
		{ titulo: 'Horario', prefijo: 'horario_' },
		{ titulo: 'Redes sociales', prefijo: 'social_' },
		{ titulo: 'Estadísticas del home', prefijo: 'stats_' },
		{ titulo: 'CTA del home', prefijo: 'home_' }
	];

	function etiqueta(clave: string): string {
		return clave
			.replace(/^(empresa|contacto|social|stats|home|horario)_/, '')
			.replace(/_/g, ' ')
			.replace(/^./, (c) => c.toUpperCase());
	}
</script>

<svelte:head><title>Configuración — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Configuración del sitio</h1>
	<p class="mt-1 text-sm text-slate-500">Datos de la empresa visibles en todo el sitio público.</p>
</div>

{#if form?.mensaje}
	<div class="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
		<Icon nombre="check-circle" size={17} /> {form.mensaje}
	</div>
{/if}
{#if data.error}
	<div class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.error}</div>
{/if}

<form
	method="POST"
	action="?/guardar"
	use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; await update(); }; }}
>
	<div class="space-y-6">
		{#each grupos as grupo (grupo.prefijo)}
			{@const items = data.items.filter((i) => i.clave.startsWith(grupo.prefijo))}
			{#if items.length}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="mb-4 font-bold text-navy-900">{grupo.titulo}</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						{#each items as item (item.clave)}
							<label class="block">
								<span class="mb-1 block text-sm font-medium text-slate-600">{etiqueta(item.clave)}</span>
								<input
									name="cfg_{item.clave}"
									value={item.valor ?? ''}
									class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
								/>
							</label>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>

	<div class="mt-6 flex justify-end">
		<button
			disabled={enviando}
			class="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-6 py-3 font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
		>
			{#if enviando}<Icon nombre="loader" size={17} class="animate-spin" />{:else}<Icon nombre="save" size={17} />{/if}
			Guardar configuración
		</button>
	</div>
</form>
