<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		valor?: string;
		onSubida?: (url: string) => void;
		etiqueta?: string;
	}

	let { valor = '', onSubida, etiqueta = 'Imagen' }: Props = $props();
	let subiendo = $state(false);
	let error = $state('');

	async function subir(e: Event) {
		const input = e.target as HTMLInputElement;
		const archivo = input.files?.[0];
		if (!archivo) return;
		subiendo = true;
		error = '';
		try {
			const fd = new FormData();
			fd.append('archivo', archivo);
			const resp = await fetch('/admin/api/upload', { method: 'POST', body: fd });
			const data = await resp.json();
			if (!resp.ok) throw new Error(data.error || 'Error al subir');
			onSubida?.(data.url);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al subir';
		} finally {
			subiendo = false;
			input.value = '';
		}
	}
</script>

<div>
	<span class="mb-1.5 block text-sm font-medium text-slate-700">{etiqueta}</span>
	<div class="flex items-start gap-3">
		{#if valor}
			<img src={valor} alt="Vista previa" class="h-16 w-24 rounded-lg border border-slate-200 object-cover" />
		{:else}
			<div class="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-300">
				<Icon nombre="image" size={22} />
			</div>
		{/if}
		<div class="flex-1">
			<label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
				{#if subiendo}<Icon nombre="loader" size={15} class="animate-spin" />{:else}<Icon nombre="upload" size={15} />{/if}
				{subiendo ? 'Subiendo...' : 'Subir imagen'}
				<input type="file" accept="image/*" class="hidden" onchange={subir} disabled={subiendo} />
			</label>
			<input
				type="text"
				bind:value={valor}
				oninput={() => onSubida?.(valor)}
				placeholder="o pega una URL de imagen"
				class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
			/>
			{#if error}<p class="mt-1 text-xs text-red-600">{error}</p>{/if}
		</div>
	</div>
</div>
