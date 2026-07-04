import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const NO_SERIOUS = (violations: Array<{ impact?: string }>) =>
  violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

const GAMES = ['/decide/roulette', '/decide/cards', '/decide/touch', '/decide/group', '/decide/trivia'];

test('el hub lista los cinco juegos y se puede repartir cartas', async ({ page }) => {
  await page.goto('/decide');
  for (const href of GAMES) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }

  await page.locator('a[href="/decide/cards"]').first().click();
  await expect(page).toHaveURL(/\/decide\/cards$/);
  await page.getByRole('button', { name: 'Repartir' }).click();
  await expect(page.getByText('Tocad por turnos para voltear una carta.')).toBeVisible();
});

test('la ruleta gira y muestra un resultado', async ({ page }) => {
  await page.goto('/decide/roulette');
  await page.getByRole('button', { name: 'Girar' }).click();
  // Con reducedMotion el giro salta al resultado casi al instante.
  await expect(page.getByText('Ha salido:')).toBeVisible({ timeout: 10_000 });
});

test('el hub de Decide no tiene violaciones serias (axe)', async ({ page }) => {
  await page.goto('/decide');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = NO_SERIOUS(violations);
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
