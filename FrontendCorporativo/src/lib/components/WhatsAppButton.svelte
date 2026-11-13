<script lang="ts">
	import Icon from './Icon.svelte';

	let { numero }: { numero: string | undefined } = $props();

	const url = $derived(
		numero
			? `https://wa.me/${numero.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, me interesa una propiedad de Inmobiliaria 360.')}`
			: null
	);
</script>

{#if url}
	<a
		href={url}
		target="_blank"
		rel="noopener"
		aria-label="Contactar por WhatsApp"
		class="fixed bottom-20 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 lg:bottom-5"
	>
		<Icon nombre="message-circle" size={26} />
	</a>
{/if}
