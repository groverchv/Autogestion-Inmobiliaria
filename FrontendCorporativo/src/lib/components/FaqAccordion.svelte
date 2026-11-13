<script lang="ts">
	import type { Faq } from '$lib/types';
	import Icon from './Icon.svelte';

	let { faqs }: { faqs: Faq[] } = $props();
	let abierto = $state<number | null>(0);
</script>

<div class="mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
	{#each faqs as faq, i (faq.id)}
		<div>
			<button
				class="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
				onclick={() => (abierto = abierto === i ? null : i)}
				aria-expanded={abierto === i}
			>
				<span class="font-semibold text-navy-900">{faq.pregunta}</span>
				<Icon
					nombre="chevron-down"
					size={18}
					class="shrink-0 text-slate-400 transition-transform {abierto === i ? 'rotate-180' : ''}"
				/>
			</button>
			{#if abierto === i}
				<p class="px-6 pb-5 text-sm leading-relaxed text-slate-600">{faq.respuesta}</p>
			{/if}
		</div>
	{/each}
</div>
