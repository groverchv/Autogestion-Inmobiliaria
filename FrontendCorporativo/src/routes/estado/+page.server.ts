import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface Salud {
	status?: string;
	components?: Record<string, { status: string }>;
}

export const load: PageServerLoad = async () => {
	const apiUrl = env.PRIVATE_API_URL || 'http://localhost:8081';
	const inicio = Date.now();
	let salud: Salud | null = null;
	let latenciaMs: number | null = null;
	try {
		const resp = await fetch(`${apiUrl}/actuator/health`, { signal: AbortSignal.timeout(5000) });
		latenciaMs = Date.now() - inicio;
		if (resp.ok) salud = await resp.json();
	} catch {}

	const operativo = salud?.status === 'UP';
	const componentes = Object.entries(salud?.components ?? {}).map(([nombre, c]) => ({
		nombre,
		estado: c.status === 'UP'
	}));

	return {
		operativo,
		componentes,
		latenciaMs,
		revisado: new Date().toISOString(),
		metaTitulo: 'Estado del servicio — Inmobiliaria 360',
		metaDescripcion: 'Estado en tiempo real de la plataforma Inmobiliaria 360: disponibilidad, base de datos y correo.'
	};
};
