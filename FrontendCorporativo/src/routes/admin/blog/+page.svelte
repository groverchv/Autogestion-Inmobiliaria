<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { formatoFechaCorta } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Blog — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-navy-900">Blog</h1>
		<p class="mt-1 text-sm text-slate-500">Publicar un artículo envía una notificación push a los suscriptores.</p>
	</div>
	<a href="/admin/blog/nuevo" class="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
		<Icon nombre="plus" size={17} /> Nuevo artículo
	</a>
</div>

{#if data.error}
	<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.error}</div>
{:else}
	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		{#if data.posts.content.length}
			<table class="w-full text-left text-sm">
				<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th class="px-5 py-3.5 font-semibold">Artículo</th>
						<th class="px-5 py-3.5 font-semibold">Estado</th>
						<th class="hidden px-5 py-3.5 font-semibold md:table-cell">Fecha</th>
						<th class="px-5 py-3.5 text-right font-semibold">Acciones</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.posts.content as post (post.id)}
						<tr class="hover:bg-slate-50">
							<td class="px-5 py-3.5">
								<p class="font-semibold text-navy-900">{post.titulo}</p>
								<p class="text-xs text-slate-400">/blog/{post.slug}</p>
							</td>
							<td class="px-5 py-3.5">
								<span class="rounded-full px-2.5 py-1 text-xs font-semibold
									{post.estado === 'PUBLICADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
									{post.estado === 'PUBLICADO' ? 'Publicado' : 'Borrador'}
								</span>
							</td>
							<td class="hidden px-5 py-3.5 text-slate-500 md:table-cell">
								{formatoFechaCorta(post.publicadoAt ?? (post as unknown as { actualizado?: string }).actualizado)}
							</td>
							<td class="px-5 py-3.5">
								<div class="flex items-center justify-end gap-1.5">
									<a href="/blog/{post.slug}" target="_blank" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Ver en el sitio">
										<Icon nombre="eye" size={16} />
									</a>
									<a href="/admin/blog/{post.id}" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Editar">
										<Icon nombre="pencil" size={16} />
									</a>
									<form method="POST" action={post.estado === 'PUBLICADO' ? '?/despublicar' : '?/publicar'} use:enhance class="inline">
										<input type="hidden" name="id" value={post.id} />
										<button class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-amber-600" title={post.estado === 'PUBLICADO' ? 'Despublicar' : 'Publicar'}>
											<Icon nombre={post.estado === 'PUBLICADO' ? 'eye-off' : 'megaphone'} size={16} />
										</button>
									</form>
									<form method="POST" action="?/eliminar" use:enhance class="inline" onsubmit={(e) => { if (!confirm('¿Eliminar este artículo?')) e.preventDefault(); }}>
										<input type="hidden" name="id" value={post.id} />
										<button class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
											<Icon nombre="trash" size={16} />
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="py-16 text-center">
				<Icon nombre="newspaper" size={36} class="mx-auto text-slate-300" />
				<p class="mt-3 text-sm text-slate-500">Aún no hay artículos.</p>
			</div>
		{/if}
	</div>
	<Pagination totalPages={data.posts.totalPages} actual={data.posts.number} base="/admin/blog" />
{/if}
