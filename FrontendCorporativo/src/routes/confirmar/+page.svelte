<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();
</script>

<section class="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4 py-20">
	<div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
		{#if data.estado === 'ok'}
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="check-circle" class="w-8 h-8 text-green-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Suscripción confirmada</h1>
			<p class="text-slate-600 mb-8">{data.mensaje || 'Ya eres parte de nuestro boletín. Recibirás nuestras novedades en tu correo.'}</p>
		{:else if data.estado === 'error'}
			<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="x" class="w-8 h-8 text-red-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Enlace no válido</h1>
			<p class="text-slate-600 mb-8">{data.mensaje || 'El enlace de confirmación expiró o ya fue utilizado. Puedes suscribirte nuevamente desde el sitio.'}</p>
		{:else}
			<div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<Icon nombre="mail" class="w-8 h-8 text-amber-600" />
			</div>
			<h1 class="text-2xl font-bold text-slate-900 mb-3">Confirma tu suscripción</h1>
			<p class="text-slate-600 mb-8">Para activar tu suscripción al boletín, abre el enlace que te enviamos por correo electrónico.</p>
		{/if}
		<a
			href="/"
			class="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
		>
			Volver al inicio
		</a>
	</div>
</section>
