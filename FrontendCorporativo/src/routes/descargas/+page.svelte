<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SectionTitle from '$lib/components/SectionTitle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Centro de descargas</span>
		<h1 class="mt-2 text-4xl font-extrabold">Accede a la plataforma</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Todos los puntos de acceso a Inmobiliaria 360: aplicación web para escritorio y aplicación móvil.
		</p>
	</div>
</section>

<section class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Plataforma web -->
		<article class="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
			<span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
				<Icon nombre="monitor" size={28} />
			</span>
			<h2 class="mt-5 text-xl font-bold text-navy-900">Aplicación web</h2>
			<p class="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
				La plataforma completa para clientes y agentes: publicaciones, recorridos 360°, gestión de
				operaciones y panel administrativo. Funciona en cualquier navegador moderno, sin instalar nada.
			</p>
			{#if data.ultima}
				<p class="mt-3 text-xs font-medium text-slate-400">Versión actual: v{data.ultima}</p>
			{/if}
			<a
				href={data.appUrl}
				target="_blank"
				rel="noopener"
				class="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
			>
				Abrir plataforma <Icon nombre="arrow-right" size={16} />
			</a>
		</article>

		<!-- App móvil -->
		<article class="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
			<span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
				<Icon nombre="smartphone" size={28} />
			</span>
			<h2 class="mt-5 text-xl font-bold text-navy-900">Aplicación móvil</h2>
			<p class="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
				Explora el catálogo, agenda visitas y recibe notificaciones desde tu teléfono Android.
				Disponible como APK directa mientras finaliza su publicación en Google Play.
			</p>
			<a
				href={`${data.appUrl}/descargas/inmo360.apk`}
				target="_blank"
				rel="noopener"
				class="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border border-navy-900 px-5 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white"
			>
				<Icon nombre="download" size={16} /> Descargar APK (Android)
			</a>
		</article>
	</div>

	<div class="mt-10 rounded-2xl bg-slate-50 p-8">
		<SectionTitle
			etiqueta="Requisitos"
			titulo="Qué necesitas"
			subtitulo="La plataforma web funciona en Chrome, Firefox, Edge y Safari actualizados. La app móvil requiere Android 8.0 o superior. El sitio corporativo puede instalarse como PWA desde el menú del navegador."
			centrado={false}
		/>
		<div class="mt-4 flex flex-wrap gap-4 text-sm">
			<a href="/actualizaciones" class="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
				<Icon nombre="newspaper" size={15} /> Ver historial de versiones
			</a>
			<a href="/estado" class="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
				<Icon nombre="activity" size={15} /> Estado del servicio
			</a>
			<a href="/contacto" class="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700">
				<Icon nombre="mail" size={15} /> Soporte técnico
			</a>
		</div>
	</div>
</section>
