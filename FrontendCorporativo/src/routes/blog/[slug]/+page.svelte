<script lang="ts">
	import BlogCard from '$lib/components/BlogCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Visor360 from '$lib/components/Visor360.svelte';
	import { formatoFecha } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	{#each data.jsonLd as ld}
		{@html `<script type="application/ld+json">${JSON.stringify(ld)}</script>`}
	{/each}
</svelte:head>

<article class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
	<nav class="mb-6 text-sm text-slate-500" aria-label="Migas de pan">
		<a href="/blog" class="hover:text-brand-600">Blog</a>
		{#if data.post.categoria}
			<span class="mx-2">/</span>
			<a href="/blog?categoria={encodeURIComponent(data.post.categoria)}" class="hover:text-brand-600">{data.post.categoria}</a>
		{/if}
		<span class="mx-2">/</span>
		<span class="text-slate-800">{data.post.titulo}</span>
	</nav>

	<header>
		{#if data.post.categoria}
			<span class="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
				{data.post.categoria}
			</span>
		{/if}
		<h1 class="text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">
			{data.post.titulo}
		</h1>
		<div class="mt-4 flex items-center gap-3 text-sm text-slate-500">
			<span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
				{(data.post.autorNombre ?? 'I')[0]}
			</span>
			<div>
				<p class="font-medium text-slate-700">{data.post.autorNombre ?? 'Inmobiliaria 360'}</p>
				<p class="text-xs">{formatoFecha(data.post.publicadoAt)}</p>
			</div>
		</div>
	</header>

	{#if data.post.slug === 'como-funcionan-recorridos-360'}
		<div class="mt-8">
			<Visor360 />
		</div>
	{:else if data.post.portadaUrl}
		<img
			src={data.post.portadaUrl}
			alt={data.post.titulo}
			class="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
		/>
	{/if}

	<div class="prose-contenido mt-10">
		{@html data.html}
	</div>

	<footer class="mt-14 rounded-2xl bg-navy-950 p-8 text-center text-white">
		<h2 class="text-xl font-bold">¿Te interesa el mercado inmobiliario?</h2>
		<p class="mt-2 text-sm text-slate-300">Conoce los servicios que ofrecemos con tecnología 360° e inteligencia artificial.</p>
		<a
			href="/servicios"
			class="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-400"
		>
			Ver servicios <Icon nombre="arrow-right" size={16} />
		</a>
	</footer>
</article>

{#if data.relacionados.length}
	<section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-labelledby="relacionados">
		<h2 id="relacionados" class="mb-6 text-xl font-bold text-navy-900">Artículos relacionados</h2>
		<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
			{#each data.relacionados as post (post.id)}
				<BlogCard {post} />
			{/each}
		</div>
	</section>
{/if}
