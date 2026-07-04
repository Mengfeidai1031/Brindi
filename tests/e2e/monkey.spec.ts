import { expect, test } from '@playwright/test';

// "Monkey" ligero y reproducible: clics pseudoaleatorios (semilla fija) sobre
// elementos visibles del home, vigilando excepciones no capturadas.
test('clics aleatorios en el home no provocan errores no capturados @monkey', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/');

  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < 25; i++) {
    const clickable = page.locator('a:visible, button:visible');
    const count = await clickable.count();
    if (count === 0) break;
    const idx = Math.floor(rand() * count);
    try {
      await clickable.nth(idx).click({ timeout: 1000 });
    } catch {
      // Elementos que navegan o desaparecen: se ignora y se continúa.
    }
    await page.waitForTimeout(40);
    // Volvemos al home periódicamente para seguir explorando desde un estado conocido.
    if (i % 8 === 7) await page.goto('/');
  }

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});
