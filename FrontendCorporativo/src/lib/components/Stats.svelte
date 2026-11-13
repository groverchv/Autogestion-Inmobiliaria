<script lang="ts">
	import type { ConfigSitio } from '$lib/types';

	let { config }: { config: ConfigSitio } = $props();

	const stats = $derived(
		[
			{ valor: config.stats_anios, etiqueta: 'Años de experiencia', sufijo: '+' },
			{ valor: config.stats_propiedades, etiqueta: 'Propiedades gestionadas', sufijo: '+' },
			{ valor: config.stats_clientes, etiqueta: 'Clientes atendidos', sufijo: '+' },
			{ valor: config.stats_ciudades, etiqueta: 'Ciudades', sufijo: '' }
		].filter((s) => s.valor)
	);
</script>

{#if stats.length}
	<section class="border-y border-slate-200 bg-slate-50">
		<div class="mx-auto grid max-w-7xl grid-cols-4 gap-2 px-4 py-12 sm:gap-6 sm:px-6">
			{#each stats as stat (stat.etiqueta)}
				<div class="text-center">
					<p class="text-4xl font-extrabold text-navy-900 sm:text-5xl">
						{stat.valor}<span class="text-brand-500">{stat.sufijo}</span>
					</p>
					<p class="mt-2 text-sm font-medium text-slate-500">{stat.etiqueta}</p>
				</div>
			{/each}
		</div>
	</section>
{/if}
