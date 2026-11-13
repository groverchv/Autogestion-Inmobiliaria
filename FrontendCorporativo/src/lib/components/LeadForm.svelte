<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';

	interface Props {
		tipo?: 'contacto' | 'visita' | 'vender' | 'postulacion' | 'soporte';
		titulo?: string;
		vacanteId?: number | null;
		conAsunto?: boolean;
		conCv?: boolean;
		asuntoOculto?: string;
		textoBoton?: string;
		form?: { ok?: boolean; mensaje?: string; error?: string; campos?: Record<string, string> } | null;
	}

	let {
		tipo = 'contacto',
		titulo,
		vacanteId = null,
		conAsunto = true,
		conCv = false,
		asuntoOculto,
		textoBoton = 'Enviar mensaje',
		form = null
	}: Props = $props();

	let enviando = $state(false);
	let enviado = $state(false);
	let errorMsg = $state<string | null>(null);
	let subiendoCv = $state(false);
	let cvUrl = $state('');
	let cvNombre = $state('');
	let cvError = $state('');

	const errores = $derived(form?.campos ?? {});

	const acciones: Record<string, string> = {
		contacto: '?/contacto',
		visita: '?/visita',
		vender: '?/vender',
		postulacion: '?/postulacion',
		soporte: '?/soporte'
	};

	const inputCls =
		'w-full rounded-lg border px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

	function borde(campo: string): string {
		return errores[campo] ? 'border-red-400' : 'border-slate-300';
	}

	async function subirCv(e: Event) {
		const input = e.target as HTMLInputElement;
		const archivo = input.files?.[0];
		cvError = '';
		if (!archivo) return;
		const tipos = ['application/pdf', 'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
		if (!tipos.includes(archivo.type)) {
			cvError = 'Solo se aceptan PDF o Word (.doc/.docx)';
			input.value = '';
			return;
		}
		if (archivo.size > 5 * 1024 * 1024) {
			cvError = 'Máximo 5 MB';
			input.value = '';
			return;
		}
		subiendoCv = true;
		try {
			const fd = new FormData();
			fd.append('archivo', archivo);
			const resp = await fetch('/api/adjuntos', { method: 'POST', body: fd });
			if (!resp.ok) {
				const data = await resp.json().catch(() => null);
				throw new Error(data?.message ?? 'Error al subir');
			}
			const { url } = await resp.json();
			cvUrl = url;
			cvNombre = archivo.name;
		} catch (err) {
			cvError = err instanceof Error ? err.message : 'No se pudo subir el CV';
		} finally {
			subiendoCv = false;
		}
	}
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
	{#if titulo}
		<h3 class="mb-5 text-xl font-bold text-navy-900">{titulo}</h3>
	{/if}

	{#if enviado || form?.ok}
		<div class="flex flex-col items-center py-8 text-center">
			<span class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
				<Icon nombre="check-circle" size={28} />
			</span>
			<h4 class="mt-4 text-lg font-bold text-navy-900">¡Mensaje enviado!</h4>
			<p class="mt-2 max-w-sm text-sm text-slate-500">
				{form?.mensaje ?? 'Recibimos tu solicitud. Un asesor te contactará dentro de las próximas 24 horas hábiles.'}
			</p>
			<p class="mt-3 text-xs text-slate-400">También te enviamos una confirmación por correo.</p>
		</div>
	{:else}
		<form
			method="POST"
			action={acciones[tipo]}
			use:enhance={() => {
				enviando = true;
				errorMsg = null;
				return async ({ result, update }) => {
					enviando = false;
					if (result.type === 'success') {
						enviado = true;
					} else if (result.type === 'failure') {
						errorMsg = (result.data as { error?: string })?.error ?? 'No se pudo enviar. Intenta de nuevo.';
					}
					await update();
				};
			}}
			class="grid gap-4"
		>
			<input type="hidden" name="vacanteId" value={vacanteId ?? ''} />
			<input type="hidden" name="adjuntoUrl" value={cvUrl} />
			{#if asuntoOculto}
				<input type="hidden" name="asunto" value={asuntoOculto} />
			{/if}
			<!-- Honeypot anti-spam: invisible para humanos -->
			<input
				type="text"
				name="empresaWeb"
				tabindex="-1"
				autocomplete="off"
				class="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
				aria-hidden="true"
			/>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Nombre completo *</span>
					<input name="nombre" required maxlength="150" aria-invalid={!!errores.nombre} class="{inputCls} {borde('nombre')}" placeholder="Tu nombre" />
					{#if errores.nombre}<span class="mt-1 block text-xs text-red-600">{errores.nombre}</span>{/if}
				</label>
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico *</span>
					<input name="email" type="email" required maxlength="150" aria-invalid={!!errores.email} class="{inputCls} {borde('email')}" placeholder="tu@correo.com" />
					{#if errores.email}<span class="mt-1 block text-xs text-red-600">{errores.email}</span>{/if}
				</label>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Teléfono / WhatsApp</span>
					<input name="telefono" maxlength="40" class="{inputCls} border-slate-300" placeholder="+591 ..." />
				</label>
				{#if conAsunto}
					<label class="block">
						<span class="mb-1.5 block text-sm font-medium text-slate-700">Asunto</span>
						<input name="asunto" maxlength="200" class="{inputCls} border-slate-300" placeholder="¿En qué podemos ayudarte?" />
					</label>
				{/if}
			</div>

			<label class="block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Mensaje *</span>
				<textarea
					name="mensaje"
					required
					rows="4"
					maxlength="4000"
					aria-invalid={!!errores.mensaje}
					class="{inputCls} {borde('mensaje')}"
					placeholder="Cuéntanos los detalles..."
				></textarea>
				{#if errores.mensaje}<span class="mt-1 block text-xs text-red-600">{errores.mensaje}</span>{/if}
			</label>

			{#if conCv}
				<div>
					<span class="mb-1.5 block text-sm font-medium text-slate-700">Currículum (PDF o Word, máx. 5 MB)</span>
					{#if cvUrl}
						<p class="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
							<Icon nombre="check-circle" size={16} /> {cvNombre} — listo para enviar
						</p>
					{:else}
						<label class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600">
							<Icon nombre={subiendoCv ? 'loader' : 'upload'} size={16} class={subiendoCv ? 'animate-spin' : ''} />
							{subiendoCv ? 'Subiendo…' : 'Adjuntar CV'}
							<input type="file" accept=".pdf,.doc,.docx" class="sr-only" onchange={subirCv} disabled={subiendoCv} />
						</label>
					{/if}
					{#if cvError}<span class="mt-1 block text-xs text-red-600">{cvError}</span>{/if}
				</div>
			{/if}

			<label class="flex cursor-pointer items-start gap-2.5">
				<input
					type="checkbox"
					name="aceptaPrivacidad"
					required
					class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600 focus:ring-2 focus:ring-brand-500/30"
				/>
				<span class="text-xs text-slate-500">
					Acepto la <a href="/legal/privacidad" class="font-medium text-brand-600 underline">política de privacidad</a>
					y el tratamiento de mis datos para responder esta solicitud. *
				</span>
			</label>

			{#if errorMsg || form?.error}
				<p class="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
					<Icon nombre="circle-alert" size={16} /> {errorMsg ?? form?.error}
				</p>
			{/if}

			<button
				type="submit"
				disabled={enviando || subiendoCv}
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
			>
				{#if enviando}
					<Icon nombre="loader" size={18} class="animate-spin" /> Enviando...
				{:else}
					<Icon nombre="send" size={17} /> {textoBoton}
				{/if}
			</button>
		</form>
	{/if}
</div>
