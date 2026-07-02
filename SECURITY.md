# Seguridad de Brindi

Este documento resume las medidas de seguridad y privacidad de Brindi y cómo
reportar vulnerabilidades. Brindi se diseña con **privacidad por defecto**: el
esquema de datos es minimalista a propósito y no se almacena información sensible
de uso.

## Reportar una vulnerabilidad

Si encuentras un problema de seguridad, **no abras un issue público**. Escribe a
`security@tudominio.com` (sustituir por el contacto real) con una descripción y,
si es posible, pasos para reproducirlo. Intentaremos responder con prontitud y te
mantendremos al tanto del proceso de corrección.

## Privacidad por diseño

La regla central es **no persistir datos de uso sensibles**. En concreto:

- **No se guardan** tickets ni sus imágenes, importes, divisiones de cuentas,
  resultados de juegos, ubicaciones ni planes generados.
- El **OCR** de tickets procesa la imagen y devuelve los importes en el momento;
  ni la imagen ni el contenido se almacenan.
- La **división de cuentas** se calcula íntegramente en el cliente y nunca viaja
  al servidor.
- La **trivia** y los **planes** se generan bajo demanda; solo se registra un
  contador de uso agregado por servicio (sin entradas ni resultados).
- **PLAN** solo usa las coordenadas si la persona pulsa "Usar mi ubicación", y
  esas coordenadas no se almacenan.

Lo único que se persiste es la **cuenta**: email, nombre, idioma, hash de
contraseña (si aplica), `google_id` (si vincula Google) y un enlace de pago
opcional. La tabla de uso de IA (`ai_usage`) guarda solo `servicio`, `modelo`,
`tokens`, `éxito` y fecha. El banco `quiz_fallback_questions` contiene preguntas
de respaldo. No hay más tablas.

## Autenticación y sesiones

- **Contraseñas** cifradas con **bcrypt** (mínimo 12 rondas). Nunca se almacenan
  ni se registran en claro.
- **Tokens**: access token JWT de vida corta (15 min) que el frontend mantiene
  **solo en memoria** (no en `localStorage`), y refresh token de 7 días en una
  **cookie httpOnly**.
- La cookie de refresco es **`SameSite=Strict`**, con `path=/auth` (solo viaja a
  los endpoints de autenticación) y `Secure` en producción. El refresco **rota**
  el token en cada uso.
- **Anti-enumeración**: el login devuelve el mismo mensaje tanto si el email no
  existe como si la contraseña es incorrecta o la cuenta es solo-OAuth.
- **Inicio de sesión con Google (OAuth 2.0)**: el flujo usa un parámetro `state`
  con un nonce verificado contra una cookie (`SameSite=Lax`) para mitigar CSRF.
  El callback reutiliza el mismo mecanismo de sesión; el access token nunca viaja
  por la URL. Las cuentas se vinculan por email.

## Aislamiento de red

- En producción **solo nginx** publica puertos (80/443). El frontend, la API, el
  `ai-service` y PostgreSQL viven en la red interna de Docker.
- **La base de datos no es accesible** desde fuera de la red de contenedores.
- El **`ai-service` es interno**: no expone puertos y exige un secreto compartido
  (`INTERNAL_API_KEY`) en la cabecera `X-Internal-Key`. Solo la API de NestJS,
  que actúa de pasarela, puede invocarlo. El navegador nunca habla con él ni
  conoce ese secreto.

## Transporte (TLS)

- nginx termina **TLS 1.2/1.3** y redirige todo el tráfico HTTP a HTTPS.
- Se envía **HSTS** (`max-age` de 2 años, `includeSubDomains`, `preload`).
- Los certificados se montan desde `infra/nginx/certs/` y **nunca** se versionan.

## Cabeceras de seguridad

nginx añade en producción:

- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` y `frame-ancestors 'none'` (anti-clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictiva (geolocalización solo para el propio sitio;
  cámara, micrófono y pagos desactivados)
- `Content-Security-Policy` que restringe orígenes y limita `connect-src` a la
  propia app y al subdominio de la API.

## Validación de entrada y CORS

- Todos los endpoints validan su entrada con DTOs (`whitelist`, rechazo de campos
  no permitidos, transformación de tipos) en NestJS y con modelos Pydantic en el
  `ai-service`. Las preguntas y planes generados por IA se validan estructuralmente
  antes de aceptarse.
- **CORS** restrictivo: la API solo acepta el origen del frontend
  (`WEB_ORIGIN`), con credenciales habilitadas para la cookie.

## Limitación de tasa (rate limiting)

- La API aplica límites por IP: 10/min en registro y login, 30/min en refresco,
  20/min en la trivia y 15/min en la generación de planes (por su coste de IA),
  además de un límite global.
- Tras el proxy inverso, la API confía en `X-Forwarded-For` (`trust proxy`) para
  aplicar los límites por la **IP real** del cliente.

## Gestión de secretos

- Los secretos (contraseña de BD, secretos JWT, `INTERNAL_API_KEY`, claves de
  Google) se inyectan por variables de entorno desde `.env.prod`, que está
  **ignorado por git**.
- Genera secretos fuertes con `openssl rand -hex 48` (JWT) / `-hex 32`
  (`INTERNAL_API_KEY`) / `-base64 32` (contraseña de BD).
- La documentación OpenAPI (Swagger) está **desactivada en producción**.

## Mejoras de seguridad previstas

Aspectos conocidos que se reforzarán más adelante:

- **CSP con nonces** por petición (la actual permite `'unsafe-inline'` por
  compatibilidad con Next.js).
- **Revocación de refresh tokens** con almacén (hoy la rotación es stateless).
- **Cabeceras y WAF adicionales** y, opcionalmente, limitación de tasa también en
  el borde (nginx).
- **Auditoría de dependencias** automatizada (Dependabot y CI), prevista en un
  incremento posterior.
