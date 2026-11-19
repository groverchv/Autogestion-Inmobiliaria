import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.admin && url.pathname !== '/admin/login') {
		throw redirect(302, `/admin/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	return { admin: locals.admin };
};
