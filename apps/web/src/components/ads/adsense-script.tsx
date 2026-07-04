'use client';

import Script from 'next/script';
import { ADSENSE_CLIENT, adsEnabled } from '@/config/ads';

/**
 * Carga el script de AdSense una sola vez (si hay client ID). Incluir el `client`
 * en la URL habilita Auto Ads y la mensajería de consentimiento (CMP) de Google.
 */
export function AdSenseScript() {
  if (!adsEnabled) return null;
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
