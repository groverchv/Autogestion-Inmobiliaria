<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let enviando = $state(false);
</script>

<svelte:head>
	<title>Acceso — Panel Corporativo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-navy-950 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
				<Icon nombre="home" size={26} class="text-white" />
			</span>
			<h1 class="mt-4 text-2xl font-bold text-white">Panel Corporativo</h1>
			<p class="mt-1 text-sm text-slate-400">Inmobiliaria 360 — Gestión de contenido</p>
		</div>

		<form
			method="POST"
			use:enhance={() => {
				enviando = true;
				return async ({ update }) => {
					enviando = false;
					await update();
				};
			}}
			class="rounded-2xl bg-white p-7 shadow-2xl"
		>
			<label class="block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Correo</span>
				<input
					type="email"
					name="email"
					required
					value={form?.email ?? ''}
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
					placeholder="admin@inmobiliaria360.com"
				/>
			</label>
			<label class="mt-4 block">
				<span class="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</span>
				<input
					type="password"
					name="password"
					required
					class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
					placeholder="••••••••"
				/>
			</label>

			{#if form?.error}
				<p class="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
					<Icon nombre="circle-alert" size={16} /> {form.error}
				</p>
			{/if}

			<button
				type="submit"
				disabled={enviando}
				class="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 py-3 font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
			>
				{#if enviando}<Icon nombre="loader" size={17} class="animate-spin" /> Verificando...{:else}Ingresar{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-slate-500">
			Acceso restringido al equipo de marketing y administración.
		</p>
	</div>
</div>
