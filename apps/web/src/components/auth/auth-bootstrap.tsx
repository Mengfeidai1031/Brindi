'use client';

import { useEffect } from 'react';
import { bootstrapAuth } from '@/lib/api-client';

/** Lanza la rehidratación de sesión una sola vez al montar la app. */
export function AuthBootstrap() {
  useEffect(() => {
    void bootstrapAuth();
  }, []);
  return null;
}
