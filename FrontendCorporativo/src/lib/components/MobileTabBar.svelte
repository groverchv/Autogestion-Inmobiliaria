<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	const tabs = [
		{ href: '/', icono: 'home', texto: 'Inicio' },
		{ href: '/servicios', icono: 'building-2', texto: 'Servicios' },
		{ href: '/planes', icono: 'trending-up', texto: 'Planes' },
		{ href: '/blog', icono: 'newspaper', texto: 'Blog' },
		{ href: '/contacto', icono: 'mail', texto: 'Contacto' }
	];

	function activo(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
	aria-label="Navegación móvil"
	style="padding-bottom: env(safe-area-inset-bottom)"
>
	{#each tabs as tab (tab.href)}
		<a
			href={tab.href}
			aria-current={activo(tab.href) ? 'page' : undefined}
			class="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors
				{activo(tab.href) ? 'text-brand-600' : 'text-slate-500'}"
		>
			{#if activo(tab.href)}
				<span class="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-brand-500"></span>
			{/if}
			<Icon nombre={tab.icono} size={21} />
			{tab.texto}
		</a>
	{/each}
</nav>
