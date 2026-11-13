<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	onMount(() => {
		visible = !localStorage.getItem('cookie-consent');
	});

	function responder(valor: 'aceptado' | 'rechazado') {
		localStorage.setItem('cookie-consent', valor);
		visible = false;
	}
</script>

{#if visible}
	<div
		class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur"
		role="dialog"
		aria-label="Aviso de cookies"
	>
		<div class="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
			<p class="text-center text-sm text-slate-600 sm:text-left">
				Usamos cookies propias y de terceros para mejorar tu experiencia y habilitar
				funciones como las notificaciones. Consulta nuestra
				<a href="/legal/cookies" class="font-medium text-brand-600 underline">política de cookies</a>.
			</p>
			<div class="flex shrink-0 gap-3">
				<button
					onclick={() => responder('rechazado')}
					class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
				>
					Solo esenciales
				</button>
				<button
					onclick={() => responder('aceptado')}
					class="rounded-lg bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
				>
					Aceptar todas
				</button>
			</div>
		</div>
	</div>
{/if}
