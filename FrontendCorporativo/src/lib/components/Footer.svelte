<script lang="ts">
	import type { ConfigSitio } from '$lib/types';
	import Icon from './Icon.svelte';
	import NewsletterForm from './NewsletterForm.svelte';

	let { config }: { config: ConfigSitio } = $props();

	const sociales = $derived(
		[
			{ nombre: 'facebook', url: config.social_facebook },
			{ nombre: 'instagram', url: config.social_instagram },
			{ nombre: 'linkedin', url: config.social_linkedin },
			{ nombre: 'youtube', url: config.social_youtube }
		].filter((s) => s.url)
	);

	const anio = new Date().getFullYear();
</script>

<footer class="bg-navy-950 text-slate-300">
	<div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
		<div class="grid gap-7 sm:gap-10 md:grid-cols-2 lg:grid-cols-4">
			<div>
				<span class="text-lg font-bold text-white">
					{config.empresa_nombre ?? 'Inmobiliaria 360'}
				</span>
				<p class="mt-2 text-sm leading-relaxed text-slate-400 sm:mt-3">
					{config.empresa_eslogan ?? ''}
				</p>
				{#if sociales.length}
					<div class="mt-3 flex gap-3 sm:mt-5">
						{#each sociales as red (red.nombre)}
							<a
								href={red.url}
								target="_blank"
								rel="noopener"
								aria-label={red.nombre}
								class="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-slate-300 transition-colors hover:bg-brand-600 hover:text-white"
							>
								<Icon nombre={red.nombre} size={17} />
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wider text-white">Explora</h3>
				<ul class="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs sm:mt-4 sm:text-sm md:block md:space-y-2.5">
					<li><a href="/servicios" class="hover:text-brand-400">Servicios</a></li>
					<li><a href="/planes" class="hover:text-brand-400">Planes</a></li>
					<li><a href="/nosotros" class="hover:text-brand-400">Nosotros</a></li>
					<li><a href="/blog" class="hover:text-brand-400">Blog</a></li>
					<li><a href="/trabaja-con-nosotros" class="hover:text-brand-400">Trabaja con nosotros</a></li>
					<li><a href="/vende-tu-propiedad" class="hover:text-brand-400">Vende tu propiedad</a></li>
					<li><a href="/descargas" class="hover:text-brand-400">Descargas</a></li>
					<li><a href="/actualizaciones" class="hover:text-brand-400">Actualizaciones</a></li>
					<li><a href="/estado" class="hover:text-brand-400">Estado del servicio</a></li>
				</ul>
			</div>

			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wider text-white">Contacto</h3>
				<ul class="mt-3 space-y-2.5 text-xs sm:mt-4 sm:space-y-3 sm:text-sm">
					{#if config.contacto_direccion}
						<li class="flex gap-2.5"><Icon nombre="map-pin" size={16} class="mt-0.5 shrink-0 text-brand-400" />{config.contacto_direccion}</li>
					{/if}
					{#if config.contacto_telefono}
						<li class="flex gap-2.5"><Icon nombre="phone" size={16} class="mt-0.5 shrink-0 text-brand-400" />{config.contacto_telefono}</li>
					{/if}
					{#if config.contacto_email}
						<li class="flex gap-2.5"><Icon nombre="mail" size={16} class="mt-0.5 shrink-0 text-brand-400" />{config.contacto_email}</li>
					{/if}
					{#if config.horario_atencion}
						<li class="flex gap-2.5"><Icon nombre="clock" size={16} class="mt-0.5 shrink-0 text-brand-400" />{config.horario_atencion}</li>
					{/if}
				</ul>
			</div>

			<div>
				<h3 class="text-sm font-semibold uppercase tracking-wider text-white">Boletín</h3>
				<p class="mt-3 text-xs text-slate-400 sm:mt-4 sm:text-sm">Novedades, servicios y análisis del mercado, una vez al mes.</p>
				<div class="mt-3 sm:mt-4">
					<NewsletterForm compacto />
				</div>
			</div>
		</div>

		<div class="mt-8 flex flex-col items-center justify-between gap-3 border-t border-navy-800 pt-5 text-xs text-slate-500 sm:mt-12 sm:flex-row sm:gap-4 sm:pt-6">
			<p>© {anio} {config.empresa_nombre ?? 'Inmobiliaria 360'}. Todos los derechos reservados.</p>
			<div class="flex flex-wrap justify-center gap-5">
				<a href="/legal/terminos" class="hover:text-brand-400">Términos</a>
				<a href="/legal/privacidad" class="hover:text-brand-400">Privacidad</a>
				<a href="/legal/cookies" class="hover:text-brand-400">Cookies</a>
				<a href="/legal/reembolsos" class="hover:text-brand-400">Reembolsos</a>
				<a href="/legal/accesibilidad" class="hover:text-brand-400">Accesibilidad</a>
				<a href="/admin" class="hover:text-brand-400">Intranet</a>
			</div>
		</div>
	</div>
</footer>
