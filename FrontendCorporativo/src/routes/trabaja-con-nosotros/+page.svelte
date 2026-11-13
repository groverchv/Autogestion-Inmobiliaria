<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import LeadForm from '$lib/components/LeadForm.svelte';
	import { etiquetaTipoVacante } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let seleccionada = $state<number | null>(null);

	const vacanteActiva = $derived(
		data.vacantes.find((v) => v.id === seleccionada) ?? null
	);
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Carreras</span>
		<h1 class="mt-2 text-4xl font-extrabold">Trabaja con nosotros</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Únete al equipo que está transformando el sector inmobiliario con IA y realidad aumentada.
		</p>
	</div>
</section>

<section class="mx-auto max-w-7xl px-4 py-14 sm:px-6">
	<div class="grid items-start gap-10 lg:grid-cols-5">
		<div class="lg:col-span-3">
			<h2 class="text-xl font-bold text-navy-900">Vacantes abiertas ({data.vacantes.length})</h2>
			<div class="mt-6 space-y-4">
				{#each data.vacantes as vacante (vacante.id)}
					<article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm {seleccionada === vacante.id ? 'ring-2 ring-brand-300' : ''}">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<h3 class="font-bold text-navy-900">{vacante.titulo}</h3>
								<div class="mt-2 flex flex-wrap gap-2 text-xs">
									{#if vacante.area}
										<span class="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{vacante.area}</span>
									{/if}
									<span class="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">{etiquetaTipoVacante(vacante.tipo)}</span>
									{#if vacante.ubicacion}
										<span class="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
											<Icon nombre="map-pin" size={11} />{vacante.ubicacion}
										</span>
									{/if}
								</div>
							</div>
							<button
								onclick={() => (seleccionada = seleccionada === vacante.id ? null : vacante.id)}
								class="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
							>
								{seleccionada === vacante.id ? 'Cerrar' : 'Postular'}
							</button>
						</div>
						{#if vacante.descripcion}
							<p class="mt-4 text-sm leading-relaxed text-slate-600">{vacante.descripcion}</p>
						{/if}
						{#if vacante.requisitos}
							<div class="mt-3 rounded-lg bg-slate-50 p-4">
								<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Requisitos</p>
								<p class="mt-1.5 whitespace-pre-line text-sm text-slate-600">{vacante.requisitos}</p>
							</div>
						{/if}
					</article>
				{:else}
					<div class="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
						<Icon nombre="briefcase" size={36} class="mx-auto text-slate-300" />
						<p class="mt-4 font-medium text-slate-600">No hay vacantes abiertas por ahora.</p>
						<p class="mt-1 text-sm text-slate-400">Déjanos tus datos y te avisamos cuando se abra una.</p>
					</div>
				{/each}
			</div>
		</div>

		<div class="lg:sticky lg:top-24 lg:col-span-2">
			<LeadForm
				tipo="postulacion"
				titulo={vacanteActiva ? `Postular a: ${vacanteActiva.titulo}` : 'Postulación general'}
				vacanteId={vacanteActiva?.id ?? null}
				conAsunto={!vacanteActiva}
				conCv
				asuntoOculto={vacanteActiva ? `Postulación: ${vacanteActiva.titulo}` : undefined}
				textoBoton="Enviar postulación"
			/>
		</div>
	</div>
</section>
