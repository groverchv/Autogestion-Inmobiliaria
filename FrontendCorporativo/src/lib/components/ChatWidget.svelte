<script lang="ts">
	import { onDestroy } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	interface Props {
		whatsapp?: string;
	}

	interface Mensaje {
		de: 'bot' | 'usuario';
		texto: string;
		accion?: string;
	}

	let { whatsapp = '' }: Props = $props();

	const ANCHO_PANEL = 380;

	let abierto = $state(false);
	let mensajes = $state<Mensaje[]>([]);
	let sugerencias = $state<string[]>([]);
	let entrada = $state('');
	let escribiendo = $state(false);
	let mostrarEscalado = $state(false);
	let enviandoEscalado = $state(false);
	let bandeja = $state<HTMLElement | null>(null);
	let esEscritorio = $state(false);
	let escuchando = $state(false);
	let reconocimiento: { stop: () => void } | null = null;

	const SUGERENCIAS_INICIALES = ['¿Qué servicios ofrecen?', '¿Cómo vendo mi propiedad?', '¿Dónde están ubicados?', 'Quiero trabajar con ustedes'];

	function acomodarContenido() {
		if (typeof document === 'undefined') return;
		esEscritorio = window.matchMedia('(min-width: 768px)').matches;
		// En escritorio el panel va anclado a la derecha a toda altura:
		// desplaza el contenido para no tapar nada. En móvil superpone.
		document.body.style.paddingRight = abierto && esEscritorio ? `${ANCHO_PANEL}px` : '';
	}

	$effect(() => {
		abierto; // re-evaluar al abrir/cerrar y al cambiar el ancho de ventana
		const mq = window.matchMedia('(min-width: 768px)');
		acomodarContenido();
		mq.addEventListener('change', acomodarContenido);
		return () => mq.removeEventListener('change', acomodarContenido);
	});

	async function abrir() {
		abierto = !abierto;
		if (!abierto) reconocimiento?.stop();
		if (abierto && mensajes.length === 0) {
			mensajes = [{ de: 'bot', texto: '¡Hola! Soy el asistente virtual de Inmobiliaria 360. Pregúntame lo que necesites: servicios, precios, cómo contactarnos. Puedes escribir o tocar el micrófono y hablarme. ¿En qué te ayudo?' }];
			sugerencias = SUGERENCIAS_INICIALES;
		}
	}

	// Dictado por voz (Web Speech API; Chrome/Edge, en producción requiere HTTPS).
	// Se evalúa solo en el cliente para no romper la hidratación SSR.
	let micDisponible = $state(false);
	$effect(() => {
		micDisponible = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
	});

	function alternarMicrofono() {
		if (escuchando) {
			reconocimiento?.stop();
			return;
		}
		const SR = (window as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
			.SpeechRecognition
			?? (window as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
		if (!SR) return;
		const rec = new SR();
		reconocimiento = rec;
		rec.lang = 'es-ES';
		rec.interimResults = false;
		rec.maxAlternatives = 1;
		rec.onresult = (e: SpeechRecognitionEvent) => {
			const texto = e.results[0]?.[0]?.transcript ?? '';
			escuchando = false;
			if (texto) {
				entrada = texto;
				enviar();
			}
		};
		rec.onend = () => { escuchando = false; };
		rec.onerror = () => { escuchando = false; };
		rec.start();
		escuchando = true;
	}

	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.paddingRight = '';
	});

	async function enviar(texto?: string) {
		const pregunta = (texto ?? entrada).trim();
		if (!pregunta || escribiendo) return;
		entrada = '';
		mostrarEscalado = false;
		sugerencias = [];
		mensajes = [...mensajes, { de: 'usuario', texto: pregunta }];
		escribiendo = true;
		try {
			const resp = await fetch('/api/agente', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mensaje: pregunta,
					historial: mensajes.slice(-8).map((m) => ({
						rol: m.de === 'usuario' ? 'usuario' : 'agente',
						texto: m.texto.slice(0, 800)
					}))
				})
			});
			const data = await resp.json();
			const accion = data?.accion?.tipo as string | undefined;
			mensajes = [...mensajes, { de: 'bot', texto: data?.texto || 'No pude responder, intenta de nuevo.', accion }];
			if (Array.isArray(data?.sugerencias) && data.sugerencias.length) {
				sugerencias = data.sugerencias.slice(0, 3);
			}
			if (accion === 'lead') {
				mensajes = [...mensajes, { de: 'bot', texto: 'Tus datos quedaron registrados. Un asesor te contactará pronto.' }];
			}
		} catch {
			mensajes = [...mensajes, { de: 'bot', texto: 'Error de conexión. Intenta por WhatsApp o desde la página de contacto.' }];
			mostrarEscalado = true;
		}
		escribiendo = false;
		queueMicrotask(() => bandeja?.scrollTo({ top: bandeja.scrollHeight, behavior: 'smooth' }));
	}

	async function escalar(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const datos = new FormData(form);
		enviandoEscalado = true;
		try {
			const resp = await fetch('/api/soporte-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					nombre: datos.get('nombre'),
					email: datos.get('email'),
					mensaje: datos.get('mensaje')
				})
			});
			if (resp.ok) {
				mensajes = [...mensajes, { de: 'bot', texto: 'Listo, derivé tu consulta a un asesor. Te escribiremos a tu correo en menos de 24 horas hábiles.' }];
				mostrarEscalado = false;
			} else {
				mensajes = [...mensajes, { de: 'bot', texto: 'No pude enviar la solicitud ahora mismo. Por favor intenta por WhatsApp o desde la página de contacto.' }];
			}
		} catch {
			mensajes = [...mensajes, { de: 'bot', texto: 'Error de conexión. Intenta por WhatsApp o desde la página de contacto.' }];
		}
		enviandoEscalado = false;
	}

	const urlWhatsapp = $derived(
		whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}` : ''
	);
</script>

{#if abierto}
	<aside
		class="fixed z-40 flex flex-col border-slate-200 bg-white shadow-2xl
			bottom-0 right-0 top-0 w-full border-l md:w-[380px]"
		aria-label="Asistente virtual"
	>
		<header class="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white">
			<span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500"><Icon nombre="bot" size={20} /></span>
			<div class="flex-1">
				<p class="text-sm font-bold">Asistente virtual</p>
				<p class="text-xs text-slate-300">Responde al instante · deriva a un asesor</p>
			</div>
			<button onclick={abrir} class="rounded-lg p-1.5 hover:bg-navy-800" aria-label="Cerrar chat">
				<Icon nombre="x" size={18} />
			</button>
		</header>

		<div bind:this={bandeja} class="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
			{#each mensajes as m}
				<div class="flex {m.de === 'usuario' ? 'justify-end' : 'justify-start'}">
					<p class="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed {m.de === 'usuario' ? 'bg-navy-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}">
						{m.texto}
					</p>
				</div>
			{/each}
			{#if escuchando}
				<p class="text-xs italic text-red-500">Escuchando… habla ahora.</p>
			{/if}
			{#if escribiendo}
				<p class="text-xs italic text-slate-400">El asistente está escribiendo…</p>
			{/if}
			{#if sugerencias.length > 0 && !escribiendo}
				<div class="flex flex-wrap gap-1.5 pt-1">
					{#each sugerencias as s (s)}
						<button onclick={() => enviar(s)} class="rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
							{s}
						</button>
					{/each}
				</div>
			{/if}
			{#if mensajes.at(-1)?.accion === 'whatsapp' && urlWhatsapp}
				<a href={urlWhatsapp} target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600">
					<Icon nombre="whatsapp" size={14} /> Hablar por WhatsApp
				</a>
			{/if}
		</div>

		{#if mostrarEscalado}
			<form onsubmit={escalar} class="space-y-2 border-t border-slate-200 bg-white p-3">
				<p class="text-xs font-semibold text-navy-900">Derivar a un asesor:</p>
				<input name="nombre" required placeholder="Tu nombre" class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
				<input name="email" type="email" required placeholder="Tu email" class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
				<input type="hidden" name="mensaje" value={mensajes.filter((m) => m.de === 'usuario').map((m) => m.texto).join(' | ') || 'Consulta desde el chat'} />
				<div class="flex gap-2">
					<button type="submit" disabled={enviandoEscalado} class="flex-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
						{enviandoEscalado ? 'Enviando…' : 'Enviar a un asesor'}
					</button>
					{#if urlWhatsapp}
						<a href={urlWhatsapp} target="_blank" rel="noopener" class="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50">WhatsApp</a>
					{/if}
				</div>
			</form>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); enviar(); }} class="flex gap-2 border-t border-slate-200 bg-white p-3">
			<input
				bind:value={entrada}
				placeholder={escuchando ? 'Escuchando…' : 'Escribe o dicta tu consulta…'}
				class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
				aria-label="Escribe tu consulta"
			/>
			{#if micDisponible}
				<button
					type="button"
					onclick={alternarMicrofono}
					class="rounded-lg p-2.5 transition-colors {escuchando ? 'bg-red-500 text-white hover:bg-red-600' : 'border border-slate-300 text-slate-500 hover:bg-slate-100'}"
					aria-label={escuchando ? 'Detener dictado' : 'Dictar por voz'}
				>
					<Icon nombre={escuchando ? 'mic-off' : 'mic'} size={17} />
				</button>
			{/if}
			<button type="submit" class="rounded-lg bg-brand-600 p-2.5 text-white transition-colors hover:bg-brand-700" aria-label="Enviar mensaje">
				<Icon nombre="send" size={17} />
			</button>
		</form>
	</aside>
{/if}

{#if !abierto}
	<button
		onclick={abrir}
		class="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg transition-transform hover:scale-110 lg:bottom-5"
		aria-label="Abrir asistente virtual"
	>
		<Icon nombre="bot" size={24} />
	</button>
{/if}
