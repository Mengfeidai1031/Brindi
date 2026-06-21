import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Detección de idioma: cookie NEXT_LOCALE (selección manual persistente)
 * y, en su defecto, cabecera Accept-Language del navegador.
 */
export default createMiddleware(routing);

export const config = {
  // Todo excepto rutas internas de Next, API y archivos estáticos.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
