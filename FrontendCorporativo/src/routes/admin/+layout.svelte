<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const esLogin = $derived(page.url.pathname === '/admin/login');

	const esAdmin = $derived(data.admin?.rol === 'ADMIN');
	const secciones = $derived([
		{ href: '/admin', icono: 'layout-dashboard', texto: 'Panel', exacto: true },
		{ href: '/admin/leads', icono: 'inbox', texto: 'Contactos' },
		{ href: '/admin/blog', icono: 'newspaper', texto: 'Blog' },
		{ href: '/admin/contenido', icono: 'settings', texto: 'Contenido' },
		{ href: '/admin/medios', icono: 'image', texto: 'Medios' },
		{ href: '/admin/notificaciones', icono: 'megaphone', texto: 'Notificaciones' },
		{ href: '/admin/config', icono: 'settings', texto: 'Sitio' },
		...(esAdmin ? [{ href: '/admin/usuarios', icono: 'users', texto: 'Usuarios' }] : [])
	]);

	function activo(href: string, exacto = false): boolean {
		return exacto ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}
</script>

{#if esLogin}
	{@render children()}
{:else}
	<div class="flex min-h-screen bg-slate-100">
		<aside class="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-navy-950 text-slate-300">
			<a href="/admin" class="flex items-center gap-2.5 px-5 py-5 text-lg font-bold text-white">
				<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
					<Icon nombre="home" size={16} class="text-white" />
				</span>
				Inmo360 Admin
			</a>

			<nav class="flex-1 space-y-1 px-3" aria-label="Admin">
				{#each secciones as sec (sec.href)}
					<a
						href={sec.href}
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
							{activo(sec.href, sec.exacto)
							? 'bg-brand-600 text-white'
							: 'text-slate-400 hover:bg-navy-800 hover:text-white'}"
					>
						<Icon nombre={sec.icono} size={18} />
						{sec.texto}
					</a>
				{/each}
			</nav>

			<div class="border-t border-navy-800 p-4">
				<div class="mb-3 flex items-center gap-3 px-1">
					<span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
						{(data.admin?.nombre ?? 'A')[0].toUpperCase()}
					</span>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-white">{data.admin?.nombre}</p>
						<p class="text-xs text-slate-500">{data.admin?.rol}</p>
					</div>
				</div>
				<form method="POST" action="/admin/salir">
					<button class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-navy-800 hover:text-white">
						<Icon nombre="log-out" size={16} /> Cerrar sesión
					</button>
				</form>
				<a href="/" class="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-navy-800 hover:text-white">
					<Icon nombre="external-link" size={15} /> Ver sitio
				</a>
			</div>
		</aside>

		<div class="ml-60 flex-1">
			<main class="p-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}
