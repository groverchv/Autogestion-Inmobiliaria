import { api, tokenDe } from '$lib/server/api';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

interface UsuarioAdmin {
	id: number;
	email: string;
	nombre: string;
	rol: string;
	activo: boolean;
	creado: string;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = tokenDe(cookies)!;
	try {
		const usuarios = await api.admin<UsuarioAdmin[]>('/usuarios', token);
		return { usuarios, error: null };
	} catch (e) {
		return {
			usuarios: [] as UsuarioAdmin[],
			error: e instanceof Error ? e.message : 'Error al cargar usuarios'
		};
	}
};

export const actions: Actions = {
	crear: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = tokenDe(cookies)!;
		try {
			await api.adminPost('/usuarios', {
				email: data.get('email'),
				nombre: data.get('nombre'),
				rol: data.get('rol'),
				password: data.get('password')
			}, token);
			return { ok: true, accion: 'crear' };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al crear' });
		}
	},
	editar: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = tokenDe(cookies)!;
		try {
			await api.adminPut(`/usuarios/${data.get('id')}`, {
				email: data.get('email'),
				nombre: data.get('nombre'),
				rol: data.get('rol'),
				password: data.get('password') || undefined
			}, token);
			return { ok: true, accion: 'editar' };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al actualizar' });
		}
	},
	activo: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = tokenDe(cookies)!;
		try {
			await api.adminPatch(`/usuarios/${data.get('id')}/activo`,
				{ activo: data.get('activo') === 'true' }, token);
			return { ok: true, accion: 'activo' };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al cambiar estado' });
		}
	},
	miPassword: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = tokenDe(cookies)!;
		try {
			await api.adminPost('/usuarios/mi-password', {
				actual: data.get('actual'),
				nueva: data.get('nueva')
			}, token);
			return { ok: true, accion: 'miPassword' };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Error al cambiar la contraseña' });
		}
	}
};
