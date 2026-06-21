import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // 'as-needed': el español (por defecto) vive en "/", el inglés en "/en".
  localePrefix: 'as-needed',
});

export type AppLocale = (typeof routing.locales)[number];
