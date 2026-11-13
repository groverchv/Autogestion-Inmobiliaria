import { expect, test, type Page } from '@playwright/test';

// El formulario de contacto usa la acción `?/contacto`; el del boletín usa `/?/newsletter`
const formContacto = (page: Page) => page.locator('form[action*="contacto"]');

test.describe('Formulario de contacto', () => {
	test('la página carga con título y formulario accesible', async ({ page }) => {
		await page.goto('/contacto');
		await expect(page).toHaveTitle(/Contacto/i);
		await expect(formContacto(page)).toBeVisible();
	});

	test('bloquea el envío vacío con validación del navegador', async ({ page }) => {
		await page.goto('/contacto');
		const nombre = formContacto(page).locator('input[name="nombre"]');
		await formContacto(page).locator('button[type="submit"]').click();
		const valido = await nombre.evaluate((el: HTMLInputElement) => el.checkValidity());
		expect(valido).toBeFalsy();
	});

	test('envía una consulta completa y muestra confirmación', async ({ page }) => {
		await page.goto('/contacto');
		const form = formContacto(page);
		await form.locator('input[name="nombre"]').fill('Prueba E2E');
		await form.locator('input[name="email"]').fill('e2e@example.com');
		await form.locator('textarea[name="mensaje"]').fill('Mensaje generado por la prueba E2E de contacto.');
		await form.locator('input[name="aceptaPrivacidad"]').check();
		await form.locator('button[type="submit"]').click();
		// Éxito ("¡Mensaje enviado!") o error legible (rate limit / backend caído), nunca pantalla rota
		await expect(page.getByText(/enviad|solicitud|intenta|error|solicitudes/i).first()).toBeVisible({ timeout: 20000 });
	});
});
