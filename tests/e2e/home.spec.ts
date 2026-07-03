import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const NO_SERIOUS = (violations: Array<{ impact?: string }>) =>
  violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

test.describe('Home', () => {
  test('muestra los tres módulos y navega a Divide', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/divide"]').first()).toBeVisible();
    await expect(page.locator('a[href="/decide"]').first()).toBeVisible();
    await expect(page.locator('a[href="/plan"]').first()).toBeVisible();

    await page.locator('a[href="/divide"]').first().click();
    await expect(page).toHaveURL(/\/divide$/);
    await expect(page.getByRole('heading', { name: 'Divide' })).toBeVisible();
  });

  test('cambia el idioma a inglés', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Inglés' }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test('no tiene violaciones de accesibilidad serias (axe)', async ({ page }) => {
    await page.goto('/');
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = NO_SERIOUS(violations);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
