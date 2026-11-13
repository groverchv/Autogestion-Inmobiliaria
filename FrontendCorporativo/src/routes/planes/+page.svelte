<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import { env } from '$env/dynamic/public';
	import type { PageProps } from './$types';
	import type { Plan } from '$lib/types';

	let { data }: PageProps = $props();

	const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
	const siteUrl = env.PUBLIC_SITE_URL || 'http://localhost:3000';

	const faqs = [
		{
			p: '¿Necesito una cuenta?',
			r: 'Sí. Para publicar (gratis o de pago) creas tu cuenta en la plataforma con tu correo. Tarda menos de un minuto.'
		},
		{
			p: '¿Puedo empezar gratis?',
			r: 'Sí. El plan Gratis no pide tarjeta ni permanencia: publicas tu primera propiedad sin costo. Los planes de pago se contratan cuando los necesitas — no hay periodo de prueba.'
		},
		{
			p: '¿Puedo cambiar o cancelar mi plan?',
			r: 'En cualquier momento desde tu panel. Si cancelas, conservas el acceso hasta que termine el periodo ya pagado.'
		},
		{
			p: '¿Cómo pago?',
			r: 'Con tarjeta de crédito o débito, desde tu cuenta en la plataforma. El cobro es seguro vía Stripe y tu plan se activa al instante.'
		},
		{
			p: '¿Cobran comisión por las ventas?',
			r: 'La suscripción no incluye comisión. Si quieres que gestionemos la venta completa, hablamos de eso aparte — sin sorpresas.'
		}
	];

	function precio(plan: Plan): string {
		if (plan.precio === 0) return 'Bs 0';
		return `Bs ${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(plan.precio)}`;
	}

	function destino(plan: Plan): string {
		if (plan.ctaUrl) return plan.ctaUrl;
		return `${appUrl}/registro`;
	}

	const ofertas = $derived(
		(data.planes ?? []).map((p) => ({
			'@type': 'Offer',
			name: `Plan ${p.nombre}`,
			price: p.precio,
			priceCurrency: p.moneda === 'BOB' ? 'BOB' : p.moneda,
			url: `${siteUrl}/planes`
		}))
	);
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Suscripción Inmobiliaria 360',
			description: 'Planes de publicación inmobiliaria con tours 360.',
			offers: { '@type': 'AggregateOffer', lowPrice: 0, offerCount: ofertas.length, offers: ofertas }
		})
	);
</script>

<svelte:head>
	<title>Planes y precios — Inmobiliaria 360</title>
	<meta name="description" content="Publica tus propiedades gratis o elige un plan con tours 360, destacados y soporte prioritario. Precios en bolivianos, sin permanencia." />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Planes</span>
		<h1 class="mt-2 text-4xl font-extrabold">Precios claros, sin sorpresas</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Empieza gratis. Cuando necesites más propiedades, tours 360 o destacados, elige tu plan.
		</p>
	</div>
</section>

<section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
	{#if data.planes.length === 0}
		<div class="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
			Los planes se están actualizando. Escríbenos desde <a href="/contacto" class="text-brand-600 underline">contacto</a> y te contamos las opciones.
		</div>
	{:else}
		<div class="grid grid-cols-3 gap-2 sm:gap-6 lg:gap-8">
			{#each data.planes as plan (plan.id)}
				<article
					class="relative flex flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-lg sm:rounded-2xl sm:p-8
						{plan.destacado ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 bg-white'}"
				>
					{#if plan.destacado}
						<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap text-white sm:-top-3.5 sm:px-4 sm:py-1 sm:text-xs">
							El más elegido
						</span>
					{/if}

					<h2 class="text-sm font-bold text-navy-900 sm:text-xl">{plan.nombre}</h2>
					{#if plan.descripcion}
						<p class="mt-1 hidden text-sm text-slate-500 sm:block">{plan.descripcion}</p>
					{/if}

					<div class="mt-2 flex flex-wrap items-baseline gap-x-1 sm:mt-5">
						<span class="text-lg font-extrabold text-navy-900 sm:text-4xl">{precio(plan)}</span>
						<span class="text-[10px] text-slate-500 sm:text-sm">/{plan.periodo}</span>
					</div>

					{#if plan.caracteristicas}
						<ul class="mt-3 flex-1 space-y-1.5 sm:mt-6 sm:space-y-3">
							{#each plan.caracteristicas.split('\n').filter(Boolean) as item (item)}
								<li class="flex items-start gap-1 text-[10px] leading-snug text-slate-600 sm:gap-2.5 sm:text-sm">
									<Icon nombre="check-circle" size={12} class="mt-0.5 shrink-0 text-emerald-500 sm:h-[17px] sm:w-[17px]" />
									{item}
								</li>
							{/each}
						</ul>
					{/if}

					<a
						href={destino(plan)}
						target={plan.ctaUrl ? undefined : '_blank'}
						rel={plan.ctaUrl ? undefined : 'noopener'}
						class="mt-4 rounded-md px-1.5 py-2 text-center text-[10px] font-semibold transition-colors sm:mt-8 sm:rounded-lg sm:px-5 sm:py-3 sm:text-sm
							{plan.destacado
							? 'bg-brand-500 text-white hover:bg-brand-600'
							: 'border border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white'}"
					>
						{plan.ctaTexto}
					</a>
				</article>
			{/each}
		</div>
	{/if}
</section>

<section class="bg-slate-50 py-16">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		<SectionTitle etiqueta="Dudas frecuentes" titulo="Antes de elegir" />
		<div class="space-y-4">
			{#each faqs as faq (faq.p)}
				<details class="group rounded-xl border border-slate-200 bg-white p-5">
					<summary class="flex cursor-pointer items-center justify-between font-semibold text-navy-900">
						{faq.p}
						<Icon nombre="chevron-down" size={18} class="text-slate-400 transition-transform group-open:rotate-180" />
					</summary>
					<p class="mt-3 text-sm leading-relaxed text-slate-600">{faq.r}</p>
				</details>
			{/each}
		</div>
		<p class="mt-8 text-center text-sm text-slate-500">
			¿Necesitas algo distinto? <a href="/contacto" class="font-semibold text-brand-600 underline">Hablemos</a> — armamos planes para constructoras y desarrollos.
		</p>
	</div>
</section>
