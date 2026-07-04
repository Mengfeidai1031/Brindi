/**
 * Parámetros de tokens y de la cookie de refresco.
 *
 * Diseño (ver README, "Decisiones de diseño"):
 *  - Access token corto (Bearer) + refresh token en cookie httpOnly.
 *  - SameSite=Strict en la cookie mitiga CSRF en /auth/refresh.
 *  - path=/auth (o el prefijo externo que use el proxy inverso, p. ej.
 *    /api/auth si nginx enruta la API bajo /api): la cookie solo viaja a
 *    los endpoints de auth. Configurable con REFRESH_COOKIE_PATH porque
 *    el path que ve el navegador depende de cómo el proxy exponga la API.
 *  - Refresh stateless con rotación (sin tabla de tokens: el esquema
 *    de BD es minimalista por diseño de privacidad).
 */
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_COOKIE_NAME = 'brindi_refresh';
export const REFRESH_COOKIE_PATH = process.env.REFRESH_COOKIE_PATH ?? '/auth';
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Rondas de bcrypt (mínimo 12 según especificación de seguridad). */
export const BCRYPT_ROUNDS = 12;

/**
 * Cookie de estado (nonce) del flujo OAuth de Google para mitigar CSRF.
 * SameSite=Lax (no Strict): debe viajar en la navegación de vuelta desde Google.
 */
export const OAUTH_STATE_COOKIE = 'brindi_oauth_state';
export const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
