<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import CookieBanner from '$lib/components/CookieBanner.svelte';
	import PushPrompt from '$lib/components/PushPrompt.svelte';
	import WhatsAppButton from '$lib/components/WhatsAppButton.svelte';
	import ChatWidget from '$lib/components/ChatWidget.svelte';
	import MobileTabBar from '$lib/components/MobileTabBar.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const esAdmin = $derived(page.url.pathname.startsWith('/admin'));
	const titulo = $derived(
		(page.data.metaTitulo as string | undefined) ??
		`${data.config.empresa_nombre ?? 'Inmobiliaria 360'} — ${data.config.empresa_eslogan ?? ''}`
	);
	const descripcion = $derived(
		(page.data.metaDescripcion as string | undefined) ??
		data.config.empresa_descripcion ??
		''
	);
</script>

<svelte:head>
	<title>{titulo}</title>
	<meta name="description" content={descripcion} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="es_BO" />
	<meta property="og:title" content={titulo} />
	<meta property="og:description" content={descripcion} />
	<meta
		property="og:image"
		content={(page.data.metaImagen as string | undefined) ?? `${page.url.origin}/og-default.png`}
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href={`${page.url.origin}${page.url.pathname}`} />
</svelte:head>

{#if esAdmin}
	{@render children()}
{:else}
	<a
		href="#contenido"
		class="sr-only z-50 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
	>
		Saltar al contenido
	</a>
	<div class="flex min-h-screen flex-col">
		<Header config={data.config} />
		<main id="contenido" class="flex-1 pb-16 lg:pb-0">
			{@render children()}
		</main>
		<Footer config={data.config} />
	</div>
	<MobileTabBar />
	<WhatsAppButton numero={data.config.contacto_whatsapp} />
	<ChatWidget whatsapp={data.config.contacto_whatsapp} />
	<CookieBanner />
	<PushPrompt />
{/if}
