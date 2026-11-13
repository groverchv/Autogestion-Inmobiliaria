import { api, tokenDe } from '$lib/server/api';
import type { Pagina } from '$lib/types';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

interface EmailLog {
	id: number;
	destinatario: string;
	asunto: string;
	plantilla: string | null;
	estado: 'ENVIADO' | 'FALLIDO';
	error: string | null;
	creado: string;
}

interface Suscriptor {
	id: number;
	email: string;
	nombre: string | null;
	activo: boolean;
	creado: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = tokenDe(cookies)!;
	let pushStats = { suscriptores_activos: 0 };
	let suscriptores: Suscriptor[] = [];
	let emails: Pagina<EmailLog> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 30 };

	try { pushStats = await api.admin('/push/stats', token); } catch {}
	try { suscriptores = await api.admin<Suscriptor[]>('/newsletter/suscriptores', token); } catch {}
	try { emails = await api.admin<Pagina<EmailLog>>('/emails?size=30', token); } catch {}

	return { pushStats, suscriptores, emails };
};

export const actions: Actions = {
	difundirPush: async ({ request, cookies }) => {
		const data = await request.formData();
		try {
			const resp = await api.adminPost<{ destinatarios: number }>('/push/difundir', {
				titulo: data.get('titulo'),
				cuerpo: data.get('cuerpo'),
				url: data.get('url')
			}, tokenDe(cookies)!);
			return { ok: true, seccion: 'push', mensaje: `Difusión enviada a ${resp.destinatarios} suscriptores` };
		} catch (e) {
			return fail(400, { seccion: 'push', error: e instanceof Error ? e.message : 'Error' });
		}
	},

	difundirNewsletter: async ({ request, cookies }) => {
		const data = await request.formData();
		try {
			const resp = await api.adminPost<{ destinatarios: number; smtp_configurado: boolean }>(
				'/newsletter/difundir',
				{ asunto: data.get('asunto'), contenidoHtml: data.get('contenidoHtml') },
				tokenDe(cookies)!
			);
			const extra = resp.smtp_configurado ? '' : ' (SMTP no configurado: quedó en el log)';
			return { ok: true, seccion: 'newsletter', mensaje: `Campaña enviada a ${resp.destinatarios} correos${extra}` };
		} catch (e) {
			return fail(400, { seccion: 'newsletter', error: e instanceof Error ? e.message : 'Error' });
		}
	},

	eliminarSuscriptor: async ({ request, cookies }) => {
		const id = (await request.formData()).get('id');
		try {
			await api.adminDelete(`/newsletter/suscriptores/${id}`, tokenDe(cookies)!);
			return { ok: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error' });
		}
	}
};
