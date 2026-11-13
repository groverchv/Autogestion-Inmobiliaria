<script lang="ts">
	import EditorBlog from '$lib/components/EditorBlog.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Nuevo artículo — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Nuevo artículo</h1>
	<p class="mt-1 text-sm text-slate-500">Redacta en Markdown. Al publicar se notifica a los suscriptores.</p>
</div>

<EditorBlog error={form?.error} />
