<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import ImageUpload from './ImageUpload.svelte';
	import { marked } from 'marked';
	import type { BlogPost } from '$lib/types';

	interface Props {
		post?: BlogPost | null;
		error?: string | null;
	}

	let { post = null, error = null }: Props = $props();

	let titulo = $state(post?.titulo ?? '');
	let slug = $state(post?.slug ?? '');
	let resumen = $state(post?.resumen ?? '');
	let contenidoMd = $state(post?.contenidoMd ?? '');
	let portadaUrl = $state(post?.portadaUrl ?? '');
	let categoria = $state(post?.categoria ?? '');
	let estado = $state(post?.estado ?? 'BORRADOR');
	let vistaPrevia = $state(false);
	let enviando = $state(false);
	let areaMd: HTMLTextAreaElement | null = $state(null);

	const htmlPrevia = $derived(vistaPrevia ? marked.parse(contenidoMd) : '');

	/** Inserta sintaxis Markdown en la posición del cursor (o envuelve la selección). */
	function insertarMd(antes: string, despues = '', placeholder = '') {
		if (!areaMd) return;
		const ini = areaMd.selectionStart;
		const fin = areaMd.selectionEnd;
		const sel = contenidoMd.slice(ini, fin) || placeholder;
		contenidoMd = contenidoMd.slice(0, ini) + antes + sel + despues + contenidoMd.slice(fin);
		const pos = ini + antes.length + sel.length;
		requestAnimationFrame(() => { areaMd?.focus(); areaMd?.setSelectionRange(pos, pos); });
	}

	const herramientas: { etiqueta: string; titulo: string; accion: () => void }[] = [
		{ etiqueta: 'H2', titulo: 'Encabezado 2', accion: () => insertarMd('\n## ', '', 'Sección') },
		{ etiqueta: 'H3', titulo: 'Encabezado 3', accion: () => insertarMd('\n### ', '', 'Subsección') },
		{ etiqueta: 'B', titulo: 'Negrita', accion: () => insertarMd('**', '**', 'texto') },
		{ etiqueta: 'I', titulo: 'Cursiva', accion: () => insertarMd('*', '*', 'texto') },
		{ etiqueta: '•', titulo: 'Lista', accion: () => insertarMd('\n- ', '', 'Elemento') },
		{ etiqueta: '1.', titulo: 'Lista numerada', accion: () => insertarMd('\n1. ', '', 'Elemento') },
		{ etiqueta: '❝', titulo: 'Cita', accion: () => insertarMd('\n> ', '', 'Cita') },
		{ etiqueta: '🔗', titulo: 'Enlace', accion: () => insertarMd('[', '](https://)', 'texto del enlace') },
		{ etiqueta: '</>', titulo: 'Código', accion: () => insertarMd('`', '`', 'código') }
	];

	function generarSlug(texto: string): string {
		return texto
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
</script>

<form
	method="POST"
	action="?/guardar"
	use:enhance={() => {
		enviando = true;
		return async ({ update }) => {
			enviando = false;
			await update();
		};
	}}
	class="grid gap-6 lg:grid-cols-3"
>
	<div class="space-y-5 lg:col-span-2">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<label class="block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Título *</span>
				<input
					name="titulo"
					bind:value={titulo}
					required
					maxlength="220"
					oninput={() => { if (!post?.id) slug = generarSlug(titulo); }}
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
					placeholder="Título del artículo"
				/>
			</label>
			<label class="mt-4 block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Slug (URL)</span>
				<input
					name="slug"
					bind:value={slug}
					maxlength="220"
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm focus:border-brand-500 focus:outline-none"
					placeholder="titulo-del-articulo"
				/>
			</label>
			<label class="mt-4 block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Resumen</span>
				<textarea
					name="resumen"
					bind:value={resumen}
					rows="2"
					maxlength="400"
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
					placeholder="Breve descripción para listados y SEO..."
				></textarea>
			</label>
			<label class="mt-4 block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Categoría</span>
				<input
					name="categoria"
					bind:value={categoria}
					maxlength="60"
					list="categorias-sugeridas"
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
					placeholder="Mercado, Guías, Legal, Tecnología…"
				/>
				<datalist id="categorias-sugeridas">
					<option value="Mercado"></option>
					<option value="Guías"></option>
					<option value="Legal"></option>
					<option value="Tecnología"></option>
					<option value="Empresa"></option>
				</datalist>
			</label>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="mb-3 flex items-center justify-between">
				<span class="text-sm font-medium text-slate-700">Contenido (Markdown)</span>
				<button
					type="button"
					onclick={() => (vistaPrevia = !vistaPrevia)}
					class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
				>
					<Icon nombre={vistaPrevia ? 'pencil' : 'eye'} size={14} />
					{vistaPrevia ? 'Editar' : 'Vista previa'}
				</button>
			</div>
			{#if vistaPrevia}
				<div class="prose-contenido min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-5">
					{#await htmlPrevia then html}
						{@html html}
					{/await}
				</div>
			{:else}
				<div class="mb-2 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label="Formato">
					{#each herramientas as h (h.etiqueta)}
						<button
							type="button"
							title={h.titulo}
							aria-label={h.titulo}
							onclick={h.accion}
							class="rounded px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-navy-900"
						>
							{h.etiqueta}
						</button>
					{/each}
				</div>
				<textarea
					name="contenidoMd"
					bind:this={areaMd}
					bind:value={contenidoMd}
					rows="16"
					class="w-full rounded-lg border border-slate-300 px-3.5 py-3 font-mono text-sm leading-relaxed focus:border-brand-500 focus:outline-none"
					placeholder="## Sección&#10;&#10;Escribe el contenido en Markdown..."
				></textarea>
			{/if}
			<input type="hidden" name="contenidoMdHidden" value={contenidoMd} />
		</div>
	</div>

	<aside class="space-y-5">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<span class="mb-1.5 block text-sm font-medium text-slate-700">Estado</span>
			<select name="estado" bind:value={estado} class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm">
				<option value="BORRADOR">Borrador</option>
				<option value="PUBLICADO">Publicado</option>
			</select>
			{#if estado === 'PUBLICADO'}
				<p class="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
					<Icon nombre="bell-ring" size={14} class="mt-0.5 shrink-0" />
					Al publicarse, se enviará una notificación push a los suscriptores.
				</p>
			{/if}
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<ImageUpload
				etiqueta="Imagen de portada"
				valor={portadaUrl}
				onSubida={(url) => (portadaUrl = url)}
			/>
			<input type="hidden" name="portadaUrl" value={portadaUrl} />
		</div>

		{#if error}
			<p class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
				<Icon nombre="circle-alert" size={16} /> {error}
			</p>
		{/if}

		<button
			type="submit"
			disabled={enviando}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 py-3 font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
		>
			{#if enviando}<Icon nombre="loader" size={17} class="animate-spin" /> Guardando...{:else}<Icon nombre="save" size={17} /> Guardar{/if}
		</button>
		<a href="/admin/blog" class="block text-center text-sm text-slate-500 hover:text-slate-700">← Volver al listado</a>
	</aside>
</form>
