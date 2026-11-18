<script lang="ts">
	import type { BlogPost } from '$lib/types';
	import { formatoFecha } from '$lib/format';
	import Icon from './Icon.svelte';
	import Visor360 from './Visor360.svelte';

	interface Props {
		post: BlogPost;
	}

	let { post }: Props = $props();

	const fallbackImages: Record<string, string> = {
		'tendencias-mercado-inmobiliario-2026': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
		'guia-compra-primer-departamento': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
		'como-funcionan-recorridos-360': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
	};

	const imagenPortada = $derived(post.portadaUrl || fallbackImages[post.slug] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80');
</script>

<a
	href="/blog/{post.slug}"
	class="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
>
	<div class="aspect-[16/9] overflow-hidden bg-slate-100">
		{#if post.slug === 'como-funcionan-recorridos-360'}
			<div class="tarjeta-visor">
				<Visor360 alto={225} mostrarAyuda={false} />
			</div>
		{:else}
			<img
				src={imagenPortada}
				alt={post.titulo}
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
			/>
		{/if}
	</div>
	<div class="flex flex-1 flex-col p-3 sm:p-5">
		<p class="text-xs font-medium uppercase tracking-wide text-brand-600">
			{formatoFecha(post.publicadoAt)}
		</p>
		<h3 class="mt-2 line-clamp-2 font-bold text-navy-900 group-hover:text-brand-700">{post.titulo}</h3>
		{#if post.resumen}
			<p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">{post.resumen}</p>
		{/if}
		<span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
			Leer artículo <Icon nombre="arrow-right" size={15} />
		</span>
	</div>
</a>

<style>
	.tarjeta-visor {
		height: 100%;
	}
	.tarjeta-visor :global(.visor-wrap) {
		margin: 0;
	}
	.tarjeta-visor :global(.visor360) {
		border-radius: 0;
		height: 100%;
	}
</style>
