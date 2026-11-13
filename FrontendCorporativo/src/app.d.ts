import type { AdminSesion } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			admin: AdminSesion | null;
		}
	}
}

export {};
