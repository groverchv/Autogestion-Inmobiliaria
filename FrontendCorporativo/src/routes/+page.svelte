<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import TestimonialCard from '$lib/components/TestimonialCard.svelte';
	import BlogCard from '$lib/components/BlogCard.svelte';
	import FaqAccordion from '$lib/components/FaqAccordion.svelte';
	import LeadForm from '$lib/components/LeadForm.svelte';
	import type { PageProps } from './$types';
	import { env } from '$env/dynamic/public';

	let { data }: PageProps = $props();
	const { home } = data;
	const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
</script>

<svelte:head>
	{#each data.jsonLd as objeto, i (i)}
		{@html `<script type="application/ld+json">${JSON.stringify(objeto)}<\/script>`}
	{/each}
</svelte:head>

<Hero banners={home.banners} />

<Stats config={home.config} />

<!-- Servicios -->
{#if home.servicios.length}
	<section class="mx-auto max-w-7xl px-4 py-20 sm:px-6">
		<SectionTitle
			etiqueta="Qué hacemos"
			titulo="Servicios integrales"
			subtitulo="Todo el ciclo inmobiliario en una sola empresa, potenciado por tecnología propia."
		/>
		<div class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
			{#each home.servicios as servicio (servicio.id)}
				<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
					<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
						<Icon nombre={servicio.icono ?? 'sparkles'} size={22} />
					</span>
					<h3 class="mt-4 font-bold text-navy-900">{servicio.titulo}</h3>
					{#if servicio.descripcion}
						<p class="mt-2 text-sm leading-relaxed text-slate-500">{servicio.descripcion}</p>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}

<!-- CTA plataforma -->
<section class="bg-gradient-to-br from-navy-950 to-navy-800 py-16 text-white">
	<div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
		<Icon nombre="rotate-3d" size={44} class="mx-auto text-brand-400" />
		<h2 class="mt-5 text-3xl font-bold sm:text-4xl">
			{home.config.home_cta_titulo ?? 'Tu aliado inmobiliario con tecnología 360°'}
		</h2>
		<p class="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
			{home.config.home_cta_texto ?? ''}
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-4">
			<a
				href={appUrl}
				target="_blank"
				rel="noopener"
				class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-brand-500/30 transition-colors hover:bg-brand-400"
			>
				Abrir plataforma 360° <Icon nombre="external-link" size={17} />
			</a>
			<a
				href="/vende-tu-propiedad"
				class="inline-flex items-center gap-2 rounded-lg border border-white/25 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
			>
				Vende tu propiedad
			</a>
		</div>
	</div>
</section>

<!-- Testimonios -->
{#if home.testimonios.length}
	<section class="mx-auto max-w-7xl px-4 py-20 sm:px-6">
		<SectionTitle
			etiqueta="Testimonios"
			titulo="Lo que dicen nuestros clientes"
		/>
		<div class="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
			{#each home.testimonios as testimonio (testimonio.id)}
				<TestimonialCard {testimonio} />
			{/each}
		</div>
	</section>
{/if}

<!-- Blog -->
{#if home.posts.length}
	<section class="bg-slate-50 py-20">
		<div class="mx-auto max-w-7xl px-4 sm:px-6">
			<SectionTitle
				etiqueta="Blog"
				titulo="Últimas publicaciones"
				subtitulo="Análisis del mercado, guías y novedades de la plataforma."
			/>
			<div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
				{#each home.posts as post (post.id)}
					<BlogCard {post} />
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Planes teaser -->
<section class="bg-navy-950 py-14 text-white">
	<div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 lg:flex-row lg:text-left">
		<div>
			<h2 class="text-2xl font-extrabold">Publica tu primera propiedad gratis</h2>
			<p class="mt-2 text-slate-300">Sin tarjeta ni permanencia. Cuando necesites más, tienes planes desde Bs 190/mes con tours 360 y destacados.</p>
		</div>
		<a
			href="/planes"
			class="shrink-0 rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
		>
			Ver planes y precios
		</a>
	</div>
</section>

<!-- FAQs + Contacto -->
<section class="mx-auto max-w-7xl px-4 py-20 sm:px-6">
	<div class="grid items-start gap-12 lg:grid-cols-2">
		<div>
			<SectionTitle
				etiqueta="Dudas"
				titulo="Preguntas frecuentes"
				centrado={false}
			/>
			<FaqAccordion faqs={home.faqs.slice(0, 5)} />
		</div>
		<div>
			<SectionTitle
				etiqueta="Contacto"
				titulo="Hablemos de tu propiedad"
				centrado={false}
			/>
			<LeadForm tipo="contacto" textoBoton="Enviar consulta" />
		</div>
	</div>
</section>
