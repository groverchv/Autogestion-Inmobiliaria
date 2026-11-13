<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let mostrarForm = $state(false);
	let editando = $state<number | null>(null);
	let mostrarPassword = $state(false);
	let enviando = $state(false);

	const inputCls =
		'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
	const esAdmin = $derived(data.admin?.rol === 'ADMIN');
</script>

<svelte:head><title>Usuarios — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6 flex items-end justify-between">
	<div>
		<h1 class="text-2xl font-bold text-navy-900">Usuarios del panel</h1>
		<p class="mt-1 text-sm text-slate-500">Cuentas con acceso al panel administrativo.</p>
	</div>
	{#if esAdmin}
		<button
			onclick={() => { mostrarForm = !mostrarForm; editando = null; }}
			class="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
		>
			<Icon nombre="plus" size={16} /> Nuevo usuario
		</button>
	{/if}
</div>

{#if form?.ok}
	<div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
		{form.accion === 'miPassword' ? 'Contraseña actualizada correctamente.' : 'Cambio guardado correctamente.'}
	</div>
{/if}
{#if form?.error}
	<div class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{form.error}</div>
{/if}
{#if data.error}
	<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{data.error}</div>
{/if}

{#if mostrarForm && esAdmin}
	<form
		method="POST"
		action="?/crear"
		use:enhance={() => { enviando = true; return async ({ update }) => { await update(); enviando = false; mostrarForm = false; }; }}
		class="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
	>
		<h2 class="text-lg font-bold text-navy-900 sm:col-span-2">Nuevo usuario</h2>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
			<input name="nombre" required class={inputCls} />
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Correo</span>
			<input name="email" type="email" required class={inputCls} />
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</span>
			<select name="rol" required class={inputCls}>
				<option value="EDITOR">Editor (contenido)</option>
				<option value="ADMIN">Administrador (total)</option>
			</select>
		</label>
		<label class="block">
			<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña (mín. 8)</span>
			<input name="password" type="password" required minlength="8" class={inputCls} />
		</label>
		<div class="sm:col-span-2">
			<button disabled={enviando} class="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
				{enviando ? 'Guardando…' : 'Crear usuario'}
			</button>
		</div>
	</form>
{/if}

<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
	<table class="w-full text-left text-sm">
		<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
			<tr>
				<th class="px-5 py-3">Usuario</th>
				<th class="px-5 py-3">Rol</th>
				<th class="px-5 py-3">Estado</th>
				{#if esAdmin}<th class="px-5 py-3 text-right">Acciones</th>{/if}
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each data.usuarios as u (u.id)}
				<tr class={u.activo ? '' : 'opacity-50'}>
					<td class="px-5 py-4">
						<p class="font-medium text-navy-900">{u.nombre}</p>
						<p class="text-xs text-slate-500">{u.email}</p>
					</td>
					<td class="px-5 py-4">
						<span class="rounded-full px-2.5 py-1 text-xs font-semibold {u.rol === 'ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}">
							{u.rol === 'ADMIN' ? 'Administrador' : 'Editor'}
						</span>
					</td>
					<td class="px-5 py-4">
						<span class="rounded-full px-2.5 py-1 text-xs font-semibold {u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
							{u.activo ? 'Activo' : 'Inactivo'}
						</span>
					</td>
					{#if esAdmin}
						<td class="px-5 py-4 text-right">
							<div class="flex justify-end gap-2">
								<button
									onclick={() => { editando = editando === u.id ? null : u.id; mostrarForm = false; }}
									class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
								>
									Editar
								</button>
								<form method="POST" action="?/activo" use:enhance>
									<input type="hidden" name="id" value={u.id} />
									<input type="hidden" name="activo" value={String(!u.activo)} />
									<button class="rounded-lg border px-3 py-1.5 text-xs font-medium {u.activo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}">
										{u.activo ? 'Desactivar' : 'Activar'}
									</button>
								</form>
							</div>
						</td>
					{/if}
				</tr>
				{#if editando === u.id}
					<tr>
						<td colspan="4" class="bg-slate-50 px-5 py-4">
							<form method="POST" action="?/editar" use:enhance={() => { return async ({ update }) => { await update(); editando = null; }; }}
								class="grid gap-3 sm:grid-cols-4">
								<input type="hidden" name="id" value={u.id} />
								<input name="nombre" value={u.nombre} required class={inputCls} placeholder="Nombre" />
								<input name="email" type="email" value={u.email} required class={inputCls} placeholder="Correo" />
								<select name="rol" value={u.rol} class={inputCls}>
									<option value="EDITOR">Editor</option>
									<option value="ADMIN">Administrador</option>
								</select>
								<input name="password" type="password" class={inputCls} placeholder="Nueva contraseña (opcional)" minlength="8" />
								<div class="sm:col-span-4">
									<button class="rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800">Guardar cambios</button>
								</div>
							</form>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<div class="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
	<button onclick={() => (mostrarPassword = !mostrarPassword)} class="flex items-center gap-2 text-sm font-semibold text-navy-900">
		<Icon nombre="key-round" size={16} /> Cambiar mi contraseña
		<Icon nombre="chevron-down" size={14} class="transition-transform {mostrarPassword ? 'rotate-180' : ''}" />
	</button>
	{#if mostrarPassword}
		<form method="POST" action="?/miPassword" use:enhance class="mt-4 grid max-w-md gap-3">
			<label class="block">
				<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Contraseña actual</span>
				<input name="actual" type="password" required class={inputCls} />
			</label>
			<label class="block">
				<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nueva contraseña (mín. 8)</span>
				<input name="nueva" type="password" required minlength="8" class={inputCls} />
			</label>
			<button class="w-fit rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
				Actualizar contraseña
			</button>
		</form>
	{/if}
</div>
