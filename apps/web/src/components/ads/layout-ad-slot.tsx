'use client';

import { usePathname } from '@/i18n/navigation';
import { AdBanner } from './ad-banner';

/**
 * Hueco del banner inferior global. Se oculta en el juego de Toque (`/decide/touch`),
 * que muestra su propio anuncio solo en reposo y lo retira al empezar a jugar.
 */
export function LayoutAdSlot() {
  const pathname = usePathname();
  if (pathname.startsWith('/decide/touch')) return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4">
      <AdBanner />
    </div>
  );
}
