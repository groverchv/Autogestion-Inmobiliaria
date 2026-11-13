<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		totalPages: number;
		actual: number;
		base: string;
	}

	let { totalPages, actual, base }: Props = $props();

	function url(p: number): string {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		return `${base}?${params.toString()}`;
	}
</script>

{#if totalPages > 1}
	<nav class="mt-10 flex items-center justify-center gap-2" aria-label="Paginación">
		{#each Array(totalPages) as _, i (i)}
			<a
				href={url(i)}
				class="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors
					{i === actual ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}"
				aria-current={i === actual ? 'page' : undefined}
			>
				{i + 1}
			</a>
		{/each}
	</nav>
{/if}
