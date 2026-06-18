#!/bin/sh
# Arranque del contenedor de la API:
#  1) aplica migraciones pendientes (idempotente)
#  2) ejecuta el seed (idempotente, skipDuplicates)
#  3) arranca la API
set -e

echo "[brindi-api] Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "[brindi-api] Ejecutando seed de preguntas de fallback..."
node dist/prisma/seed.js

echo "[brindi-api] Arrancando API..."
exec node dist/src/main.js
