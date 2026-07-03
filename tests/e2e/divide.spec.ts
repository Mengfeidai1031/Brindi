import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const NO_SERIOUS = (violations: Array<{ impact?: string }>) =>
  violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

test('completa el reparto a partes iguales (cálculo en cliente)', async ({ page }) => {
  await page.goto('/divide');

  // Paso 1 · Personas
  await page.getByLabel('Persona 1').fill('Ana');
  await page.getByLabel('Persona 2').fill('Luis');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // Paso 2 · La cuenta (un importe de 20 €)
  await page.getByLabel('Importe del ítem 1').fill('20');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // Paso 3 · Reparto (Partes iguales por defecto)
  await page.getByRole('button', { name: 'Ver resultado' }).click();

  // Paso 4 · Resultado: 20 € / 2 = 10,00 € cada uno
  await expect(page.getByRole('heading', { name: 'Esto paga cada uno' })).toBeVisible();
  await expect(page.getByText('Ana')).toBeVisible();
  await expect(page.getByText('Luis')).toBeVisible();
  await expect(page.getByText('10,00').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartir' })).toBeVisible();
});

test('la pantalla de resultado no tiene violaciones serias (axe)', async ({ page }) => {
  await page.goto('/divide');
  await page.getByLabel('Importe del ítem 1').fill('30');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Esto paga cada uno' })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = NO_SERIOUS(violations);
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
