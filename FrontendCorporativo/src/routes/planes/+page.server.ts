import { api } from '$lib/server/api';
import type { Plan } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let planes: Plan[] = [];
	try {
		planes = await api.public<Plan[]>('/planes');
	} catch {}
	return { planes };
};
