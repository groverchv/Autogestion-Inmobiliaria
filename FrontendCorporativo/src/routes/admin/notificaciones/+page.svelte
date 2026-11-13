<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import { formatoFechaCorta } from '$lib/format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let pestana = $state<'push' | 'newsletter' | 'emails'>('push');
	let enviando = $state(false);
</script>

<svelte:head><title>Notificaciones — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Notificaciones</h1>
	<p class="mt-1 text-sm text-slate-500">Difusiones push, campañas de email y registro de envíos.</p>
</div>

{#if form?.mensaje}
	<div class="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
		<Icon nombre="check-circle" size={17} /> {form.mensaje}
	</div>
{/if}
{#if form?.error}
	<div class="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
		<Icon nombre="circle-alert" size={17} /> {form.error}
	</div>
{/if}

<div class="mb-6 flex gap-2">
	{#each [
		{ id: 'push', texto: 'Notificaciones', icono: 'bell-ring' },
		{ id: 'newsletter', texto: 'Boletín', icono: 'mail' },
		{ id: 'emails', texto: 'Registro de correos', icono: 'file-text' }
	] as tab (tab.id)}
		<button
			onclick={() => (pestana = tab.id as typeof pestana)}
			class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors
				{pestana === tab.id ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-white'}"
		>
			<Icon nombre={tab.icono} size={15} /> {tab.texto}
		</button>
	{/each}
</div>

{#if pestana === 'push'}
	<div class="grid gap-6 lg:grid-cols-2">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="font-bold text-navy-900">Difundir notificación push</h2>
			<p class="mt-1 text-sm text-slate-500">Llega a todos los navegadores suscritos, incluso con el sitio cerrado.</p>
			<form method="POST" action="?/difundirPush" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; await update(); }; }} class="mt-5 space-y-4">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Título *</span>
					<input name="titulo" required maxlength="100" class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="Nuevo servicio disponible" />
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Mensaje</span>
					<textarea name="cuerpo" rows="2" maxlength="300" class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="Publicamos un nuevo artículo en el blog"></textarea>
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">URL al hacer clic</span>
					<input name="url" maxlength="300" class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="/blog" />
				</label>
				<button disabled={enviando} class="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
					{#if enviando}<Icon nombre="loader" size={15} class="animate-spin" />{:else}<Icon nombre="send" size={15} />{/if}
					Difundir ahora
				</button>
			</form>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="font-bold text-navy-900">Alcance</h2>
			<div class="mt-5 flex items-center gap-5">
				<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
					<Icon nombre="bell-ring" size={30} />
				</span>
				<div>
					<p class="text-4xl font-extrabold text-navy-900">{data.pushStats.suscriptores_activos}</p>
					<p class="text-sm text-slate-500">navegadores suscritos a notificaciones</p>
				</div>
			</div>
			<p class="mt-5 rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
				Los suscriptores se registran desde el aviso de notificaciones del sitio público.
				Publicar un artículo del blog también genera una notificación automática.
			</p>
		</div>
	</div>
{:else if pestana === 'newsletter'}
	<div class="grid gap-6 lg:grid-cols-2">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="font-bold text-navy-900">Campaña de email</h2>
			<p class="mt-1 text-sm text-slate-500">Se envía a {data.suscriptores.filter((s) => s.activo).length} suscriptores activos.</p>
			<form method="POST" action="?/difundirNewsletter" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; await update(); }; }} class="mt-5 space-y-4">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Asunto *</span>
					<input name="asunto" required maxlength="250" class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm" placeholder="Novedades de noviembre" />
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Contenido (HTML permitido) *</span>
					<textarea name="contenidoHtml" required rows="8" class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-xs" placeholder="<h2>Título</h2><p>Contenido de la campaña...</p>"></textarea>
				</label>
				<button disabled={enviando} class="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
					{#if enviando}<Icon nombre="loader" size={15} class="animate-spin" />{:else}<Icon nombre="send" size={15} />{/if}
					Enviar campaña
				</button>
			</form>
		</div>
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="font-bold text-navy-900">Suscriptores ({data.suscriptores.filter((s) => s.activo).length} activos)</h2>
			<div class="mt-4 max-h-96 overflow-y-auto">
				{#if data.suscriptores.length}
					<ul class="divide-y divide-slate-100">
						{#each data.suscriptores as sub (sub.id)}
							<li class="flex items-center justify-between py-2.5 text-sm">
								<div>
									<span class="font-medium text-slate-700">{sub.email}</span>
									{#if !sub.activo}
										<span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">baja</span>
									{/if}
								</div>
								<form method="POST" action="?/eliminarSuscriptor" use:enhance class="inline" onsubmit={(e) => { if (!confirm('¿Eliminar suscriptor?')) e.preventDefault(); }}>
									<input type="hidden" name="id" value={sub.id} />
									<button class="rounded-lg p-1.5 text-slate-300 hover:text-red-500" title="Eliminar">
										<Icon nombre="trash" size={14} />
									</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-8 text-center text-sm text-slate-400">Sin suscriptores todavía.</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-6 py-4">
			<h2 class="font-bold text-navy-900">Últimos {data.emails.totalElements} correos enviados</h2>
		</div>
		{#if data.emails.content.length}
			<table class="w-full text-left text-sm">
				<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="px-5 py-3 font-semibold">Destinatario</th>
						<th class="px-5 py-3 font-semibold">Asunto</th>
						<th class="px-5 py-3 font-semibold">Plantilla</th>
						<th class="px-5 py-3 font-semibold">Estado</th>
						<th class="px-5 py-3 font-semibold">Fecha</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.emails.content as email (email.id)}
						<tr>
							<td class="px-5 py-3 text-slate-600">{email.destinatario}</td>
							<td class="max-w-56 truncate px-5 py-3 text-slate-600">{email.asunto}</td>
							<td class="px-5 py-3 text-slate-500">{email.plantilla ?? '—'}</td>
							<td class="px-5 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-semibold
									{email.estado === 'ENVIADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}"
									title={email.error ?? ''}
								>
									{email.estado}
								</span>
							</td>
							<td class="px-5 py-3 text-xs text-slate-400">{formatoFechaCorta(email.creado)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="py-12 text-center text-sm text-slate-400">Aún no se registran envíos.</p>
		{/if}
	</div>
{/if}
