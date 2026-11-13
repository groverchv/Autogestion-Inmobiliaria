<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import LeadForm from '$lib/components/LeadForm.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Servicios</span>
		<h1 class="mt-2 text-4xl font-extrabold">Todo el ciclo inmobiliario</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Desde la valoración hasta la firma del contrato, con tecnología propia en cada paso.
		</p>
	</div>
</section>

<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">
	<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
		{#each data.servicios as servicio, i (servicio.id)}
			<article class="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:p-7">
				<div class="flex items-start justify-between">
					<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white sm:h-14 sm:w-14 sm:rounded-2xl">
						<Icon nombre={servicio.icono ?? 'sparkles'} size={28} />
					</span>
					<span class="text-4xl font-extrabold text-slate-100">{String(i + 1).padStart(2, '0')}</span>
				</div>
				<h2 class="mt-5 text-lg font-bold text-navy-900">{servicio.titulo}</h2>
				{#if servicio.descripcion}
					<p class="mt-2 text-sm leading-relaxed text-slate-500">{servicio.descripcion}</p>
				{/if}
			</article>
		{/each}
	</div>

	<div class="mt-16 grid items-start gap-10 lg:grid-cols-2">
		<div class="rounded-2xl bg-slate-50 p-8">
			<SectionTitle
				etiqueta="¿Necesitas algo?"
				titulo="Cuéntanos tu caso"
				subtitulo="Cada operación inmobiliaria es distinta. Un asesor especializado evalúa tu situación sin compromiso."
				centrado={false}
			/>
			<ul class="space-y-3 text-sm text-slate-600">
				{#each ['Respuesta en menos de 24 horas hábiles', 'Asesoría sin compromiso', 'Atención presencial y remota'] as item (item)}
					<li class="flex items-center gap-2.5">
						<Icon nombre="check-circle" size={17} class="text-emerald-500" /> {item}
					</li>
				{/each}
			</ul>
		</div>
		<LeadForm tipo="contacto" titulo="Solicitar asesoría" textoBoton="Solicitar asesoría" />
	</div>
</section>
