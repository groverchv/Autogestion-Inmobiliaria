<script lang="ts">
	import type { BlogPost } from '$lib/types';
	import { formatoFecha } from '$lib/format';
	import Icon from './Icon.svelte';
	import Visor360 from './Visor360.svelte';

	let { post }: { post: BlogPost } = $props();
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
		{:else if post.portadaUrl}
			<img
				src={post.portadaUrl}
				alt={post.titulo}
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
			/>
		{:else}
			<div class="flex h-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy-800 text-brand-400">
				<Icon nombre="newspaper" size={40} />
			</div>
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
