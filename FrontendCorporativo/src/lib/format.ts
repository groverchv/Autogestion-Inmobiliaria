export function formatoPrecio(precio: number | null, tipo: string): string {
	if (precio == null) return 'Consultar';
	const fmt = new Intl.NumberFormat('es-BO', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(precio);
	return tipo === 'alquiler' ? `${fmt}/mes` : fmt;
}

export function formatoFecha(iso: string | null | undefined): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat('es-BO', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(iso));
}

export function formatoFechaCorta(iso: string | null | undefined): string {
	if (!iso) return '';
	return new Intl.DateTimeFormat('es-BO', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(iso));
}

export function etiquetaTipoOferta(tipo: string): string {
	const mapa: Record<string, string> = {
		alquiler: 'Alquiler',
		venta: 'Venta',
		anticretico: 'Anticrético'
	};
	return mapa[tipo] || tipo;
}

export function etiquetaTipoLead(tipo: string): string {
	const mapa: Record<string, string> = {
		CONTACTO: 'Contacto',
		VISITA: 'Visita',
		VENDER_PROPIEDAD: 'Vender propiedad',
		POSTULACION: 'Postulación',
		SOPORTE: 'Soporte'
	};
	return mapa[tipo] || tipo;
}

export function etiquetaEstadoLead(estado: string): string {
	const mapa: Record<string, string> = {
		NUEVO: 'Nuevo',
		EN_CONTACTO: 'En contacto',
		CERRADO: 'Cerrado',
		DESCARTADO: 'Descartado'
	};
	return mapa[estado] || estado;
}

export function etiquetaTipoVacante(tipo: string): string {
	const mapa: Record<string, string> = {
		TIEMPO_COMPLETO: 'Tiempo completo',
		MEDIO_TIEMPO: 'Medio tiempo',
		PRACTICAS: 'Prácticas',
		FREELANCE: 'Freelance'
	};
	return mapa[tipo] || tipo;
}

export function iniciales(nombre: string): string {
	return nombre
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0].toUpperCase())
		.join('');
}
