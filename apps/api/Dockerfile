# ============================================================
# Brindi API - imagen de desarrollo local
# (la imagen multi-stage optimizada para producción llegará con
# el incremento de infraestructura de producción)
# ============================================================
FROM node:22-alpine

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas
COPY package*.json ./
RUN npm ci

# Cliente de Prisma (necesita el schema)
COPY prisma ./prisma
RUN npx prisma generate

# Código y build
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "./docker-entrypoint.sh"]
