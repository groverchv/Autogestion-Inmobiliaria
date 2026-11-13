<script lang="ts">
	import BlogCard from '$lib/components/BlogCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Blog</span>
		<h1 class="mt-2 text-4xl font-extrabold">Mercado, guías y novedades</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Análisis con datos reales y consejos prácticos para comprar, vender y alquilar mejor.
		</p>
	</div>
</section>

<section class="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
	<form method="GET" action="/blog" class="flex flex-wrap items-center gap-3" role="search">
		<div class="relative flex-1 min-w-60">
			<Icon nombre="search" size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
			<input
				type="search"
				name="q"
				value={data.q}
				placeholder="Buscar artículos…"
				aria-label="Buscar artículos del blog"
				class="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
			/>
		</div>
		{#if data.categoria}
			<input type="hidden" name="categoria" value={data.categoria} />
		{/if}
		<button type="submit" class="rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800">
			Buscar
		</button>
	</form>

	{#if data.categorias.length}
		<div class="mt-5 flex flex-wrap items-center gap-2" aria-label="Categorías del blog">
			<a
				href="/blog{data.q ? '?q=' + encodeURIComponent(data.q) : ''}"
				class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors
					{!data.categoria ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}"
			>
				Todas
			</a>
			{#each data.categorias as cat (cat)}
				<a
					href="/blog?categoria={encodeURIComponent(cat)}{data.q ? '&q=' + encodeURIComponent(data.q) : ''}"
					class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors
						{data.categoria === cat ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}"
				>
					{cat}
				</a>
			{/each}
		</div>
	{/if}
</section>

<section class="mx-auto max-w-7xl px-4 py-10 sm:px-6">
	{#if data.posts.content.length}
		<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
			{#each data.posts.content as post (post.id)}
				<BlogCard {post} />
			{/each}
		</div>
		<Pagination
			totalPages={data.posts.totalPages}
			actual={data.posts.number}
			base="/blog{data.q || data.categoria ? '?' + new URLSearchParams({ ...(data.q && { q: data.q }), ...(data.categoria && { categoria: data.categoria }) }).toString() : ''}"
		/>
	{:else}
		<div class="rounded-2xl border border-dashed border-slate-300 py-20 text-center">
			<Icon nombre="newspaper" size={40} class="mx-auto text-slate-300" />
			<p class="mt-4 font-medium text-slate-600">
				{data.q || data.categoria ? 'No hay artículos que coincidan con tu búsqueda.' : 'Aún no hay publicaciones.'}
			</p>
			{#if data.q || data.categoria}
				<a href="/blog" class="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">Ver todos los artículos</a>
			{/if}
		</div>
	{/if}
</section>
