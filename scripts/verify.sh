#!/usr/bin/env bash
# ============================================================
# Brindi — verificación completa
#
# Ejecuta toda la batería de comprobaciones del monorepo (tests + builds) y
# muestra un resumen. Devuelve código de salida != 0 si algo falla (apto para CI).
#
# Uso:
#   ./scripts/verify.sh
#
# Requisitos: dependencias ya instaladas en cada app
#   - apps/ai-service: pip install -r requirements.txt -r requirements-dev.txt
#   - apps/api y apps/web: npm ci
#
# Opcional:
#   export TEST_DATABASE_URL=postgresql://...   # incluye los tests de integración
#                                               # del ai-service (si no, se omiten)
# ============================================================

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -t 1 ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; BOLD=''; DIM=''; RESET=''
fi

FAILURES=()
PASSES=0

run() {
  # run "Nombre" "directorio" "comando (string)"
  local name="$1" dir="$2" cmd="$3"
  printf '\n%s==> %s%s %s(%s)%s\n' "$BOLD" "$name" "$RESET" "$DIM" "$dir" "$RESET"
  if ( cd "$dir" && eval "$cmd" ); then
    printf '%s✓ %s%s\n' "$GREEN" "$name" "$RESET"
    PASSES=$((PASSES + 1))
  else
    printf '%s✗ %s%s\n' "$RED" "$name" "$RESET"
    FAILURES+=("$name")
  fi
}

printf '%sBrindi — verificación completa%s\n' "$BOLD" "$RESET"
if [ -n "${TEST_DATABASE_URL:-}" ]; then
  printf '%sTEST_DATABASE_URL definido: se incluyen los tests de integración del ai-service.%s\n' "$DIM" "$RESET"
else
  printf '%sTEST_DATABASE_URL no definido: los tests de integración del ai-service se omiten.%s\n' "$DIM" "$RESET"
fi

run "ai-service · tests (pytest)" "apps/ai-service" "PYTHONPATH=. python3 -m pytest -q"
run "api · tests (jest)"          "apps/api"        "npm test --silent"
run "api · build (nest)"          "apps/api"        "npm run build --silent"
run "web · tests (node --test)"   "apps/web"        "npm test --silent"
run "web · build (next)"          "apps/web"        "NEXT_TELEMETRY_DISABLED=1 npm run build"

printf '\n%s── Resumen ──%s\n' "$BOLD" "$RESET"
TOTAL=$((PASSES + ${#FAILURES[@]}))
if [ ${#FAILURES[@]} -eq 0 ]; then
  printf '%s✓ %d/%d comprobaciones superadas.%s\n' "$GREEN" "$PASSES" "$TOTAL" "$RESET"
  exit 0
fi
printf '%s✗ %d de %d comprobaciones fallaron:%s\n' "$RED" "${#FAILURES[@]}" "$TOTAL" "$RESET"
for f in "${FAILURES[@]}"; do printf '   - %s\n' "$f"; done
exit 1
