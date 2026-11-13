<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { etiquetaEstadoLead, etiquetaTipoLead, formatoFechaCorta } from '$lib/format';
	import type { Lead } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let expandido = $state<number | null>(null);
	let editandoNota = $state<number | null>(null);
	let notaTexto = $state('');

	const coloresEstado: Record<string, string> = {
		NUEVO: 'bg-brand-100 text-brand-700',
		EN_CONTACTO: 'bg-amber-100 text-amber-700',
		CERRADO: 'bg-emerald-100 text-emerald-700',
		DESCARTADO: 'bg-slate-100 text-slate-500'
	};

	const estados = ['', 'NUEVO', 'EN_CONTACTO', 'CERRADO', 'DESCARTADO'];
	const tipos = ['', 'CONTACTO', 'VISITA', 'VENDER_PROPIEDAD', 'POSTULACION', 'SOPORTE'];

	function urlFiltro(estado: string, tipo: string): string {
		const p = new URLSearchParams();
		if (estado) p.set('estado', estado);
		if (tipo) p.set('tipo', tipo);
		return `/admin/leads${p.size ? '?' + p.toString() : ''}`;
	}
</script>

<svelte:head><title>Contactos — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold text-navy-900">Contactos</h1>
		<p class="mt-1 text-sm text-slate-500">{data.leads.totalElements} contactos recibidos del sitio web.</p>
	</div>
	<a
		href="/admin/api/exportar.csv{data.estado || data.tipo ? '?' + new URLSearchParams({ ...(data.estado && { estado: data.estado }), ...(data.tipo && { tipo: data.tipo }) }).toString() : ''}"
		download
		class="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
	>
		<Icon nombre="file-text" size={16} /> Exportar CSV
	</a>
</div>

{#if data.error}
	<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.error}</div>
{:else}
	<!-- Filtros -->
	<div class="mb-5 flex flex-wrap items-center gap-2">
		<span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado:</span>
		{#each estados as e (e)}
			<a
				href={urlFiltro(e, data.tipo)}
				class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
					{data.estado === e ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}"
			>
				{e ? etiquetaEstadoLead(e) : 'Todos'}
			</a>
		{/each}
		<span class="ml-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo:</span>
		{#each tipos as t (t)}
			<a
				href={urlFiltro(data.estado, t)}
				class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors
					{data.tipo === t ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}"
			>
				{t ? etiquetaTipoLead(t) : 'Todos'}
			</a>
		{/each}
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		{#if data.leads.content.length}
			<ul class="divide-y divide-slate-100">
				{#each data.leads.content as lead (lead.id)}
					<li>
						<button
							class="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
							onclick={() => (expandido = expandido === lead.id ? null : lead.id)}
						>
							<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-brand-400">
								{lead.nombre[0]?.toUpperCase()}
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="truncate text-sm font-semibold text-navy-900">{lead.nombre}</p>
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {coloresEstado[lead.estado]}">
										{etiquetaEstadoLead(lead.estado)}
									</span>
									<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
										{etiquetaTipoLead(lead.tipo)}
									</span>
								</div>
								<p class="truncate text-xs text-slate-500">
									{lead.email}{lead.telefono ? ` · ${lead.telefono}` : ''}{lead.asunto ? ` · ${lead.asunto}` : ''}
								</p>
							</div>
							<span class="shrink-0 text-xs text-slate-400">{formatoFechaCorta(lead.creado)}</span>
							<Icon nombre="chevron-down" size={16} class="shrink-0 text-slate-400 transition-transform {expandido === lead.id ? 'rotate-180' : ''}" />
						</button>

						{#if expandido === lead.id}
							<div class="border-t border-slate-100 bg-slate-50 px-5 py-4">
								<div class="grid gap-4 lg:grid-cols-2">
									<div>
										<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Mensaje</p>
										<p class="mt-1 whitespace-pre-line text-sm text-slate-700">{lead.mensaje}</p>
										<div class="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
											{#if lead.inmuebleId}<span>Publicación ID: {lead.inmuebleId}</span>{/if}
											{#if lead.vacanteId}<span>Vacante ID: {lead.vacanteId}</span>{/if}
											{#if lead.origenUrl}<span>Origen: {lead.origenUrl}</span>{/if}
										</div>
										<div class="mt-3 flex gap-2">
											<a href="mailto:{lead.email}" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white">
												<Icon nombre="mail" size={13} /> Responder por email
											</a>
											{#if lead.telefono}
												<a
													href="https://wa.me/{lead.telefono.replace(/[^0-9]/g, '')}"
													target="_blank" rel="noopener"
													class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
												>
													<Icon nombre="message-circle" size={13} /> WhatsApp
												</a>
											{/if}
										</div>
									</div>
									<div>
										<form method="POST" action="?/actualizar" use:enhance class="space-y-3">
											<input type="hidden" name="id" value={lead.id} />
											<div>
												<label class="text-xs font-semibold uppercase tracking-wide text-slate-400" for="estado-{lead.id}">Estado</label>
												<select
													id="estado-{lead.id}"
													name="estado"
													class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
												>
													{#each ['NUEVO', 'EN_CONTACTO', 'CERRADO', 'DESCARTADO'] as e (e)}
														<option value={e} selected={lead.estado === e}>{etiquetaEstadoLead(e)}</option>
													{/each}
												</select>
											</div>
											<div>
												<label class="text-xs font-semibold uppercase tracking-wide text-slate-400" for="nota-{lead.id}">Nota interna</label>
												<textarea
													id="nota-{lead.id}"
													name="notaInterna"
													rows="2"
													class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
													placeholder="Notas para el equipo (no visible al cliente)"
												>{editandoNota === lead.id ? notaTexto : (lead.notaInterna ?? '')}</textarea>
											</div>
											<div class="flex gap-2">
												<button class="rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800">
													Guardar cambios
												</button>
											</div>
										</form>
									</div>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<div class="py-16 text-center">
				<Icon nombre="inbox" size={36} class="mx-auto text-slate-300" />
				<p class="mt-3 text-sm text-slate-500">No hay contactos con estos filtros.</p>
			</div>
		{/if}
	</div>

	<Pagination totalPages={data.leads.totalPages} actual={data.leads.number} base="/admin/leads" />
{/if}
