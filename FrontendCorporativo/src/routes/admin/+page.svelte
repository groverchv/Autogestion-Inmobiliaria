<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { etiquetaTipoLead, formatoFechaCorta } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const maxDia = $derived(
		Math.max(1, ...(data.stats?.leads_por_dia?.map((d) => d.total) ?? [1]))
	);

	const tarjetas = $derived(
		data.stats
			? [
					{ icono: 'inbox', etiqueta: 'Contactos nuevos', valor: data.stats.leads_nuevos, color: 'bg-brand-500' },
					{ icono: 'users', etiqueta: 'Contactos totales', valor: data.stats.leads_total, color: 'bg-violet-500' },
					{ icono: 'mail', etiqueta: 'Suscriptores del boletín', valor: data.stats.suscriptores_newsletter, color: 'bg-emerald-500' },
					{ icono: 'bell', etiqueta: 'Suscriptores de notificaciones', valor: data.stats.suscriptores_push, color: 'bg-amber-500' },
					{ icono: 'newspaper', etiqueta: 'Artículos publicados', valor: data.stats.posts_publicados, color: 'bg-rose-500' }
				]
			: []
	);
</script>

<svelte:head><title>Panel — Administración Corporativa</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-bold text-navy-900">Panel</h1>
	<p class="mt-1 text-sm text-slate-500">Resumen del sitio corporativo y actividad reciente.</p>
</div>

{#if data.error}
	<div class="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
		<Icon nombre="circle-alert" size={20} />
		<div>
			<p class="font-semibold">No se pudo conectar con el backend</p>
			<p class="text-sm">{data.error}</p>
		</div>
	</div>
{:else}
	<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
		{#each tarjetas as t (t.etiqueta)}
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<span class="flex h-11 w-11 items-center justify-center rounded-xl text-white {t.color}">
					<Icon nombre={t.icono} size={22} />
				</span>
				<p class="mt-4 text-3xl font-extrabold text-navy-900">{t.valor}</p>
				<p class="text-sm text-slate-500">{t.etiqueta}</p>
			</div>
		{/each}
	</div>

	{#if data.stats?.leads_por_dia?.length}
		<div class="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="mb-5 font-bold text-navy-900">Contactos por día (últimos 14 días)</h2>
			<div class="flex h-44 items-end gap-2" role="img" aria-label="Gráfico de barras: contactos recibidos por día">
				{#each data.stats.leads_por_dia as d (d.dia)}
					<div class="group flex flex-1 flex-col items-center justify-end gap-1.5">
						<span class="text-xs font-bold text-navy-900 opacity-0 transition-opacity group-hover:opacity-100">{d.total}</span>
						<div
							class="w-full rounded-t-md bg-brand-500 transition-colors group-hover:bg-brand-600"
							style="height: {Math.max(3, (d.total / maxDia) * 100)}%"
						></div>
						<span class="text-[10px] text-slate-400">{d.dia.slice(5)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mt-8 grid gap-6 lg:grid-cols-3">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="font-bold text-navy-900">Últimos contactos</h2>
				<a href="/admin/leads" class="text-sm font-medium text-brand-600 hover:text-brand-700">Ver todos →</a>
			</div>
			{#if data.stats?.ultimos_leads?.length}
				<ul class="divide-y divide-slate-100">
					{#each data.stats.ultimos_leads as lead (lead.id)}
						<li class="flex items-center gap-4 py-3">
							<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
								{lead.nombre[0]?.toUpperCase()}
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold text-navy-900">{lead.nombre}</p>
								<p class="truncate text-xs text-slate-500">{etiquetaTipoLead(lead.tipo)} — {lead.mensaje.slice(0, 60)}</p>
							</div>
							<span class="text-xs text-slate-400">{formatoFechaCorta(lead.creado)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="py-8 text-center text-sm text-slate-400">Sin contactos todavía.</p>
			{/if}
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="mb-4 font-bold text-navy-900">Acciones rápidas</h2>
			<div class="space-y-2.5">
				<a href="/admin/blog/nuevo" class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50">
					<Icon nombre="plus" size={17} class="text-brand-600" /> Nuevo artículo del blog
				</a>
				<a href="/admin/notificaciones" class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50">
					<Icon nombre="megaphone" size={17} class="text-brand-600" /> Difundir notificación
				</a>
				<a href="/admin/contenido" class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50">
					<Icon nombre="image" size={17} class="text-brand-600" /> Editar banners y contenido
				</a>
				<a href="/admin/leads?estado=NUEVO" class="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50">
					<Icon nombre="inbox" size={17} class="text-brand-600" /> Revisar contactos nuevos
				</a>
			</div>
		</div>
	</div>
{/if}
