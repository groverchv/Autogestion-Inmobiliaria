import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@inmobiliaria360.com';
const PASS = process.env.E2E_ADMIN_PASSWORD ?? 'Admin2026!';

test.describe('Acceso al panel administrativo', () => {
	test('/admin sin sesión redirige al login', async ({ page }) => {
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/login/);
	});

	test('credenciales inválidas muestran error', async ({ page }) => {
		await page.goto('/admin/login');
		await page.locator('input[name="email"], input[type="email"]').first().fill('noexiste@example.com');
		await page.locator('input[name="password"], input[type="password"]').first().fill('clave-incorrecta-1');
		await page.locator('button[type="submit"]').first().click();
		await expect(page.getByText(/incorrect|inválid|error|credencial/i).first()).toBeVisible({ timeout: 15000 });
	});

	test('login válido entra al panel y puede cerrar sesión', async ({ page }) => {
		await page.goto('/admin/login');
		await page.locator('input[name="email"], input[type="email"]').first().fill(EMAIL);
		await page.locator('input[name="password"], input[type="password"]').first().fill(PASS);
		await page.locator('button[type="submit"]').first().click();
		await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15000 });
		await expect(page.getByText(/Panel|Contactos|Blog/i).first()).toBeVisible();
	});
});
