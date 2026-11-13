<script lang="ts">
	import type { Testimonio } from '$lib/types';
	import { iniciales } from '$lib/format';
	import Icon from './Icon.svelte';

	let { testimonio }: { testimonio: Testimonio } = $props();
</script>

<figure class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
	<div class="mb-3 flex gap-0.5 text-amber-400" aria-label="{testimonio.estrellas} de 5 estrellas">
		{#each Array(5) as _, i (i)}
			<Icon nombre="star" size={16} class={i < testimonio.estrellas ? 'fill-amber-400' : 'text-slate-200'} />
		{/each}
	</div>
	<blockquote class="flex-1 text-sm leading-relaxed text-slate-600">
		"{testimonio.texto}"
	</blockquote>
	<figcaption class="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
		{#if testimonio.avatarUrl}
			<img src={testimonio.avatarUrl} alt={testimonio.nombreCliente} class="h-10 w-10 rounded-full object-cover" loading="lazy" />
		{:else}
			<span class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
				{iniciales(testimonio.nombreCliente)}
			</span>
		{/if}
		<div>
			<p class="text-sm font-semibold text-navy-900">{testimonio.nombreCliente}</p>
			{#if testimonio.cargo}
				<p class="text-xs text-slate-500">{testimonio.cargo}</p>
			{/if}
		</div>
	</figcaption>
</figure>
