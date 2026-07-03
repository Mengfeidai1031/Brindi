# Contribuir a Brindi

¡Gracias por tu interés! Esta guía resume cómo trabajar en el proyecto.

## Principio de privacidad (no negociable)

Brindi **no persiste** tickets, importes, divisiones, ubicaciones, resultados de
juegos ni planes. Solo se guardan los datos de cuenta y un contador agregado de
uso de IA. Cualquier contribución debe respetar esto: si una función necesita
datos sensibles, deben calcularse y descartarse en el momento, nunca almacenarse.
Esta regla se aplica **a nivel del modelo de datos**, no solo de la aplicación.

## Arquitectura

Monorepo con tres aplicaciones:

- **`apps/web`** — Next.js 15 (App Router), TypeScript, Tailwind 4, PWA, i18n
  (ES/EN). Mobile-first y accesible (WCAG 2.2 AA).
- **`apps/api`** — NestJS, Prisma + PostgreSQL. Autenticación con bcrypt + JWT y
  cookie de refresco httpOnly. Hace de pasarela hacia el ai-service.
- **`apps/ai-service`** — FastAPI, cascada de modelos Gemini, Pydantic. Servicio
  interno (no expuesto), protegido por un secreto compartido.

Detalles y decisiones en el [README](README.md) y en [SECURITY.md](SECURITY.md).

## Puesta en marcha

Requisitos: Node 22, Python 3.12, Docker (opcional) y PostgreSQL.

```bash
# Levantar el entorno de desarrollo con Docker
docker compose -f infra/docker-compose.yml up -d

# O por separado: ver la sección "Instalación local" del README
```

## Ejecutar las pruebas

Toda la batería de una vez (lo mismo que ejecuta el CI):

```bash
./scripts/verify.sh
# con tests de integración del ai-service:
TEST_DATABASE_URL=postgresql://brindi:...@localhost:5432/brindi ./scripts/verify.sh
```

Pruebas E2E, accesibilidad, Lighthouse y carga: ver [tests/README.md](tests/README.md).

## Estilo de commits

Usamos **Conventional Commits** en español. El tipo va en inglés y el resto en
español:

```
feat(auth): inicio de sesión con Google
fix(divide): corrige el redondeo del reparto por porcentajes
test(api): tests del servicio de planes
docs: aclara el despliegue en producción
chore(deps): actualiza dependencias
```

Tipos habituales: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

## Antes de abrir un Pull Request

1. `./scripts/verify.sh` pasa en verde.
2. Si tocas el frontend, las pruebas E2E relevantes siguen pasando.
3. No se añade persistencia de datos sensibles.
4. El código nuevo respeta accesibilidad (etiquetas ARIA, contraste, foco) e
   internacionalización (textos en `messages/es.json` y `messages/en.json`).

El CI (GitHub Actions) ejecuta automáticamente la batería completa y las pruebas
E2E en cada PR. Debe estar en verde para poder fusionar.

## Iconos y UI

Se usan iconos de **lucide-react** (nunca emojis). La interfaz es mobile-first,
con modo claro y oscuro.
