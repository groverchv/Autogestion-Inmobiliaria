<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';

	let { data, form } = $props();
	let enviando = $state(false);
</script>

<section class="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4 py-20">
	<div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
		{#if form?.ok}
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="check-circle" class="w-8 h-8 text-green-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Suscripción cancelada</h1>
			<p class="text-slate-600 mb-8">
				Dejarás de recibir nuestro boletín. Si fue un error, puedes volver a suscribirte cuando quieras.
			</p>
			<a href="/" class="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
				Volver al inicio
			</a>
		{:else if data.token}
			<div class="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="mail" class="w-8 h-8 text-brand-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Cancelar suscripción</h1>
			<p class="text-slate-600 mb-6">
				¿Seguro que deseas dejar de recibir el boletín de Inmobiliaria 360?
			</p>
			{#if form?.error}
				<p class="text-red-600 text-sm mb-4">{form.error}</p>
			{/if}
			<form method="POST" use:enhance={() => { enviando = true; return async ({ update }) => { await update(); enviando = false; }; }}>
				<input type="hidden" name="token" value={data.token} />
				<button
					type="submit"
					disabled={enviando}
					class="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors mb-3"
				>
					{enviando ? 'Procesando…' : 'Sí, cancelar mi suscripción'}
				</button>
			</form>
			<a href="/" class="text-sm text-brand-600 hover:underline">No, volver al inicio</a>
		{:else}
			<div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="mail" class="w-8 h-8 text-amber-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Enlace incompleto</h1>
			<p class="text-slate-600 mb-8">
				Para cancelar tu suscripción usa el enlace «Cancelar suscripción» incluido al final de cada correo del boletín.
			</p>
			<a href="/" class="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
				Volver al inicio
			</a>
		{/if}
	</div>
</section>
