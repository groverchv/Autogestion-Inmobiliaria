<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const insignias: Record<string, string> = {
		NUEVO: 'bg-emerald-100 text-emerald-700',
		MEJORA: 'bg-brand-100 text-brand-700',
		CORRECCION: 'bg-amber-100 text-amber-700'
	};
	const textoTipo: Record<string, string> = { NUEVO: 'Nuevo', MEJORA: 'Mejora', CORRECCION: 'Corrección' };

	function fechaLarga(iso: string): string {
		return new Date(iso + 'T00:00:00').toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Producto</span>
		<h1 class="mt-2 text-4xl font-extrabold">Actualizaciones</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Historial de versiones de la plataforma. Cada publicación incluye novedades, mejoras y correcciones.
		</p>
	</div>
</section>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	{#if data.versiones.length === 0}
		<div class="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
			<Icon nombre="newspaper" size={36} class="mx-auto text-slate-300" />
			<p class="mt-4 font-semibold text-navy-900">Aún no hay versiones publicadas</p>
			<p class="mt-1 text-sm text-slate-500">Cuando liberemos una actualización aparecerá en esta página.</p>
		</div>
	{:else}
		<ol class="relative space-y-10 border-l-2 border-slate-200 pl-8">
			{#each data.versiones as v (v.id)}
				<li class="relative">
					<span class="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-500 bg-white">
						<span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
					</span>
					<div class="flex flex-wrap items-center gap-3">
						<span class="rounded-lg bg-navy-900 px-3 py-1 font-mono text-sm font-bold text-white">v{v.version}</span>
						<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {insignias[v.tipo] ?? insignias.MEJORA}">
							{textoTipo[v.tipo] ?? v.tipo}
						</span>
						<time class="text-sm text-slate-400" datetime={v.fecha}>{fechaLarga(v.fecha)}</time>
					</div>
					<h2 class="mt-3 text-xl font-bold text-navy-900">{v.titulo}</h2>
					<div class="prose prose-slate mt-3 max-w-none text-sm [&_li]:my-0.5 [&_ul]:list-disc [&_ul]:pl-5">
						{@html v.html}
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>
