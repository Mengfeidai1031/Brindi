'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { AD_SLOT_BANNER, ADSENSE_CLIENT, adsEnabled } from '@/config/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Banner de anuncio responsivo (no intrusivo). Se renderiza en el flujo de la página,
 * no fija sobre el contenido. No muestra nada si la publicidad está desactivada o si
 * no hay slot configurado.
 */
export function AdBanner({ className = '' }: { className?: string }) {
  const t = useTranslations('ads');
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsEnabled || !AD_SLOT_BANNER || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // El script aún no ha cargado; AdSense rellena el hueco automáticamente al hacerlo.
    }
  }, []);

  if (!adsEnabled || !AD_SLOT_BANNER) return null;

  return (
    <aside aria-label={t('label')} className={`w-full overflow-hidden ${className}`}>
      <span className="mb-1 block text-center text-[10px] uppercase tracking-wide text-muted">
        {t('label')}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOT_BANNER}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
