#!/usr/bin/env bash
# ============================================================
# Brindi - Setup local automatizado
# ------------------------------------------------------------
# Incremento actual: verifica prerequisitos, prepara .env con
# secretos autogenerados y levanta la infraestructura base
# (PostgreSQL + Redis) con healthchecks.
#
# Este script crecera con el proyecto: en proximos incrementos
# tambien construira y levantara api, web y ai-service, lanzara
# migraciones de Prisma y el seed de preguntas de fallback.
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

# ---------- 1. Prerequisitos ----------
info "Verificando prerequisitos..."
command -v docker >/dev/null 2>&1 \
  || fail "Docker no esta instalado. Instalalo desde https://docs.docker.com/get-docker/ y vuelve a ejecutar este script."
docker info >/dev/null 2>&1 \
  || fail "El daemon de Docker no esta corriendo. Arranca Docker (Docker Desktop o el servicio) y reintenta."
docker compose version >/dev/null 2>&1 \
  || fail "Docker Compose v2 no esta disponible (se esperaba el comando 'docker compose'). Actualiza Docker o instala el plugin de Compose."
ok "Docker y Docker Compose detectados"

# ---------- 2. Archivo .env ----------
if [[ ! -f "$ENV_FILE" ]]; then
  info "Creando $ENV_FILE a partir de $ENV_EXAMPLE..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

# Genera cualquier secreto que siga con el placeholder (primera
# ejecucion o .env copiado a mano sin rellenar).
for key in JWT_SECRET POSTGRES_PASSWORD; do
  if grep -q "^${key}=${PLACEHOLDER}$" "$ENV_FILE"; then
    set_env_value "$key" "$(gen_secret)"
    ok "Secreto ${key} generado automaticamente"
  fi
done

# Cargamos el .env para poder mostrar puertos reales al final.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ---------- 3. Levantar servicios ----------
info "Levantando infraestructura (PostgreSQL + Redis)..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

# ---------- 4. Esperar healthchecks ----------
wait_healthy() {
  local container="$1" tries="${2:-40}" status
  info "Esperando a que ${container} este healthy..."
  for ((i = 1; i <= tries; i++)); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo 'missing')"
    if [[ "$status" == "healthy" ]]; then
      ok "${container} healthy"
      return 0
    fi
    sleep 2
  done
  fail "${container} no llego a estado healthy. Revisa logs con: docker compose -f ${COMPOSE_FILE} logs"
}

wait_healthy brindi-postgres
wait_healthy brindi-redis

# ---------- 5. Resumen ----------
echo
ok "Infraestructura base de Brindi corriendo"
info "PostgreSQL : localhost:${POSTGRES_PORT:-5432} (db: ${POSTGRES_DB:-brindi}, user: ${POSTGRES_USER:-brindi})"
info "Redis      : localhost:${REDIS_PORT:-6379}"
echo
warn "Las claves de Google (Gemini, OAuth, Places) en .env quedan vacias por ahora;"
warn "se necesitaran cuando lleguen los modulos de IA y mapas en proximos incrementos."
info "Para parar todo: docker compose -f ${COMPOSE_FILE} down"
