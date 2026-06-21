# ============================================================
# Brindi web - imagen de desarrollo local
# (la imagen multi-stage optimizada para producción llegará con
# el incremento de infraestructura de producción)
# ============================================================
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Las variables NEXT_PUBLIC_* se inyectan en el bundle en build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
