#!/usr/bin/env bash
# ============================================================
# Brindi - Setup local automatizado
# ------------------------------------------------------------
# Incremento actual: verifica prerequisitos, prepara .env con
# secretos autogenerados, construye y levanta PostgreSQL, Redis
# y la API (NestJS). El contenedor de la API aplica las
# migraciones de Prisma y el seed automáticamente al arrancar.
#
# Próximos incrementos añadirán web (Next.js) y ai-service.
#
# Uso:  ./scripts/setup-local.sh
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="infra/docker-compose.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
PLACEHOLDER="__autogenerado_por_setup__"

# ---------- helpers ----------
info() { printf '\033[1;34m[brindi]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[aviso]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Reemplaza el valor de una clave en .env (portable GNU/BSD sed)
set_env_value() {
  local key="$1" value="$2"
  sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"
}

# Añade la clave con placeholder si no existe (para .env antiguos)
ensure_env_line() {
  local key="$1"
  grep -q "^${key}=" "$ENV_FILE" || printf '%s=%s\n' "$key" "$PLACEHOLDER" >> "$ENV_FILE"
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# ---------- 1. Prerequisitos ----------
info "Verificando prerequisitos..."
command -v docker >/dev/null 2>&1 \
  || fail "Docker no está instalado. Instálalo desde https://docs.docker.com/get-docker/ y vuelve a ejecutar este script."
docker info >/dev/null 2>&1 \
  || fail "El daemon de Docker no está corriendo. Arranca Docker (Docker Desktop o el servicio) y reintenta."
docker compose version >/dev/null 2>&1 \
  || fail "Docker Compose v2 no está disponible (se esperaba el comando 'docker compose'). Actualiza Docker o instala el plugin de Compose."
ok "Docker y Docker Compose detectados"

# ---------- 2. Archivo .env ----------
if [[ ! -f "$ENV_FILE" ]]; then
  info "Creando $ENV_FILE a partir de $ENV_EXAMPLE..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

# Claves que pueden faltar en .env creados con versiones anteriores.
ensure_env_line DATABASE_URL

# Genera cualquier secreto que siga con el placeholder.
for key in JWT_SECRET POSTGRES_PASSWORD; do
  if grep -q "^${key}=${PLACEHOLDER}$" "$ENV_FILE"; then
    set_env_value "$key" "$(gen_secret)"
    ok "Secreto ${key} generado automáticamente"
  fi
done

# Cargamos el .env para componer valores derivados y el resumen final.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# DATABASE_URL apuntando a localhost: la usan la API y las herramientas
# de Prisma cuando se ejecutan FUERA de Docker. Dentro de Compose se
# construye otra automáticamente apuntando al servicio "postgres".
if [[ -z "${DATABASE_URL:-}" || "${DATABASE_URL:-}" == "$PLACEHOLDER" ]]; then
  DATABASE_URL="postgresql://${POSTGRES_USER:-brindi}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-brindi}?schema=public"
  set_env_value DATABASE_URL "$DATABASE_URL"
  export DATABASE_URL
  ok "DATABASE_URL (host local) generada para desarrollo fuera de Docker"
fi

# ---------- 3. Construir y levantar servicios ----------
info "Construyendo y levantando servicios (la primera construcción de la API puede tardar unos minutos)..."
compose up -d --build

# ---------- 4. Esperar healthchecks ----------
wait_healthy() {
  local container="$1" tries="${2:-40}" status
  info "Esperando a que ${container} esté healthy..."
  for ((i = 1; i <= tries; i++)); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo 'missing')"
    if [[ "$status" == "healthy" ]]; then
      ok "${container} healthy"
      return 0
    fi
    sleep 2
  done
  fail "${container} no llegó a estado healthy. Revisa logs con: docker compose -f ${COMPOSE_FILE} logs"
}

wait_healthy brindi-postgres 40
wait_healthy brindi-redis 40
# El primer arranque de la API incluye migraciones + seed.
wait_healthy brindi-api 90

# ---------- 5. Verificación del seed ----------
QUESTION_COUNT="$(compose exec -T postgres psql -U "${POSTGRES_USER:-brindi}" -d "${POSTGRES_DB:-brindi}" -tAc 'SELECT count(*) FROM quiz_fallback_questions;' 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -n "$QUESTION_COUNT" && "$QUESTION_COUNT" != "0" ]]; then
  ok "Seed verificado: ${QUESTION_COUNT} preguntas de fallback en la base de datos"
else
  warn "No se pudo verificar el seed de preguntas (revisa: docker compose -f ${COMPOSE_FILE} logs api)"
fi

# ---------- 6. Resumen ----------
echo
ok "Brindi está corriendo"
info "API        : http://localhost:${API_PORT:-4000}"
info "API docs   : http://localhost:${API_PORT:-4000}/api/docs"
info "Healthcheck: http://localhost:${API_PORT:-4000}/health"
info "PostgreSQL : localhost:${POSTGRES_PORT:-5432} (db: ${POSTGRES_DB:-brindi}, user: ${POSTGRES_USER:-brindi})"
info "Redis      : localhost:${REDIS_PORT:-6379}"
echo
warn "Las claves de Google (Gemini, OAuth, Places) en .env siguen vacías;"
warn "se necesitarán cuando lleguen los módulos de IA y mapas. Tras rellenarlas:"
warn "docker compose --env-file .env -f ${COMPOSE_FILE} restart"
info "Para parar todo: docker compose --env-file .env -f ${COMPOSE_FILE} down"
