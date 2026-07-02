# Certificados TLS

Coloca aquí los certificados que nginx montará en producción:

- `fullchain.pem` — certificado + cadena intermedia
- `privkey.pem` — clave privada

## Opción A — Let's Encrypt (recomendado)

Con [certbot](https://certbot.eff.org/) en el host (modo webroot, usando el
volumen `infra/nginx/certbot`), o con un certificado ya emitido, copia:

```bash
cp /etc/letsencrypt/live/TU_DOMINIO/fullchain.pem infra/nginx/certs/
cp /etc/letsencrypt/live/TU_DOMINIO/privkey.pem  infra/nginx/certs/
```

El certificado debe cubrir tanto `${APP_DOMAIN}` como `${API_DOMAIN}` (un
certificado con varios SAN o un comodín `*.tudominio`).

## Opción B — Autofirmado (solo pruebas)

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout infra/nginx/certs/privkey.pem \
  -out infra/nginx/certs/fullchain.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:tu-dominio,DNS:api.tu-dominio"
```

> Los `.pem` están ignorados por git: nunca subas claves privadas al repositorio.
