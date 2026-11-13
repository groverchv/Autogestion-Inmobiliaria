<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import LeadForm from '$lib/components/LeadForm.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';

	const beneficios = [
		{ icono: 'rotate-3d', titulo: 'Fotografía 360° profesional', texto: 'Tu propiedad se recorre como si el comprador estuviera dentro, con mediciones reales en realidad aumentada.' },
		{ icono: 'trending-up', titulo: 'Valuación con IA', texto: 'Precio de mercado estimado con modelos entrenados en el mercado local: ni muy alto ni regalado.' },
		{ icono: 'shield-check', titulo: 'Verificación legal', texto: 'Auditamos tu documentación y le damos a los compradores la confianza de un sello verificado.' },
		{ icono: 'megaphone', titulo: 'Máxima exposición', texto: 'Publicada en nuestra plataforma, compartida con nuestra base de compradores y alertada por notificaciones.' }
	];

	const pasos = [
		{ n: '01', titulo: 'Cuéntanos de tu propiedad', texto: 'Completa el formulario con los datos básicos. Te contactamos en menos de 24 horas.' },
		{ n: '02', titulo: 'Sesión fotográfica y verificación', texto: 'Visitamos tu propiedad, capturamos el tour 360° y verificamos la documentación.' },
		{ n: '03', titulo: 'Publicación destacada', texto: 'Tu propiedad sale en línea con recorrido virtual, valuación inteligente y sello de verificación.' },
		{ n: '04', titulo: 'Cierre acompañado', texto: 'Filtramos interesados reales, coordinamos visitas y te acompañamos hasta la firma.' }
	];
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Propietarios</span>
		<h1 class="mt-2 text-4xl font-extrabold">Vende tu propiedad más rápido</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Recorrido virtual 360°, valuación inteligente y exposición ante compradores verificados.
		</p>
	</div>
</section>

<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">
	<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
		{#each beneficios as b (b.titulo)}
			<div class="rounded-2xl border border-slate-200 p-4 text-center shadow-sm sm:p-6">
				<span class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-14 sm:w-14 sm:rounded-2xl">
					<Icon nombre={b.icono} size={26} />
				</span>
				<h2 class="mt-4 font-bold text-navy-900">{b.titulo}</h2>
				<p class="mt-2 text-sm leading-relaxed text-slate-500">{b.texto}</p>
			</div>
		{/each}
	</div>
</section>

<section class="bg-slate-50 py-16">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<SectionTitle etiqueta="Proceso" titulo="Así de simple es publicar" />
		<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
			{#each pasos as paso (paso.n)}
				<div class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
					<span class="text-4xl font-extrabold text-brand-200">{paso.n}</span>
					<h3 class="mt-3 font-bold text-navy-900">{paso.titulo}</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-500">{paso.texto}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<SectionTitle
		etiqueta="Empieza hoy"
		titulo="Cuéntanos de tu propiedad"
		subtitulo="Sin compromiso. Un asesor evalúa tu caso y te explica el proceso completo."
	/>
	<LeadForm tipo="vender" textoBoton="Solicitar evaluación" />
</section>
