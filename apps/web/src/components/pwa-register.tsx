'use client';

import { useEffect } from 'react';

/** Registra el service worker (solo en producción para no interferir con HMR). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso: la app funciona igualmente sin SW.
      });
    }
  }, []);
  return null;
}
