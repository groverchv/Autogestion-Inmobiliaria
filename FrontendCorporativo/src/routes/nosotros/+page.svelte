<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import TestimonialCard from '$lib/components/TestimonialCard.svelte';
	import FaqAccordion from '$lib/components/FaqAccordion.svelte';
	import { iniciales } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const valores = [
		{ icono: 'shield-check', titulo: 'Transparencia', texto: 'Cada propiedad pasa por verificación documental y peritaje fotográfico antes de publicarse.' },
		{ icono: 'sparkles', titulo: 'Innovación', texto: 'Recorridos 360°, mediciones con IA y contratos auditados en blockchain no son el futuro: son nuestro estándar.' },
		{ icono: 'handshake', titulo: 'Compromiso', texto: 'Acompañamos a compradores, vendedores e inquilinos en cada paso, hasta la entrega de llaves y después.' }
	];
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Nosotros</span>
		<h1 class="mt-2 text-4xl font-extrabold">Tecnología al servicio de las personas</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Somos la inmobiliaria que combina la confianza del trato humano con la precisión
			de la inteligencia artificial.
		</p>
	</div>
</section>

<!-- Misión / Visión -->
<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">
	<div class="grid gap-8 lg:grid-cols-2">
		<div class="rounded-2xl bg-brand-50 p-8">
			<Icon nombre="award" size={30} class="text-brand-600" />
			<h2 class="mt-4 text-2xl font-bold text-navy-900">Misión</h2>
			<p class="mt-3 leading-relaxed text-slate-600">
				Hacer que encontrar, verificar y cerrar una operación inmobiliaria sea tan simple
				y transparente como navegar un mapa, poniendo datos reales e inteligencia
				artificial al servicio de cada decisión.
			</p>
		</div>
		<div class="rounded-2xl bg-navy-900 p-8 text-white">
			<Icon nombre="globe" size={30} class="text-brand-400" />
			<h2 class="mt-4 text-2xl font-bold">Visión</h2>
			<p class="mt-3 leading-relaxed text-slate-300">
				Ser la plataforma de autogestión inmobiliaria de referencia en Bolivia y la región,
				donde cada propiedad se puede conocer a fondo sin moverse de casa.
			</p>
		</div>
	</div>

	<div class="mt-14 grid grid-cols-3 gap-3 sm:gap-6">
		{#each valores as valor (valor.titulo)}
			<div class="text-center">
				<span class="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-14 sm:w-14 sm:rounded-2xl">
					<Icon nombre={valor.icono} size={22} />
				</span>
				<h3 class="mt-4 font-bold text-navy-900">{valor.titulo}</h3>
				<p class="mt-2 text-sm leading-relaxed text-slate-500">{valor.texto}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Equipo -->
{#if data.equipo.length}
	<section class="bg-slate-50 py-16">
		<div class="mx-auto max-w-7xl px-4 sm:px-6">
			<SectionTitle etiqueta="Equipo" titulo="Las personas detrás" />
			<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
				{#each data.equipo as miembro (miembro.id)}
					<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
						{#if miembro.fotoUrl}
							<img src={miembro.fotoUrl} alt={miembro.nombre} class="mx-auto h-20 w-20 rounded-full object-cover" loading="lazy" />
						{:else}
							<span class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-navy-900 text-xl font-bold text-brand-400">
								{iniciales(miembro.nombre)}
							</span>
						{/if}
						<h3 class="mt-4 font-bold text-navy-900">{miembro.nombre}</h3>
						{#if miembro.cargo}<p class="text-sm font-medium text-brand-600">{miembro.cargo}</p>{/if}
						{#if miembro.bio}<p class="mt-2 text-xs leading-relaxed text-slate-500">{miembro.bio}</p>{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Testimonios -->
{#if data.testimonios.length}
	<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6">
		<SectionTitle etiqueta="Clientes" titulo="Historias reales" />
		<div class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
			{#each data.testimonios as testimonio (testimonio.id)}
				<TestimonialCard {testimonio} />
			{/each}
		</div>
	</section>
{/if}

<!-- FAQs -->
{#if data.faqs.length}
	<section class="bg-slate-50 py-16">
		<div class="mx-auto max-w-7xl px-4 sm:px-6">
			<SectionTitle etiqueta="Dudas" titulo="Preguntas frecuentes" />
			<FaqAccordion faqs={data.faqs} />
		</div>
	</section>
{/if}
