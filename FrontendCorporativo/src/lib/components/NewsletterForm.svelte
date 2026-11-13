<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';

	let { compacto = false }: { compacto?: boolean } = $props();
	let enviando = $state(false);
	let estado = $state<'idle' | 'ok' | 'error'>('idle');
	let mensaje = $state('');
</script>

{#if estado === 'ok'}
	<p class="flex items-center gap-2 text-sm text-emerald-400">
		<Icon nombre="check-circle" size={16} /> {mensaje}
	</p>
{:else}
	<form
		method="POST"
		action="/?/newsletter"
		use:enhance={() => {
			enviando = true;
			return async ({ result }) => {
				enviando = false;
				if (result.type === 'success') {
					estado = 'ok';
					mensaje = (result.data as { mensaje?: string })?.mensaje ?? 'Suscripción registrada';
				} else if (result.type === 'failure') {
					estado = 'error';
					mensaje = (result.data as { error?: string })?.error ?? 'No se pudo suscribir';
				}
			};
		}}
		class={compacto ? 'flex gap-2' : 'mx-auto flex max-w-md gap-2'}
	>
		<input type="text" name="empresaWeb" tabindex="-1" autocomplete="off" class="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
		<label for={compacto ? 'newsletter-email-footer' : 'newsletter-email'} class="sr-only">
			Correo electrónico
		</label>
		<input
			id={compacto ? 'newsletter-email-footer' : 'newsletter-email'}
			type="email"
			name="email"
			required
			placeholder="tu@correo.com"
			class="min-w-0 flex-1 rounded-lg border border-slate-600 bg-navy-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
		/>
		<button
			type="submit"
			disabled={enviando}
			class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
		>
			{#if enviando}<Icon nombre="loader" size={15} class="animate-spin" />{:else}<Icon nombre="send" size={15} />{/if}
			<span class="hidden sm:inline">Suscribirme</span>
		</button>
	</form>
	{#if estado === 'error'}
		<p class="mt-2 text-xs text-red-400">{mensaje}</p>
	{/if}
{/if}
