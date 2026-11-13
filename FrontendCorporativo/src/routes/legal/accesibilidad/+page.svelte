<script lang="ts">
	import SectionTitle from '$lib/components/SectionTitle.svelte';
</script>

<svelte:head>
	<title>Declaración de accesibilidad — Inmobiliaria 360</title>
	<meta name="description" content="Compromiso de Inmobiliaria 360 con la accesibilidad digital conforme a WCAG 2.1 AA." />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-14 sm:px-6">
	<SectionTitle etiqueta="Legal" titulo="Declaración de accesibilidad" centrado={false} />
	<div class="prose-contenido space-y-4 text-slate-600">
		<p><strong>Última actualización:</strong> enero 2026</p>

		<h2 class="!mt-8">1. Compromiso</h2>
		<p>
			Inmobiliaria 360 se compromete a garantizar la accesibilidad digital de este sitio web
			corporativo para todas las personas, incluidas aquellas con discapacidad visual, auditiva,
			motriz o cognitiva, conforme a las pautas <strong>WCAG 2.1 nivel AA</strong> y a la Ley
			General de Personas con Discapacidad de Bolivia (Ley N.º 223).
		</p>

		<h2 class="!mt-8">2. Medidas implementadas</h2>
		<ul>
			<li>Estructura semántica HTML5 con encabezados jerárquicos y landmarks ARIA.</li>
			<li>Navegación completa por teclado: formularios, menús y controles operables sin ratón.</li>
			<li>Enlace «Saltar al contenido» visible al enfocar con Tab.</li>
			<li>Texto alternativo en imágenes informativas.</li>
			<li>Contraste de color mínimo 4.5:1 para texto normal y 3:1 para texto grande.</li>
			<li>Formularios con etiquetas asociadas y mensajes de error descriptivos.</li>
			<li>Indicadores de foco visibles en todos los elementos interactivos.</li>
			<li>Diseño responsivo compatible con zoom hasta 400% sin pérdida de funcionalidad.</li>
		</ul>

		<h2 class="!mt-8">3. Limitaciones conocidas</h2>
		<p>
			Los mapas interactivos de terceros (Google Maps) pueden no ser completamente navegables
			por teclado ni legibles por lectores de pantalla; la dirección escrita de cada oficina
			se proporciona siempre como alternativa de texto.
		</p>

		<h2 class="!mt-8">4. Compatibilidad</h2>
		<p>
			Este sitio fue verificado con las últimas versiones de Chrome, Firefox, Edge y Safari,
			y con el lector de pantalla NVDA sobre Windows.
		</p>

		<h2 class="!mt-8">5. Contacto de accesibilidad</h2>
		<p>
			Si encuentras alguna barrera de acceso o necesitas el contenido en otro formato,
			escríbenos a través de la <a href="/contacto" class="text-brand-600 underline">página de contacto</a>
			indicando la URL afectada y la dificultad encontrada. Respondemos en un plazo máximo de
			5 días hábiles.
		</p>
	</div>
</div>
