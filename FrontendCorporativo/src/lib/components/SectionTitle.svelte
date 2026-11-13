<script lang="ts">
	interface Props {
		etiqueta?: string;
		titulo: string;
		subtitulo?: string;
		centrado?: boolean;
	}

	let { etiqueta, titulo, subtitulo, centrado = true }: Props = $props();
</script>

<div class="mb-10 {centrado ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}">
	{#if etiqueta}
		<span class="mb-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
			{etiqueta}
		</span>
	{/if}
	<h2 class="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{titulo}</h2>
	{#if subtitulo}
		<p class="mt-3 text-lg text-slate-500">{subtitulo}</p>
	{/if}
</div>
