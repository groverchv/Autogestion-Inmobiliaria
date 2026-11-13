export interface ConfigSitio {
	empresa_nombre?: string;
	empresa_eslogan?: string;
	empresa_descripcion?: string;
	contacto_telefono?: string;
	contacto_whatsapp?: string;
	contacto_email?: string;
	contacto_direccion?: string;
	horario_atencion?: string;
	social_facebook?: string;
	social_instagram?: string;
	social_linkedin?: string;
	social_youtube?: string;
	social_tiktok?: string;
	stats_anios?: string;
	stats_propiedades?: string;
	stats_clientes?: string;
	stats_ciudades?: string;
	home_cta_titulo?: string;
	home_cta_texto?: string;
	[key: string]: string | undefined;
}

export interface Banner {
	id: number;
	titulo: string;
	subtitulo: string | null;
	imagenUrl: string | null;
	ctaTexto: string | null;
	ctaUrl: string | null;
	orden: number;
	activo: boolean;
}

export interface Servicio {
	id: number;
	titulo: string;
	descripcion: string | null;
	icono: string | null;
	orden: number;
	activo: boolean;
}

export interface Testimonio {
	id: number;
	nombreCliente: string;
	cargo: string | null;
	texto: string;
	avatarUrl: string | null;
	estrellas: number;
	orden: number;
	activo: boolean;
}

export interface MiembroEquipo {
	id: number;
	nombre: string;
	cargo: string | null;
	fotoUrl: string | null;
	bio: string | null;
	orden: number;
	activo: boolean;
}

export interface Faq {
	id: number;
	pregunta: string;
	respuesta: string;
	orden: number;
	activo: boolean;
}

export interface Oficina {
	id: number;
	nombre: string;
	direccion: string | null;
	ciudad: string | null;
	telefono: string | null;
	email: string | null;
	horario: string | null;
	mapsUrl: string | null;
	lat: number | null;
	lng: number | null;
	principal: boolean;
	activo: boolean;
}

export interface Vacante {
	id: number;
	titulo: string;
	area: string | null;
	descripcion: string | null;
	requisitos: string | null;
	ubicacion: string | null;
	tipo: 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'PRACTICAS' | 'FREELANCE';
	activo: boolean;
	creado: string;
}

export interface BlogPost {
	id: number;
	slug: string;
	titulo: string;
	resumen: string | null;
	contenidoMd: string | null;
	portadaUrl: string | null;
	categoria: string | null;
	autorNombre: string | null;
	publicadoAt: string | null;
	estado?: 'BORRADOR' | 'PUBLICADO';
}

export interface Lead {
	id: number;
	nombre: string;
	email: string;
	telefono: string | null;
	asunto: string | null;
	mensaje: string;
	tipo: 'CONTACTO' | 'VISITA' | 'VENDER_PROPIEDAD' | 'POSTULACION' | 'SOPORTE';
	inmuebleId: number | null;
	vacanteId: number | null;
	estado: 'NUEVO' | 'EN_CONTACTO' | 'CERRADO' | 'DESCARTADO';
	notaInterna: string | null;
	origenUrl: string | null;
	adjuntoUrl: string | null;
	creado: string;
}

export interface Pagina<T> {
	content: T[];
	totalElements: number;
	totalPages: number;
	number: number;
	size: number;
}

export interface VersionLanzamiento {
	id: number;
	version: string;
	titulo: string;
	descripcionMd: string;
	tipo: 'NUEVO' | 'MEJORA' | 'CORRECCION';
	fechaPublicacion: string;
	publicado: boolean;
}

export interface Plan {
	id: number;
	nombre: string;
	descripcion: string | null;
	precio: number;
	moneda: string;
	periodo: string;
	maxInmuebles: number;
	caracteristicas: string | null;
	destacado: boolean;
	ctaTexto: string;
	ctaUrl: string | null;
	orden: number;
	activo: boolean;
}

export interface HomeData {
	banners: Banner[];
	servicios: Servicio[];
	testimonios: Testimonio[];
	equipo: MiembroEquipo[];
	faqs: Faq[];
	posts: BlogPost[];
	config: ConfigSitio;
}

export interface AdminSesion {
	email: string;
	nombre: string;
	rol: string;
}
