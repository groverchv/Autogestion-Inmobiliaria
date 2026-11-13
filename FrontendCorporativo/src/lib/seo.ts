import type { ConfigSitio } from '$lib/types';
import { env } from '$env/dynamic/public';

const SITE = env.PUBLIC_SITE_URL || 'http://localhost:5174';

export function jsonLdOrganizacion(config: ConfigSitio): object {
	return {
		'@context': 'https://schema.org',
		'@type': 'RealEstateAgent',
		name: config.empresa_nombre || 'Inmobiliaria 360',
		description: config.empresa_descripcion,
		url: SITE,
		telephone: config.contacto_telefono,
		email: config.contacto_email,
		address: {
			'@type': 'PostalAddress',
			streetAddress: config.contacto_direccion,
			addressCountry: 'BO'
		}
	};
}

export function jsonLdWebsite(config: ConfigSitio): object {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: config.empresa_nombre || 'Inmobiliaria 360',
		url: SITE,
		inLanguage: 'es'
	};
}

export function canonical(path: string): string {
	return `${SITE}${path}`;
}
