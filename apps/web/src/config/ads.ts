/**
 * Configuración de Google AdSense. La publicidad solo se activa si hay un client ID
 * válido (NEXT_PUBLIC_ADSENSE_CLIENT, formato "ca-pub-..."). Sin él, no se carga
 * ningún script ni se renderiza ningún anuncio (útil en desarrollo, tests y CI).
 *
 * Recuerda: las NEXT_PUBLIC_* se "hornean" en build, así que en producción deben
 * pasarse como build args (ver Dockerfile.prod y docker-compose.prod.yml).
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';

/** Slot del banner responsivo. Opcional: con Auto Ads (anchor) no hace falta. */
export const AD_SLOT_BANNER = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER ?? '';

/** La publicidad está activa cuando hay un client ID con el formato esperado. */
export const adsEnabled = ADSENSE_CLIENT.startsWith('ca-pub-');
