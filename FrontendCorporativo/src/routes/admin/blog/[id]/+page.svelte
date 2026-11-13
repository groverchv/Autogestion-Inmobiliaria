<script lang="ts">
	import EditorBlog from '$lib/components/EditorBlog.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Editar: {data.post.titulo} — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Editar artículo</h1>
	<p class="mt-1 text-sm text-slate-500">/blog/{data.post.slug}</p>
</div>

<EditorBlog post={data.post} error={form?.error} />
