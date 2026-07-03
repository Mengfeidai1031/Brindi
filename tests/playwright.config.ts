import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Si E2E_BASE_URL está definido, se prueba contra esa URL (p. ej. el stack completo
// en CI); si no, Playwright arranca el frontend de producción automáticamente.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'es-ES',
    // Animaciones deterministas (la ruleta salta al resultado en vez de girar 4,5 s).
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm --prefix apps/web run start',
        cwd: path.join(__dirname, '..'),
        url: 'http://localhost:3000',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
