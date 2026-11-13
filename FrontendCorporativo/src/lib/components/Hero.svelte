<script lang="ts">
	import type { Banner } from '$lib/types';
	import Icon from './Icon.svelte';
	import { onMount } from 'svelte';

	let { banners }: { banners: Banner[] } = $props();
	let indice = $state(0);

	const actual = $derived(banners.length ? banners[indice % banners.length] : null);

	onMount(() => {
		if (banners.length <= 1) return;
		const id = setInterval(() => {
			indice = (indice + 1) % banners.length;
		}, 6000);
		return () => clearInterval(id);
	});
</script>

<section class="relative overflow-hidden bg-navy-950 text-white">
	<div
		class="absolute inset-0 opacity-40 transition-all duration-700"
		style:background-image={actual?.imagenUrl ? `url(${actual.imagenUrl})` : undefined}
		style:background-size="cover"
		style:background-position="center"
	></div>
	<div class="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-navy-900/40"></div>

	<div class="relative mx-auto flex min-h-[300px] max-w-7xl flex-col justify-center px-4 py-8 sm:min-h-[520px] sm:px-6 sm:py-20">
		{#key indice}
			{#if actual}
				<div class="max-w-2xl">
					<span class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300 sm:mb-4 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
						<Icon nombre="sparkles" size={12} />
						Inmobiliaria con tecnología 360°
					</span>
					<h1 class="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
						{actual.titulo}
					</h1>
					{#if actual.subtitulo}
						<p class="mt-3 text-sm leading-relaxed text-slate-300 sm:mt-5 sm:text-xl">{actual.subtitulo}</p>
					{/if}
					<div class="mt-5 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-4">
						{#if actual.ctaTexto && actual.ctaUrl}
							<a
								href={actual.ctaUrl}
								class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-colors hover:bg-brand-400 sm:gap-2 sm:px-6 sm:py-3.5 sm:text-base"
							>
								{actual.ctaTexto}
								<Icon nombre="arrow-right" size={15} />
							</a>
						{/if}
						<a
							href="/contacto"
							class="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-6 sm:py-3.5 sm:text-base"
						>
							Contáctanos
						</a>
					</div>
				</div>
			{/if}
		{/key}
	</div>

	{#if banners.length > 1}
		<div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
			{#each banners as _, i (i)}
				<button
					class="h-2 rounded-full transition-all {i === indice ? 'w-8 bg-brand-400' : 'w-2 bg-white/40 hover:bg-white/60'}"
					onclick={() => (indice = i)}
					aria-label="Ir al banner {i + 1}"
				></button>
			{/each}
		</div>
	{/if}
</section>
