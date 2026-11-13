import { api, tokenDe } from '$lib/server/api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

interface ConfigItem {
	clave: string;
	valor: string | null;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = tokenDe(cookies)!;
	try {
		const items = await api.admin<ConfigItem[]>('/config', token);
		return { items: items.filter((i) => !i.clave.startsWith('vapid_')), error: null };
	} catch (e) {
		return { items: [] as ConfigItem[], error: e instanceof Error ? e.message : 'Error' };
	}
};

export const actions: Actions = {
	guardar: async ({ request, cookies }) => {
		const data = await request.formData();
		const valores: Record<string, string> = {};
		for (const [key, value] of data.entries()) {
			if (key.startsWith('cfg_')) {
				valores[key.slice(4)] = String(value);
			}
		}
		try {
			await api.adminPut('/config', valores, tokenDe(cookies)!);
			return { ok: true, mensaje: `${Object.keys(valores).length} valores guardados` };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al guardar' });
		}
	}
};
