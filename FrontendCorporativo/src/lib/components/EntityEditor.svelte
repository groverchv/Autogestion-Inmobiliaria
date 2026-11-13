<script lang="ts" module>
	export interface Campo {
		key: string;
		label: string;
		tipo: 'texto' | 'textarea' | 'numero' | 'checkbox' | 'imagen' | 'select';
		opciones?: { valor: string; texto: string }[];
		requerido?: boolean;
	}
</script>

<script lang="ts" generics="T extends { id: number }">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import ImageUpload from './ImageUpload.svelte';

	interface Props {
		titulo: string;
		entidad: string;
		items: T[];
		campos: Campo[];
		columnas: { key: string; label: string }[];
		nuevoItem: () => Partial<T>;
	}

	let { titulo, entidad, items, campos, columnas, nuevoItem }: Props = $props();

	let editando = $state<Partial<T> | null>(null);
	let error = $state<string | null>(null);

	function abrir(item?: T) {
		editando = item ? { ...item } : nuevoItem();
		error = null;
	}

	function valorDe(campo: Campo): string {
		const v = (editando as Record<string, unknown>)?.[campo.key];
		if (campo.tipo === 'checkbox') return '';
		return v == null ? '' : String(v);
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-lg font-bold text-navy-900">{titulo} <span class="text-sm font-normal text-slate-400">({items.length})</span></h2>
	<button
		onclick={() => abrir()}
		class="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
	>
		<Icon nombre="plus" size={15} /> Nuevo
	</button>
</div>

<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
	{#if items.length}
		<table class="w-full text-left text-sm">
			<thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
				<tr>
					{#each columnas as col (col.key)}
						<th class="px-4 py-3 font-semibold">{col.label}</th>
					{/each}
					<th class="px-4 py-3 text-right font-semibold">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each items as item (item.id)}
					<tr class="hover:bg-slate-50">
						{#each columnas as col (col.key)}
							{@const v = (item as Record<string, unknown>)[col.key]}
							<td class="max-w-48 truncate px-4 py-3 text-slate-600">
								{#if typeof v === 'boolean'}
									<span class="rounded-full px-2 py-0.5 text-xs font-semibold {v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
										{v ? 'Sí' : 'No'}
									</span>
								{:else}
									{v ?? '—'}
								{/if}
							</td>
						{/each}
						<td class="px-4 py-3">
							<div class="flex justify-end gap-1">
								<button onclick={() => abrir(item)} class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600" title="Editar">
									<Icon nombre="pencil" size={15} />
								</button>
								<form method="POST" action="?/eliminar" use:enhance class="inline" onsubmit={(e) => { if (!confirm('¿Eliminar este registro?')) e.preventDefault(); }}>
									<input type="hidden" name="entidad" value={entidad} />
									<input type="hidden" name="id" value={item.id} />
									<button class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
										<Icon nombre="trash" size={15} />
									</button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="py-10 text-center text-sm text-slate-400">Sin registros. Crea el primero con "Nuevo".</p>
	{/if}
</div>

<!-- Panel de edición -->
{#if editando}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4" role="dialog" aria-modal="true">
		<div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
			<div class="mb-5 flex items-center justify-between">
				<h3 class="text-lg font-bold text-navy-900">
					{editando.id ? 'Editar' : 'Nuevo'} {titulo.slice(0, -1).toLowerCase()}
				</h3>
				<button onclick={() => (editando = null)} class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
					<Icon nombre="x" size={18} />
				</button>
			</div>

			<form
				method="POST"
				action="?/guardar"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success' || result.type === 'redirect') {
							editando = null;
							location.reload();
						} else if (result.type === 'failure') {
							error = (result.data as { error?: string })?.error ?? 'Error al guardar';
						}
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="entidad" value={entidad} />
				<input type="hidden" name="id" value={editando.id ?? ''} />

				{#each campos as campo (campo.key)}
					{#if campo.tipo === 'checkbox'}
						<label class="flex items-center gap-2.5">
							<input
								type="checkbox"
								name={campo.key}
								checked={Boolean((editando as Record<string, unknown>)[campo.key] ?? true)}
								class="h-4 w-4 rounded border-slate-300 text-brand-600"
							/>
							<span class="text-sm font-medium text-slate-700">{campo.label}</span>
						</label>
					{:else if campo.tipo === 'textarea'}
						<label class="block">
							<span class="mb-1 block text-sm font-medium text-slate-700">{campo.label}</span>
							<textarea
								name={campo.key}
								rows="3"
								required={campo.requerido}
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
							>{valorDe(campo)}</textarea>
						</label>
					{:else if campo.tipo === 'imagen'}
						<ImageUpload
							etiqueta={campo.label}
							valor={valorDe(campo)}
							onSubida={(url) => {
								if (editando) (editando as Record<string, unknown>)[campo.key] = url;
							}}
						/>
						<input type="hidden" name={campo.key} value={valorDe(campo)} />
					{:else if campo.tipo === 'select'}
						<label class="block">
							<span class="mb-1 block text-sm font-medium text-slate-700">{campo.label}</span>
							<select name={campo.key} class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
								{#each campo.opciones ?? [] as op (op.valor)}
									<option value={op.valor} selected={valorDe(campo) === op.valor}>{op.texto}</option>
								{/each}
							</select>
						</label>
					{:else}
						<label class="block">
							<span class="mb-1 block text-sm font-medium text-slate-700">{campo.label}{campo.requerido ? ' *' : ''}</span>
							<input
								name={campo.key}
								type={campo.tipo === 'numero' ? 'number' : 'text'}
								value={valorDe(campo)}
								required={campo.requerido}
								class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
							/>
						</label>
					{/if}
				{/each}

				{#if error}
					<p class="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
				{/if}

				<div class="flex gap-3 pt-2">
					<button type="submit" class="flex-1 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
						Guardar
					</button>
					<button type="button" onclick={() => (editando = null)} class="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
