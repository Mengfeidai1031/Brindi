# Pruebas de Brindi (QA)

Suite de calidad de extremo a extremo: **E2E** (Playwright), **accesibilidad**
(axe), **Lighthouse** y **carga** (k6). Vive aparte del código de las apps para no
mezclar sus dependencias pesadas con los builds.

```bash
cd tests
npm install
```

## E2E + accesibilidad (Playwright + axe)

Las pruebas E2E recorren los flujos reales en un navegador. Las comprobaciones de
accesibilidad (axe) están integradas en los propios specs y fallan ante
violaciones **serias o críticas** de WCAG 2.1 A/AA.

```bash
# Una sola vez: instala el navegador (Chromium) y sus dependencias del sistema
npm run test:e2e:install

# Todos los flujos de frontend (Playwright arranca el build de producción solo)
npm run test:e2e:web        # excluye las pruebas con backend (@backend)

# Suite completa, incluido el registro/login (requiere el stack completo)
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Qué cubre:

- **home**: los tres módulos, navegación a Divide y cambio de idioma.
- **divide**: el asistente completo de reparto a partes iguales, con el cálculo
  hecho en el cliente (20 € entre 2 → 10,00 € cada uno).
- **decide**: el hub con los cinco juegos, repartir cartas y girar la ruleta.
- **auth** (`@backend`): registro, vista de cuenta y cierre de sesión. Necesita la
  API y la base de datos en marcha.
- **monkey** (`@monkey`): clics pseudoaleatorios (semilla fija) en el home
  vigilando excepciones no capturadas.

Por defecto se ejecutan dos proyectos: **Desktop Chrome** y **móvil** (Pixel 7).
Si `E2E_BASE_URL` está definido, se prueba contra esa URL; si no, Playwright
arranca `apps/web` en modo producción automáticamente (requiere `npm run build`
previo en `apps/web`).

## Lighthouse

Auditoría de rendimiento, accesibilidad, buenas prácticas y SEO sobre el build de
producción. La accesibilidad se exige (umbral 0,9); el resto avisa.

```bash
npm run lighthouse
```

## Carga (k6)

Prueba de humo de carga contra la API. Apunta a endpoints públicos **no limitados**
por el rate limiter (`/health`, `/auth/providers`) para medir rendimiento real sin
disparar 429.

```bash
# Instala k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
API_URL=http://localhost:4000 k6 run load/smoke.js
```

Umbrales: menos del 1 % de peticiones fallidas y p(95) por debajo de 500 ms.

## Notas

- Los artefactos (`playwright-report/`, `test-results/`, `.lighthouseci/`) y
  `node_modules/` están ignorados por git.
- En CI, las suites de navegador necesitan `npm run test:e2e:install`; k6 se
  instala como binario aparte.
