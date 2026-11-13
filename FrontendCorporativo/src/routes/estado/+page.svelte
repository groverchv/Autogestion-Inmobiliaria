<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const nombres: Record<string, string> = {
		db: 'Base de datos',
		mail: 'Servidor de correo',
		ping: 'Servidor de aplicación',
		diskSpace: 'Espacio en disco',
		ssl: 'Certificado TLS'
	};

	function hora(iso: string): string {
		return new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}
</script>

<section class="bg-navy-950 py-16 text-white">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<span class="text-xs font-semibold uppercase tracking-wider text-brand-400">Monitor</span>
		<h1 class="mt-2 text-4xl font-extrabold">Estado del servicio</h1>
		<p class="mt-3 max-w-2xl text-slate-300">
			Disponibilidad en tiempo real de los componentes de la plataforma.
		</p>
	</div>
</section>

<section class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<div class="rounded-2xl border p-8 {data.operativo ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}">
		<div class="flex items-center gap-3">
			<span class="relative flex h-4 w-4">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 {data.operativo ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
				<span class="relative inline-flex h-4 w-4 rounded-full {data.operativo ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
			</span>
			<p class="text-lg font-bold {data.operativo ? 'text-emerald-800' : 'text-amber-800'}">
				{data.operativo ? 'Todos los sistemas operativos' : 'Servicio degradado o no disponible'}
			</p>
		</div>
		<p class="mt-2 text-sm {data.operativo ? 'text-emerald-700' : 'text-amber-700'}">
			Última verificación: {hora(data.revisado)}
			{#if data.latenciaMs !== null} · Tiempo de respuesta del backend: {data.latenciaMs} ms{/if}
		</p>
	</div>

	{#if data.componentes.length > 0}
		<ul class="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
			{#each data.componentes as c (c.nombre)}
				<li class="flex items-center justify-between px-6 py-4">
					<span class="flex items-center gap-3 text-sm font-medium text-navy-900">
						<Icon nombre={c.estado ? 'check-circle' : 'x-circle'} size={18} class={c.estado ? 'text-emerald-500' : 'text-red-500'} />
						{nombres[c.nombre] ?? c.nombre}
					</span>
					<span class="text-xs font-semibold {c.estado ? 'text-emerald-600' : 'text-red-600'}">
						{c.estado ? 'Operativo' : 'Con problemas'}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="mt-6 text-center text-sm text-slate-500">
		¿Detectas un problema? <a href="/contacto" class="font-medium text-brand-600 hover:text-brand-700">Repórtalo por contacto</a>
		o recarga la página para una nueva verificación.
	</p>
</section>
