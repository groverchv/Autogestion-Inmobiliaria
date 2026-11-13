import { defineConfig } from '@playwright/test';

/**
 * Pruebas E2E del sitio corporativo (Punto 9 — pruebas funcionales automatizadas).
 * Requieren el stack corriendo: Spring :8081 + frontend (dev :5174 o prod :3000).
 *
 *   npm run build && node build            # servidor producción :3000
 *   npx playwright install chromium        # una sola vez
 *   npm run test:e2e
 *
 * E2E_BASE_URL permite apuntar a otro entorno (staging/producción).
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	retries: 1,
	workers: 2,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
		locale: 'es-BO',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
