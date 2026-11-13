<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import LeadForm from '$lib/components/LeadForm.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const config = data.config;
	const oficinaPrincipal = $derived(
		data.oficinas.find((o) => o.principal && o.lat && o.lng) ??
		data.oficinas.find((o) => o.lat && o.lng)
	);
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Contacto</span>
		<h1 class="mt-2 text-4xl font-extrabold">Hablemos</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Por WhatsApp, correo, teléfono o en nuestras oficinas. Respondemos en menos de 24 horas hábiles.
		</p>
	</div>
</section>

<section class="mx-auto max-w-7xl px-4 py-14 sm:px-6">
	<div class="grid gap-10 lg:grid-cols-5">
		<!-- Canales y oficinas -->
		<div class="space-y-6 lg:col-span-2">
			<div class="grid grid-cols-4 gap-2 sm:grid-cols-1 sm:gap-4">
				{#if config.contacto_telefono}
					<a href="tel:{config.contacto_telefono.replace(/\s/g, '')}" class="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5 transition-shadow hover:shadow-md">
						<span class="flex h-8 w-8 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl bg-brand-50 text-brand-600"><Icon nombre="phone" size={22} /></span>
						<div>
							<p class="text-[11px] font-semibold text-navy-900 sm:text-sm">Teléfono</p>
							<p class="break-all text-[10px] text-slate-500 sm:text-sm">{config.contacto_telefono}</p>
						</div>
					</a>
				{/if}
				{#if config.contacto_whatsapp}
					<a
						href="https://wa.me/{config.contacto_whatsapp.replace(/[^0-9]/g, '')}"
						target="_blank" rel="noopener"
						class="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5 transition-shadow hover:shadow-md"
					>
						<span class="flex h-8 w-8 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl bg-emerald-50 text-emerald-600"><Icon nombre="message-circle" size={22} /></span>
						<div>
							<p class="text-[11px] font-semibold text-navy-900 sm:text-sm">WhatsApp</p>
							<p class="text-[10px] leading-snug text-slate-500 sm:text-sm">Respuesta inmediata en horario de atención</p>
						</div>
					</a>
				{/if}
				{#if config.contacto_email}
					<a href="mailto:{config.contacto_email}" class="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5 transition-shadow hover:shadow-md">
						<span class="flex h-8 w-8 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl bg-violet-50 text-violet-600"><Icon nombre="mail" size={22} /></span>
						<div>
							<p class="text-[11px] font-semibold text-navy-900 sm:text-sm">Correo</p>
							<p class="break-all text-[10px] leading-snug text-slate-500 sm:text-sm">{config.contacto_email}</p>
						</div>
					</a>
				{/if}
				{#if config.horario_atencion}
					<div class="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-2.5 sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-5">
						<span class="flex h-8 w-8 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl bg-amber-50 text-amber-600"><Icon nombre="clock" size={22} /></span>
						<div>
							<p class="text-[11px] font-semibold text-navy-900 sm:text-sm">Horario</p>
							<p class="text-[10px] leading-snug text-slate-500 sm:text-sm">{config.horario_atencion}</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Oficinas -->
			{#if data.oficinas.length}
				<h2 class="pt-2 text-lg font-bold text-navy-900">Nuestras oficinas</h2>
				<div class="space-y-4">
					{#each data.oficinas as oficina (oficina.id)}
						<div class="rounded-2xl border border-slate-200 p-5 {oficina.principal ? 'ring-2 ring-brand-200' : ''}">
							<div class="flex items-start justify-between">
								<p class="font-semibold text-navy-900">{oficina.nombre}</p>
								{#if oficina.principal}
									<span class="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">Principal</span>
								{/if}
							</div>
							<ul class="mt-3 space-y-1.5 text-sm text-slate-500">
								{#if oficina.direccion}
									<li class="flex gap-2"><Icon nombre="map-pin" size={14} class="mt-0.5 shrink-0" />{oficina.direccion}{oficina.ciudad ? `, ${oficina.ciudad}` : ''}</li>
								{/if}
								{#if oficina.telefono}
									<li class="flex gap-2"><Icon nombre="phone" size={14} class="mt-0.5 shrink-0" />{oficina.telefono}</li>
								{/if}
								{#if oficina.horario}
									<li class="flex gap-2"><Icon nombre="clock" size={14} class="mt-0.5 shrink-0" />{oficina.horario}</li>
								{/if}
							</ul>
							{#if oficina.mapsUrl || (oficina.lat && oficina.lng)}
								<a
									href={oficina.mapsUrl ?? `https://www.google.com/maps?q=${oficina.lat},${oficina.lng}`}
									target="_blank" rel="noopener"
									class="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
								>
									Cómo llegar <Icon nombre="external-link" size={13} />
								</a>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if oficinaPrincipal}
				<div class="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
					<iframe
						title="Ubicación de {oficinaPrincipal.nombre}"
						src="https://www.google.com/maps?q={oficinaPrincipal.lat},{oficinaPrincipal.lng}&z=15&output=embed"
						class="h-64 w-full border-0"
						loading="lazy"
						referrerpolicy="no-referrer-when-downgrade"
						allowfullscreen
					></iframe>
					<p class="bg-white px-4 py-2.5 text-xs text-slate-500">
						{oficinaPrincipal.direccion}{oficinaPrincipal.ciudad ? `, ${oficinaPrincipal.ciudad}` : ''}
					</p>
				</div>
			{/if}
		</div>

		<!-- Formulario -->
		<div class="lg:col-span-3">
			<LeadForm tipo="contacto" titulo="Envíanos un mensaje" textoBoton="Enviar mensaje" />
		</div>
	</div>
</section>
