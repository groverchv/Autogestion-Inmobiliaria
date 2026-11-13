import { fail, type Action } from '@sveltejs/kit';
import { api } from './api';

function campo(data: FormData, nombre: string): string {
	return (data.get(nombre) as string) ?? '';
}

function numero(data: FormData, nombre: string): number | undefined {
	const v = campo(data, nombre);
	const n = Number(v);
	return v && !isNaN(n) ? n : undefined;
}

/** Crea una acción de formulario que reenvía el lead al backend con la IP real. */
export function accionLead(endpoint: string, extra?: (data: FormData, url: URL) => Record<string, unknown>): Action {
	return async ({ request, getClientAddress }) => {
		const data = await request.formData();
		try {
			const resp = await api.publicPost<{ ok: boolean; mensaje?: string }>(endpoint, {
				nombre: campo(data, 'nombre'),
				email: campo(data, 'email'),
				telefono: campo(data, 'telefono'),
				asunto: campo(data, 'asunto'),
				mensaje: campo(data, 'mensaje'),
				origenUrl: campo(data, 'origenUrl'),
				adjuntoUrl: campo(data, 'adjuntoUrl'),
				empresaWeb: campo(data, 'empresaWeb'),
				...extra?.(data, new URL(request.url))
			}, getClientAddress());
			return { ok: true, mensaje: resp.mensaje };
		} catch (e) {
			const err = e as Error & { campos?: Record<string, string> };
			return fail(400, {
				error: e instanceof Error ? e.message : 'No se pudo enviar',
				campos: err.campos
			});
		}
	};
}

export const accionNewsletter: Action = async ({ request, getClientAddress }) => {
	const data = await request.formData();
	try {
		const resp = await api.publicPost<{ mensaje?: string }>('/newsletter', {
			email: campo(data, 'email'),
			nombre: campo(data, 'nombre'),
			empresaWeb: campo(data, 'empresaWeb')
		}, getClientAddress());
		return { ok: true, mensaje: resp.mensaje };
	} catch (e) {
		return fail(400, { error: e instanceof Error ? e.message : 'No se pudo suscribir' });
	}
};

export function camposVacante(data: FormData): Record<string, unknown> {
	return { vacanteId: numero(data, 'vacanteId') };
}
