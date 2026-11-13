<script lang="ts">
	import { page } from '$app/state';
	import type { ConfigSitio } from '$lib/types';
	import Icon from './Icon.svelte';
	import { env } from '$env/dynamic/public';

	let { config }: { config: ConfigSitio } = $props();
	let abierto = $state(false);

	const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';

	const enlaces = [
		{ href: '/', texto: 'Inicio' },
		{ href: '/servicios', texto: 'Servicios' },
		{ href: '/planes', texto: 'Planes' },
		{ href: '/nosotros', texto: 'Nosotros' },
		{ href: '/blog', texto: 'Blog' },
		{ href: '/contacto', texto: 'Contacto' }
	];

	function activo(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<header class="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
		<a href="/" class="flex items-center gap-2 text-xl font-bold text-navy-900">
			<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900">
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="#38bdf8" stroke-width="1.8">
					<path d="M12 4 L20 10 V20 H4 V10 Z" stroke-linejoin="round" />
					<circle cx="12" cy="14" r="3" />
				</svg>
			</span>
			{config.empresa_nombre ?? 'Inmobiliaria 360'}
		</a>

		<nav class="hidden items-center gap-1 lg:flex" aria-label="Principal">
			{#each enlaces as enlace (enlace.href)}
				<a
					href={enlace.href}
					class="rounded-md px-3 py-2 text-sm font-medium transition-colors
						{activo(enlace.href)
						? 'bg-brand-50 text-brand-700'
						: 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'}"
					aria-current={activo(enlace.href) ? 'page' : undefined}
				>
					{enlace.texto}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-3 lg:flex">
			<a
				href="/admin/login"
				class="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-navy-900"
			>
				Acceso
			</a>
			<a
				href={appUrl}
				target="_blank"
				rel="noopener"
				class="rounded-lg border border-navy-900 px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white"
			>
				Ir a la plataforma
			</a>
		</div>

		<button
			class="rounded-md p-2 text-slate-600 lg:hidden"
			onclick={() => (abierto = !abierto)}
			aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
			aria-expanded={abierto}
		>
			<Icon nombre={abierto ? 'x' : 'menu'} size={24} />
		</button>
	</div>

	{#if abierto}
		<nav class="border-t border-slate-200 bg-white px-4 py-3 lg:hidden" aria-label="Móvil">
			{#each enlaces as enlace (enlace.href)}
				<a
					href={enlace.href}
					onclick={() => (abierto = false)}
					class="block rounded-md px-3 py-2.5 text-sm font-medium
						{activo(enlace.href) ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}"
				>
					{enlace.texto}
				</a>
			{/each}
			<a
				href="/admin/login"
				onclick={() => (abierto = false)}
				class="mt-2 block rounded-md px-3 py-2.5 text-center text-sm font-medium text-slate-400 hover:text-navy-900"
			>
				Acceso
			</a>
			<a
				href={appUrl}
				target="_blank"
				rel="noopener"
				class="mt-2 block rounded-lg bg-navy-900 px-4 py-2.5 text-center text-sm font-semibold text-white"
			>
				Ir a la plataforma
			</a>
		</nav>
	{/if}
</header>
