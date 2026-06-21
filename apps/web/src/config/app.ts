/**
 * Constante única de branding (ver README, "Decisiones de diseño").
 * Sobrescribible en build con NEXT_PUBLIC_APP_NAME.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Brindi';

/** URL pública de la API (se consume a partir del incremento 5). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
