import { expect, test } from '@playwright/test';

// Estas pruebas necesitan el stack completo (API + BD). Etiquetadas @backend para
// poder excluirlas cuando solo se prueba el frontend (test:e2e:web).
test('registro, cuenta y cierre de sesión @backend', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Persona E2E');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // Redirige a la cuenta y muestra el email registrado
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();

  // Cerrar sesión: ya no estamos en la cuenta
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).not.toHaveURL(/\/account$/);
});
