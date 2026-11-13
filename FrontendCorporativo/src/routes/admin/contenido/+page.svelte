<script lang="ts">
	import EntityEditor, { type Campo } from '$lib/components/EntityEditor.svelte';
	import type { Banner, Faq, MiembroEquipo, Oficina, Plan, Servicio, Testimonio, Vacante, VersionLanzamiento } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Entidad = 'banners' | 'servicios' | 'testimonios' | 'equipo' | 'faqs' | 'oficinas' | 'vacantes' | 'versiones' | 'planes';
	let pestana = $state<Entidad>('banners');

	const tabs: { id: Entidad; texto: string }[] = [
		{ id: 'banners', texto: 'Banners' },
		{ id: 'servicios', texto: 'Servicios' },
		{ id: 'testimonios', texto: 'Testimonios' },
		{ id: 'equipo', texto: 'Equipo' },
		{ id: 'faqs', texto: 'FAQs' },
		{ id: 'oficinas', texto: 'Oficinas' },
		{ id: 'vacantes', texto: 'Vacantes' },
		{ id: 'versiones', texto: 'Versiones' },
		{ id: 'planes', texto: 'Planes' }
	];

	const camposVersion: Campo[] = [
		{ key: 'version', label: 'Versión (ej. 1.2.0)', tipo: 'texto', requerido: true },
		{ key: 'titulo', label: 'Título de la versión', tipo: 'texto', requerido: true },
		{ key: 'descripcionMd', label: 'Novedades (Markdown)', tipo: 'textarea', requerido: true },
		{
			key: 'tipo',
			label: 'Tipo',
			tipo: 'select',
			opciones: [
				{ valor: 'NUEVO', texto: 'Nuevo' },
				{ valor: 'MEJORA', texto: 'Mejora' },
				{ valor: 'CORRECCION', texto: 'Corrección' }
			]
		},
		{ key: 'fechaPublicacion', label: 'Fecha de publicación (AAAA-MM-DD)', tipo: 'texto', requerido: true },
		{ key: 'publicado', label: 'Publicada', tipo: 'checkbox' }
	];

	const camposBanner: Campo[] = [
		{ key: 'titulo', label: 'Título', tipo: 'texto', requerido: true },
		{ key: 'subtitulo', label: 'Subtítulo', tipo: 'texto' },
		{ key: 'imagenUrl', label: 'Imagen de fondo', tipo: 'imagen' },
		{ key: 'ctaTexto', label: 'Texto del botón', tipo: 'texto' },
		{ key: 'ctaUrl', label: 'URL del botón', tipo: 'texto' },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposServicio: Campo[] = [
		{ key: 'titulo', label: 'Título', tipo: 'texto', requerido: true },
		{ key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
		{ key: 'icono', label: 'Icono (nombre lucide: home, shield-check, etc.)', tipo: 'texto' },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposTestimonio: Campo[] = [
		{ key: 'nombreCliente', label: 'Nombre del cliente', tipo: 'texto', requerido: true },
		{ key: 'cargo', label: 'Cargo / contexto', tipo: 'texto' },
		{ key: 'texto', label: 'Testimonio', tipo: 'textarea', requerido: true },
		{ key: 'avatarUrl', label: 'Foto', tipo: 'imagen' },
		{ key: 'estrellas', label: 'Estrellas (1-5)', tipo: 'numero' },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposEquipo: Campo[] = [
		{ key: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
		{ key: 'cargo', label: 'Cargo', tipo: 'texto' },
		{ key: 'fotoUrl', label: 'Foto', tipo: 'imagen' },
		{ key: 'bio', label: 'Biografía', tipo: 'textarea' },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposFaq: Campo[] = [
		{ key: 'pregunta', label: 'Pregunta', tipo: 'texto', requerido: true },
		{ key: 'respuesta', label: 'Respuesta', tipo: 'textarea', requerido: true },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposOficina: Campo[] = [
		{ key: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
		{ key: 'direccion', label: 'Dirección', tipo: 'texto' },
		{ key: 'ciudad', label: 'Ciudad', tipo: 'texto' },
		{ key: 'telefono', label: 'Teléfono', tipo: 'texto' },
		{ key: 'email', label: 'Email', tipo: 'texto' },
		{ key: 'horario', label: 'Horario', tipo: 'texto' },
		{ key: 'mapsUrl', label: 'URL de Google Maps', tipo: 'texto' },
		{ key: 'lat', label: 'Latitud', tipo: 'numero' },
		{ key: 'lng', label: 'Longitud', tipo: 'numero' },
		{ key: 'principal', label: 'Oficina principal', tipo: 'checkbox' },
		{ key: 'activo', label: 'Activa', tipo: 'checkbox' }
	];
	const camposPlan: Campo[] = [
		{ key: 'nombre', label: 'Nombre del plan', tipo: 'texto', requerido: true },
		{ key: 'descripcion', label: 'Descripción corta', tipo: 'texto' },
		{ key: 'precio', label: 'Precio (Bs/mes)', tipo: 'numero', requerido: true },
		{ key: 'moneda', label: 'Moneda (BOB, USD)', tipo: 'texto' },
		{ key: 'periodo', label: 'Periodo (mes, año)', tipo: 'texto' },
		{ key: 'maxInmuebles', label: 'Máx. propiedades', tipo: 'numero' },
		{ key: 'caracteristicas', label: 'Características (una por línea)', tipo: 'textarea' },
		{ key: 'ctaTexto', label: 'Texto del botón', tipo: 'texto' },
		{ key: 'ctaUrl', label: 'URL del botón (vacío = plataforma)', tipo: 'texto' },
		{ key: 'orden', label: 'Orden', tipo: 'numero' },
		{ key: 'destacado', label: 'Destacado (resaltado)', tipo: 'checkbox' },
		{ key: 'activo', label: 'Activo', tipo: 'checkbox' }
	];
	const camposVacante: Campo[] = [
		{ key: 'titulo', label: 'Título del puesto', tipo: 'texto', requerido: true },
		{ key: 'area', label: 'Área', tipo: 'texto' },
		{
			key: 'tipo',
			label: 'Tipo',
			tipo: 'select',
			opciones: [
				{ valor: 'TIEMPO_COMPLETO', texto: 'Tiempo completo' },
				{ valor: 'MEDIO_TIEMPO', texto: 'Medio tiempo' },
				{ valor: 'PRACTICAS', texto: 'Prácticas' },
				{ valor: 'FREELANCE', texto: 'Freelance' }
			]
		},
		{ key: 'ubicacion', label: 'Ubicación', tipo: 'texto' },
		{ key: 'descripcion', label: 'Descripción', tipo: 'textarea' },
		{ key: 'requisitos', label: 'Requisitos', tipo: 'textarea' },
		{ key: 'activo', label: 'Activa', tipo: 'checkbox' }
	];
</script>

<svelte:head><title>Contenido — Panel Corporativo</title><meta name="robots" content="noindex" /></svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-navy-900">Contenido del sitio</h1>
	<p class="mt-1 text-sm text-slate-500">Gestiona todo el contenido editable del sitio corporativo.</p>
</div>

<div class="mb-6 flex flex-wrap gap-2">
	{#each tabs as tab (tab.id)}
		<button
			onclick={() => (pestana = tab.id)}
			class="rounded-full px-4 py-2 text-sm font-medium transition-colors
				{pestana === tab.id ? 'bg-navy-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-white'}"
		>
			{tab.texto}
		</button>
	{/each}
</div>

{#if pestana === 'banners'}
	<EntityEditor
		titulo="Banners"
		entidad="banners"
		items={data.datos.banners as Banner[]}
		campos={camposBanner}
		columnas={[{ key: 'titulo', label: 'Título' }, { key: 'orden', label: 'Orden' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ orden: 0, activo: true })}
	/>
{:else if pestana === 'servicios'}
	<EntityEditor
		titulo="Servicios"
		entidad="servicios"
		items={data.datos.servicios as Servicio[]}
		campos={camposServicio}
		columnas={[{ key: 'titulo', label: 'Título' }, { key: 'icono', label: 'Icono' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ orden: 0, activo: true })}
	/>
{:else if pestana === 'testimonios'}
	<EntityEditor
		titulo="Testimonios"
		entidad="testimonios"
		items={data.datos.testimonios as Testimonio[]}
		campos={camposTestimonio}
		columnas={[{ key: 'nombreCliente', label: 'Cliente' }, { key: 'estrellas', label: '★' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ estrellas: 5, orden: 0, activo: true })}
	/>
{:else if pestana === 'equipo'}
	<EntityEditor
		titulo="Equipo"
		entidad="equipo"
		items={data.datos.equipo as MiembroEquipo[]}
		campos={camposEquipo}
		columnas={[{ key: 'nombre', label: 'Nombre' }, { key: 'cargo', label: 'Cargo' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ orden: 0, activo: true })}
	/>
{:else if pestana === 'faqs'}
	<EntityEditor
		titulo="FAQs"
		entidad="faqs"
		items={data.datos.faqs as Faq[]}
		campos={camposFaq}
		columnas={[{ key: 'pregunta', label: 'Pregunta' }, { key: 'orden', label: 'Orden' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ orden: 0, activo: true })}
	/>
{:else if pestana === 'oficinas'}
	<EntityEditor
		titulo="Oficinas"
		entidad="oficinas"
		items={data.datos.oficinas as Oficina[]}
		campos={camposOficina}
		columnas={[{ key: 'nombre', label: 'Nombre' }, { key: 'ciudad', label: 'Ciudad' }, { key: 'principal', label: 'Principal' }]}
		nuevoItem={() => ({ principal: false, activo: true })}
	/>
{:else if pestana === 'vacantes'}
	<EntityEditor
		titulo="Vacantes"
		entidad="vacantes"
		items={data.datos.vacantes as Vacante[]}
		campos={camposVacante}
		columnas={[{ key: 'titulo', label: 'Puesto' }, { key: 'tipo', label: 'Tipo' }, { key: 'activo', label: 'Activa' }]}
		nuevoItem={() => ({ tipo: 'TIEMPO_COMPLETO' as const, activo: true })}
	/>
{:else if pestana === 'planes'}
	<EntityEditor
		titulo="Planes de suscripción"
		entidad="planes"
		items={data.datos.planes as Plan[]}
		campos={camposPlan}
		columnas={[{ key: 'nombre', label: 'Plan' }, { key: 'precio', label: 'Bs/mes' }, { key: 'destacado', label: 'Destacado' }, { key: 'activo', label: 'Activo' }]}
		nuevoItem={() => ({ precio: 0, moneda: 'BOB', periodo: 'mes', maxInmuebles: 1, ctaTexto: 'Empezar', orden: 0, activo: true, destacado: false })}
	/>
{:else if pestana === 'versiones'}
	<EntityEditor
		titulo="Versiones (changelog)"
		entidad="versiones"
		items={data.datos.versiones as VersionLanzamiento[]}
		campos={camposVersion}
		columnas={[{ key: 'version', label: 'Versión' }, { key: 'titulo', label: 'Título' }, { key: 'fechaPublicacion', label: 'Fecha' }, { key: 'publicado', label: 'Publicada' }]}
		nuevoItem={() => ({ tipo: 'NUEVO' as const, fechaPublicacion: new Date().toISOString().slice(0, 10), publicado: true })}
	/>
{/if}
